const express = require('express');
const { createSession, getSession, storePart, isComplete, reassembleAndDecrypt, cleanupSession } = require('../services/cryptoSession');
const { extractText } = require('../services/textExtractor');
const { generateScripts } = require('../services/scriptGenerator');

const router = express.Router();

// Increase payload limit for base64 chunks
router.use(express.json({ limit: '50mb' }));

// POST /api/generate/init — start an upload session
router.post('/init', (req, res) => {
  const { fileName, fileType, totalParts, key, iv } = req.body;

  if (!fileName || !key || !iv) {
    return res.status(400).json({ error: 'Missing required fields: fileName, key, iv' });
  }

  const sessionId = createSession({
    fileName,
    fileType: fileType || 'application/octet-stream',
    totalParts: totalParts || 3,
    key,
    iv,
  });

  res.json({ sessionId });
});

// POST /api/generate/upload-part — upload one encrypted chunk
router.post('/upload-part', (req, res) => {
  const { sessionId, partNumber, data } = req.body;

  if (!sessionId || !partNumber || !data) {
    return res.status(400).json({ error: 'Missing required fields: sessionId, partNumber, data' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(410).json({ error: 'Session expired or not found' });
  }

  const stored = storePart(sessionId, partNumber, data);
  if (!stored) {
    return res.status(410).json({ error: 'Session expired' });
  }

  res.json({
    received: partNumber,
    totalParts: session.totalParts,
  });
});

// POST /api/generate/process — reassemble, decrypt, extract, generate
router.post('/process', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(410).json({ error: 'Session expired or not found' });
  }

  if (!isComplete(sessionId)) {
    return res.status(400).json({ error: 'Not all parts have been uploaded' });
  }

  try {
    // Reassemble and decrypt
    const { buffer, fileName, fileType } = reassembleAndDecrypt(sessionId);

    // Extract text
    const text = await extractText(buffer, fileName, fileType);
    if (!text || !text.trim()) {
      cleanupSession(sessionId);
      return res.status(400).json({ error: 'No readable text found in document' });
    }

    // Generate test scripts via OpenAI
    const scripts = await generateScripts(text);

    // Cleanup
    cleanupSession(sessionId);

    res.json({ scripts });
  } catch (err) {
    cleanupSession(sessionId);

    // Categorize errors
    if (err.message.includes('OPENAI_API_KEY')) {
      return res.status(500).json({ error: err.message });
    }
    if (err.message.includes('Could not parse')) {
      return res.status(422).json({ error: err.message });
    }
    if (err.message.includes('No readable text')) {
      return res.status(400).json({ error: err.message });
    }

    console.error('Generate process error:', err.message);
    return res.status(502).json({ error: 'AI generation failed: ' + err.message });
  }
});

module.exports = router;
