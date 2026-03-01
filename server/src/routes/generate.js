const express = require('express');
const { createSession, getSession, storePart, isComplete, reassembleAndDecrypt, cleanupSession } = require('../services/cryptoSession');
const { extractText } = require('../services/textExtractor');
const { generateScripts } = require('../services/scriptGenerator');

const router = express.Router();

// Increase payload limit for base64 chunks
router.use(express.json({ limit: '50mb' }));

// In-memory job store for async processing
const jobs = new Map();

// Cleanup finished jobs after 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 600000) {
      jobs.delete(id);
    }
  }
}, 60000);

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

// POST /api/generate/process — kick off async processing
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

  // Create job and return immediately
  jobs.set(sessionId, { status: 'processing', createdAt: Date.now() });
  res.json({ status: 'processing', sessionId });

  // Process in the background
  try {
    const { buffer, fileName, fileType } = reassembleAndDecrypt(sessionId);

    const text = await extractText(buffer, fileName, fileType);
    if (!text || !text.trim()) {
      cleanupSession(sessionId);
      jobs.set(sessionId, { status: 'error', error: 'No readable text found in document', createdAt: Date.now() });
      return;
    }

    const { scripts, usage } = await generateScripts(text);
    cleanupSession(sessionId);
    jobs.set(sessionId, { status: 'done', scripts, usage, createdAt: Date.now() });
  } catch (err) {
    cleanupSession(sessionId);
    console.error('Generate process error:', err.message);
    jobs.set(sessionId, { status: 'error', error: err.message, createdAt: Date.now() });
  }
});

// GET /api/generate/status/:sessionId — poll for results
router.get('/status/:sessionId', (req, res) => {
  const job = jobs.get(req.params.sessionId);
  if (!job) {
    return res.status(404).json({ status: 'not_found' });
  }

  if (job.status === 'processing') {
    return res.json({ status: 'processing' });
  }

  if (job.status === 'error') {
    jobs.delete(req.params.sessionId);
    return res.json({ status: 'error', error: job.error });
  }

  // Done — return scripts and usage, clean up
  const { scripts, usage } = job;
  jobs.delete(req.params.sessionId);
  res.json({ status: 'done', scripts, usage });
});

module.exports = router;
