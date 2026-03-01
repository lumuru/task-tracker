const OpenAI = require('openai');
const db = require('../db/database');

function getSetting(key, fallback) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set. Add it to server/.env');
  }
  const baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  return new OpenAI({ apiKey, baseURL });
}

const SYSTEM_PROMPT = `You are a Senior QA Engineer with 10+ years of experience writing System Integration Testing (SIT) scripts. Given a Business Requirements Document (BRD), generate production-grade SIT test scripts.

You MUST generate test scripts across THREE categories:

1. **Functional Testing** — Validate that every business requirement works correctly end-to-end.
   - Cover positive flows (happy path), negative flows (invalid inputs, boundary conditions), and edge cases.
   - Test data validation, business rules, field constraints, workflow transitions, and integration points between modules.
   - Include data-driven scenarios (empty fields, max-length inputs, special characters, SQL injection strings in input fields).

2. **Security Testing** — Validate the system is protected against common vulnerabilities.
   - Authentication & authorization (role-based access, session expiry, privilege escalation attempts).
   - Input sanitization (XSS, SQL injection, command injection via form fields and URLs).
   - Data protection (sensitive data masking, encryption at rest/in transit, secure headers).
   - API security (unauthorized access, token manipulation, rate limiting).

3. **Usability Testing** — Validate the system is intuitive, accessible, and user-friendly.
   - UI consistency (labels, alignment, responsive behavior across screen sizes).
   - Error messaging (clear, actionable error messages for all failure scenarios).
   - Navigation flow (breadcrumbs, back button behavior, deep linking).
   - Accessibility (keyboard navigation, screen reader compatibility, color contrast).
   - Loading states, empty states, and timeout handling.

For EACH test case, provide:
- title: A clear, descriptive test case name prefixed with the category — e.g. "[Functional] Verify login with valid credentials", "[Security] Verify SQL injection prevention on search field", "[Usability] Verify error message clarity on form validation"
- module: The feature/module being tested
- priority: critical | high | medium | low
- steps: Detailed step-by-step procedure written so any tester can execute it without ambiguity. Each step on its own line, numbered. Include specific test data where applicable (e.g. "Enter username: testuser@domain.com", "Enter password: P@ssw0rd123!").
- expected_result: Precise expected outcome with measurable criteria (e.g. "User is redirected to dashboard within 2 seconds. Welcome message displays: 'Hello, [First Name]'")
- preconditions: All setup required — test accounts, test data, environment config, browser/device requirements

Generate as many test scripts as needed to achieve FULL coverage of every requirement in the BRD. Do not limit yourself — if the document has 20 features, generate scripts for all 20 across all three categories. Every business rule, user flow, input field, and integration point should have at least one test script. Be thorough and exhaustive.

Respond ONLY with valid JSON in this format:
{ "test_scripts": [ { "title": "...", "module": "...", "priority": "...", "steps": "...", "expected_result": "...", "preconditions": "..." } ] }`;

// Cost per million tokens: [input, output]
const MODEL_PRICING = {
  'openai/gpt-4o':               [2.50, 10.00],
  'openai/gpt-4o-mini':          [0.15, 0.60],
  'anthropic/claude-sonnet-4':   [3.00, 15.00],
  'anthropic/claude-opus-4':     [15.00, 75.00],
  'google/gemini-2.5-pro':       [1.25, 10.00],
};

function estimateCost(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const [inputRate, outputRate] = pricing;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}

function normalizeSteps(steps) {
  if (!steps) return '';
  let text = String(steps);
  // If steps are comma-separated numbered items (e.g. "1. Foo.,2. Bar."), split onto new lines
  if (!text.includes('\n') && /\d+\./.test(text)) {
    text = text.replace(/,?\s*(\d+)\.\s*/g, '\n$1. ').trim();
  }
  return text;
}

