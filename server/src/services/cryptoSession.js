const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TMP_DIR = path.join(__dirname, '../../data/tmp');
const SESSION_TTL = parseInt(process.env.GENERATE_SESSION_TTL) || 600000; // 10 min

// In-memory session store
const sessions = new Map();

// Cleanup expired sessions every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL) {
      cleanupSession(id);
    }
  }
}, 60000);

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

function createSession({ fileName, fileType, totalParts, key, iv }) {
  ensureTmpDir();
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    fileName,
    fileType,
    totalParts,
    key,       // base64
    iv,        // base64
    parts: {},
    createdAt: Date.now(),
  });
  return sessionId;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function storePart(sessionId, partNumber, data) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const partPath = path.join(TMP_DIR, `${sessionId}_part${partNumber}`);
  fs.writeFileSync(partPath, data, 'base64');
  session.parts[partNumber] = partPath;
  return true;
}

function isComplete(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  return Object.keys(session.parts).length === session.totalParts;
}

function reassembleAndDecrypt(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  // Read and concatenate all parts in order
  const buffers = [];
  for (let i = 1; i <= session.totalParts; i++) {
    const partPath = session.parts[i];
    if (!partPath || !fs.existsSync(partPath)) {
      throw new Error(`Missing part ${i}`);
    }
    buffers.push(fs.readFileSync(partPath));
  }
  const ciphertext = Buffer.concat(buffers);

  // AES-256-GCM: the last 16 bytes are the auth tag
  const key = Buffer.from(session.key, 'base64');
  const iv = Buffer.from(session.iv, 'base64');
  const authTag = ciphertext.slice(-16);
  const encrypted = ciphertext.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return { buffer: decrypted, fileName: session.fileName, fileType: session.fileType };
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Delete temp files
  for (const partPath of Object.values(session.parts)) {
    try { fs.unlinkSync(partPath); } catch (_) {}
  }
  sessions.delete(sessionId);
}

module.exports = {
  createSession,
  getSession,
  storePart,
  isComplete,
  reassembleAndDecrypt,
  cleanupSession,
};
