import { authFetch } from './base';

// ── Web Crypto helpers ──────────────────────────────────────

async function encryptFile(fileBuffer) {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);

  return {
    ciphertext: new Uint8Array(ciphertext),
    key: arrayBufferToBase64(rawKey),
    iv: arrayBufferToBase64(iv),
  };
}

function splitIntoChunks(data, numParts) {
  const chunkSize = Math.ceil(data.length / numParts);
  const chunks = [];
  for (let i = 0; i < numParts; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, data.length);
    chunks.push(data.slice(start, end));
  }
  return chunks;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function censorFileName(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot !== -1 ? name.slice(dot) : '';
  return `document_${Date.now()}${ext}`;
}

// ── API calls ───────────────────────────────────────────────

async function initSession(fileName, fileType, totalParts, key, iv) {
  const res = await authFetch('/api/generate/init', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileType, totalParts, key, iv }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to initialize upload session');
  }
  return res.json();
}

async function uploadPart(sessionId, partNumber, data, retries = 3) {
  const base64 = arrayBufferToBase64(data);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await authFetch('/api/generate/upload-part', {
        method: 'POST',
        body: JSON.stringify({ sessionId, partNumber, data: base64 }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to upload part ${partNumber}`);
      }
      return res.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
    }
  }
}

async function startProcessing(sessionId) {
  const res = await authFetch('/api/generate/process', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'AI generation failed');
  }
  return res.json();
}

async function pollForResult(sessionId) {
  const POLL_INTERVAL = 3000; // 3 seconds
  const MAX_POLL_TIME = 600000; // 10 minutes
  const start = Date.now();

  while (Date.now() - start < MAX_POLL_TIME) {
    const res = await authFetch(`/api/generate/status/${sessionId}`);
    if (!res.ok) {
      throw new Error('Failed to check generation status');
    }
    const data = await res.json();

    if (data.status === 'done') {
      return data;
    }
    if (data.status === 'error') {
      throw new Error(data.error || 'AI generation failed');
    }

    // Still processing — wait and poll again
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error('Generation timed out. Please try again.');
}

export async function batchImportScripts(projectId, scripts) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/batch`, {
    method: 'POST',
    body: JSON.stringify({ scripts }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import scripts');
  }
  return res.json();
}

// ── Main orchestrator ───────────────────────────────────────

export async function generateTestScripts(file, onProgress = () => {}) {
  const NUM_PARTS = 3;

  onProgress({ step: 'encrypt', detail: 'Reading file...', percent: 5 });
  const fileBuffer = await file.arrayBuffer();

  onProgress({ step: 'encrypt', detail: 'Encrypting file...', percent: 15 });
  const { ciphertext, key, iv } = await encryptFile(fileBuffer);

  const chunks = splitIntoChunks(ciphertext, NUM_PARTS);

  onProgress({ step: 'init', detail: 'Starting secure session...', percent: 20 });
  const { sessionId } = await initSession(censorFileName(file.name), file.type, NUM_PARTS, key, iv);

  for (let i = 0; i < NUM_PARTS; i++) {
    const partNum = i + 1;
    const percent = 20 + ((i + 1) / NUM_PARTS) * 40;
    onProgress({ step: `upload-${partNum}`, detail: `Uploading part ${partNum} of ${NUM_PARTS}...`, percent });
    await uploadPart(sessionId, partNum, chunks[i]);
  }

  onProgress({ step: 'generate', detail: 'Generating test scripts with AI...', percent: 70 });
  await startProcessing(sessionId);

  // Poll until the AI finishes
  const { scripts } = await pollForResult(sessionId);

  onProgress({ step: 'done', detail: 'Done!', percent: 100 });
  return scripts;
}
