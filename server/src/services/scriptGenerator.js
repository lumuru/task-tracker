const OpenAI = require('openai');

const MODEL = process.env.AI_MODEL || 'gpt-4o';

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

  // Thinking models don't support response_format
  const isThinkingModel = MODEL.includes('thinking') || MODEL.includes('think');
  const requestParams = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Requirements document:\n---\n${truncated}\n---\n\nGenerate test scripts from these requirements. Respond ONLY with the JSON object, no markdown fences or extra text.`,
      },
    ],
  };
  if (!isThinkingModel) {
    requestParams.response_format = { type: 'json_object' };
  }

  const response = await client.chat.completions.create(requestParams);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI model');
  }

  // Extract JSON from response — thinking models may wrap it in markdown fences
  let jsonStr = content;
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else {
    // Try to find the first { ... } block
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (_) {
    throw new Error('Could not parse generated scripts');
  }

  const scripts = parsed.test_scripts || parsed.testScripts || [];
  if (!Array.isArray(scripts) || scripts.length === 0) {
    throw new Error('AI did not generate any test scripts');
  }

  // Normalize and validate each script
  return scripts.map((s) => ({
    title: String(s.title || 'Untitled Test Case'),
    module: String(s.module || ''),
    priority: ['critical', 'high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
    steps: normalizeSteps(s.steps),
    expected_result: String(s.expected_result || s.expectedResult || ''),
    preconditions: String(s.preconditions || ''),
  }));
}

module.exports = { generateScripts };