async function generateScripts(text) {
  if (!text || !text.trim()) {
    throw new Error('No readable text found in document');
  }

  // Truncate very long documents to ~30k chars to fit in context
  const truncated = text.length > 30000 ? text.slice(0, 30000) + '\n\n[Document truncated...]' : text;

  const client = getClient();

  const model = getSetting('ai_model', process.env.AI_MODEL || 'gpt-4o');
  const thinkingEnabled = getSetting('ai_thinking_enabled', 'false') === 'true';

  // Determine provider from model name for OpenRouter routing
  const provider = model.startsWith('anthropic/') ? 'anthropic'
    : model.startsWith('openai/') ? 'openai'
    : model.startsWith('google/') ? 'google'
    : undefined;

  const requestParams = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Requirements document:\n---\n${truncated}\n---\n\nGenerate test scripts from these requirements. Respond ONLY with the JSON object, no markdown fences or extra text.`,
      },
    ],
    // Thinking models can't use response_format constraint
    ...(!thinkingEnabled && { response_format: { type: 'json_object' } }),
    ...(provider && { provider: { order: [provider], allow_fallbacks: false } }),
  };

  const response = await client.chat.completions.create(requestParams);

  // Extract usage metadata
  const responseModel = response.model || model;
  const promptTokens = response.usage?.prompt_tokens || 0;
  const completionTokens = response.usage?.completion_tokens || 0;
  const totalTokens = response.usage?.total_tokens || (promptTokens + completionTokens);
  const costEstimate = estimateCost(responseModel, promptTokens, completionTokens);

  const message = response.choices[0]?.message;
  // Thinking models may return content in `content` or the reasoning in a separate field
  const content = message?.content || '';
  const reasoning = message?.reasoning || message?.reasoning_content || '';

  // Use content if it has JSON, otherwise check reasoning
  const textToParse = content || reasoning;
  if (!textToParse) {
    console.error('AI response message:', JSON.stringify(message, null, 2).slice(0, 2000));
    throw new Error('No response from AI model');
  }

  // Extract JSON from response — thinking models may wrap it in markdown fences or extra text
  let jsonStr = null;

  // Strategy 1: Look for JSON inside markdown fences
  const fenceMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Strategy 2: Find the outermost { ... } that contains "test_scripts" or "testScripts"
  if (!jsonStr) {
    const braceStart = textToParse.indexOf('{');
    if (braceStart !== -1) {
      // Find the matching closing brace by counting depth
      let depth = 0;
      let end = -1;
      for (let i = braceStart; i < textToParse.length; i++) {
        if (textToParse[i] === '{') depth++;
        else if (textToParse[i] === '}') depth--;
        if (depth === 0) { end = i; break; }
      }
      if (end !== -1) {
        jsonStr = textToParse.slice(braceStart, end + 1);
      }
    }
  }

  if (!jsonStr) {
    console.error('Could not find JSON in AI response. First 1000 chars:', textToParse.slice(0, 1000));
    throw new Error('Could not parse generated scripts');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // Try cleaning common issues: trailing commas, control chars
    try {
      const cleaned = jsonStr
        .replace(/,\s*([}\]])/g, '$1')     // trailing commas
        .replace(/[\x00-\x1f\x7f]/g, ' '); // control characters
      parsed = JSON.parse(cleaned);
    } catch (_) {
      console.error('JSON parse failed. First 1000 chars of extracted JSON:', jsonStr.slice(0, 1000));
      throw new Error('Could not parse generated scripts');
    }
  }

  const scripts = parsed.test_scripts || parsed.testScripts || [];
  if (!Array.isArray(scripts) || scripts.length === 0) {
    throw new Error('AI did not generate any test scripts');
  }

  // Normalize and validate each script
  const normalizedScripts = scripts.map((s) => ({
    title: String(s.title || 'Untitled Test Case'),
    module: String(s.module || ''),
    priority: ['critical', 'high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
    steps: normalizeSteps(s.steps),
    expected_result: String(s.expected_result || s.expectedResult || ''),
    preconditions: String(s.preconditions || ''),
  }));

  const usage = {
    model: responseModel,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost_estimate: costEstimate,
    thinking_enabled: thinkingEnabled,
  };

  return { scripts: normalizedScripts, usage };
}

module.exports = { generateScripts };
