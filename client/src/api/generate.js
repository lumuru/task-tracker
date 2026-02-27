const BASE_URL = import.meta.env.VITE_API_URL || '';

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

  // Export key as raw bytes
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

// ── API calls ───────────────────────────────────────────────

async function initSession(fileName, fileType, totalParts, key, iv) {
  const res = await fetch(`${BASE_URL}/api/generate/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`${BASE_URL}/api/generate/upload-part`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

async function processSession(sessionId) {
  const res = await fetch(`${BASE_URL}/api/generate/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'AI generation failed');
  }
  return res.json();
}

export async function batchImportScripts(projectId, scripts) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scripts }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import scripts');
  }
  return res.json();
}

// ── Main orchestrator ───────────────────────────────────────

/**
 * Full flow: encrypt -> split -> upload -> process
 * @param {File} file
 * @param {Function} onProgress - called with { step, detail, percent }
 * @returns {Promise<Array>} generated scripts
 */
export async function generateTestScripts(file, onProgress = () => {}) {
  const NUM_PARTS = 3;

  // Step 1: Read file
  onProgress({ step: 'encrypt', detail: 'Reading file...', percent: 5 });
  const fileBuffer = await file.arrayBuffer();

  // Step 2: Encrypt
  onProgress({ step: 'encrypt', detail: 'Encrypting file...', percent: 15 });
  const { ciphertext, key, iv } = await encryptFile(fileBuffer);

  // Step 3: Split
  const chunks = splitIntoChunks(ciphertext, NUM_PARTS);

  // Step 4: Init session
  onProgress({ step: 'init', detail: 'Starting secure session...', percent: 20 });
  const { sessionId } = await initSession(file.name, file.type, NUM_PARTS, key, iv);

  // Step 5: Upload parts
  for (let i = 0; i < NUM_PARTS; i++) {
    const partNum = i + 1;
    const percent = 20 + ((i + 1) / NUM_PARTS) * 40;
    onProgress({ step: `upload-${partNum}`, detail: `Uploading part ${partNum} of ${NUM_PARTS}...`, percent });
    await uploadPart(sessionId, partNum, chunks[i]);
  }

  // Step 6: Process
  onProgress({ step: 'generate', detail: 'Generating test scripts with AI...', percent: 70 });
  const { scripts } = await processSession(sessionId);

  onProgress({ step: 'done', detail: 'Done!', percent: 100 });
  return scripts;
}
