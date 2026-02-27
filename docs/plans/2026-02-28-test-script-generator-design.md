# Test Script Generator — Design Document

**Date:** 2026-02-28
**Status:** Draft — Pending Approval

---

## 1. Overview

A feature that lets users upload a requirements document (PDF, DOCX, or XLSX) and automatically generate test scripts using OpenAI GPT-4o. Generated scripts are reviewed in a preview table and selectively imported into a project's test cases.

**Key constraint:** Company policy forbids uploading documents directly. The system encrypts the file client-side with AES-256-GCM, splits it into 3 parts, and sends each part separately to the local server, which reassembles, decrypts, and processes it.

---

## 2. Data Flow

```
 BROWSER (Client)                          LOCAL SERVER (Express)
 ===============                           =====================

 1. User selects file
        |
 2. Read file as ArrayBuffer
        |
 3. Generate random AES-256-GCM key + IV
        |
 4. Encrypt entire file -> ciphertext
        |
 5. Split ciphertext into 3 equal parts
        |
 6. POST /api/generate/init
    -> { fileName, fileType, totalParts: 3,     -->  7. Create session record
       key (base64), iv (base64) }                    (store key, IV, metadata)
                                                      Return { sessionId }
 8. POST /api/generate/upload-part
    -> { sessionId, partNumber: 1, data }       -->  9. Store part 1 on disk

10. POST /api/generate/upload-part
    -> { sessionId, partNumber: 2, data }       --> 11. Store part 2 on disk

12. POST /api/generate/upload-part
    -> { sessionId, partNumber: 3, data }       --> 13. Store part 3 on disk

14. POST /api/generate/process
    -> { sessionId, projectId }                 --> 15. Combine 3 parts
                                                    16. Decrypt with AES-256-GCM
                                                    17. Extract text (pdf-parse /
                                                        mammoth / xlsx)
                                                    18. Send text to OpenAI GPT-4o
                                                    19. Parse response into test scripts
                                                    20. Delete temp files + session
                                                        Return { scripts: [...] }

21. Display preview table
        |
22. User reviews, edits, selects
        |
23. POST /api/projects/:id/test-scripts/batch
    -> { scripts: [...selected] }               --> 24. Insert into test_cases table
                                                        Return { imported: N }
```

---

## 3. Encryption & Splitting

### 3a. Client-Side (Web Crypto API)

The Web Crypto API is built into all modern browsers. No additional libraries needed.

1. Read the file as `ArrayBuffer`
2. Generate a random 256-bit AES key via `crypto.subtle.generateKey()`
3. Generate a random 12-byte IV via `crypto.getRandomValues()`
4. Encrypt: `crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBuffer)` -> ciphertext
5. Split ciphertext into 3 roughly equal `Uint8Array` chunks
6. Export key as raw bytes -> base64 string
7. Send key + IV in the `/init` call, then each chunk as a separate `/upload-part` call

### 3b. Server-Side (Node.js `crypto` module)

1. On `/init`: store `{ key, iv, fileName, fileType, parts: {} }` in memory (keyed by sessionId)
2. On each `/upload-part`: save the base64 chunk to a temp file in `server/data/tmp/`
3. On `/process`: read all 3 parts, concatenate, decrypt with `crypto.createDecipheriv('aes-256-gcm', key, iv)`, then process

### 3c. Security Notes

- The key and IV are sent over the network to the local server. This is acceptable because the server runs on **the user's own local device** (localhost or Cloudflare Tunnel). The encryption protects the file in transit during the multi-part transfer.
- Temp files and session data are deleted immediately after processing.
- Sessions expire after 10 minutes if not completed (server cleanup interval).
- The GCM authentication tag is appended to the ciphertext by Web Crypto API and verified on decryption, ensuring integrity.

---

## 4. OpenAI Integration

### 4a. Prompt Structure

The server sends extracted text to GPT-4o with a structured prompt:

```
You are a QA test script generator. Given the following software requirements
document, generate comprehensive test cases.

For each test case, provide:
- title: A clear test case name
- module: The feature/module this tests
- priority: critical | high | medium | low
- steps: Step-by-step test procedure
- expected_result: What should happen if the test passes
- preconditions: Any setup required before testing

Requirements document:
---
{extracted_text}
---

Respond in JSON format: { "test_scripts": [...] }
```

### 4b. Configuration

- Uses `response_format: { type: "json_object" }` for reliable JSON parsing
- API key stored in server `.env` file as `OPENAI_API_KEY`
- Model: `gpt-4o` (configurable via `OPENAI_MODEL` env var)
- Max token limit: 4096 (configurable via `OPENAI_MAX_TOKENS` env var)
- Large documents are chunked into sections if they exceed the context window, with results merged

### 4c. Text Extraction

| File Type | Library | Method |
|-----------|---------|--------|
| `.pdf` | `pdf-parse` | Extracts all text from PDF pages |
| `.docx` | `mammoth` | Converts DOCX to plain text |
| `.xlsx` | `xlsx` (already installed) | Reads all sheets, converts rows to text |

---

## 5. UI Flow

### 5a. Entry Point

A **"Generate Test Scripts"** button on the Project Detail page, inside the Test Scripts tab, next to the existing "New Test Script" and "Upload Excel" buttons.

### 5b. Step 1 — Upload

```
+-----------------------------------------------------------+
|  Generate Test Scripts from Requirements                   |
|                                                            |
|  +------------------------------------------------------+ |
|  |                                                      | |
|  |     [file icon] Drop your requirements file here     | |
|  |        or click to browse                            | |
|  |                                                      | |
|  |     Supported: .pdf, .docx, .xlsx                    | |
|  +------------------------------------------------------+ |
|                                                            |
|  [lock icon] File will be encrypted before transmission    |
|                                                            |
|                                            [Cancel]        |
+-----------------------------------------------------------+
```

- Drag-and-drop zone with click-to-browse fallback
- File type validation before proceeding
- Security notice to reassure the user

### 5c. Step 2 — Processing (Progress Indicator)

```
+-----------------------------------------------------------+
|  Generate Test Scripts from Requirements                   |
|                                                            |
|  [file icon] requirements-v2.pdf                           |
|                                                            |
|  [check] Encrypting file...                                |
|  [check] Uploading part 1 of 3...                          |
|  [check] Uploading part 2 of 3...                          |
|  [spinner] Uploading part 3 of 3...                        |
|  [ ] Generating test scripts with AI...                    |
|                                                            |
|  [================--------]  60%                           |
+-----------------------------------------------------------+
```

- Step-by-step progress checklist so the user knows exactly what's happening
- Each phase updates in real-time: encrypt -> upload parts -> generate
- The AI generation step may take 15-30 seconds depending on document size

### 5d. Step 3 — Review & Import

```
+----------------------------------------------------------------------+
|  Generated Test Scripts (15)        [Select All] [Import Selected (8)]|
+----------------------------------------------------------------------+
|  [x]  Login with valid credentials        | Auth     | High   | Edit |
|  [x]  Login with invalid password         | Auth     | High   | Edit |
|  [x]  Password reset flow                 | Auth     | Medium | Edit |
|  [ ]  Session timeout after inactivity    | Auth     | Low    | Edit |
|  [x]  Create new user account             | Users    | High   | Edit |
|  [x]  Update user profile                 | Users    | Medium | Edit |
|  ...                                                                  |
+----------------------------------------------------------------------+
|  Expand a row to see: Steps, Expected Result, Preconditions           |
+----------------------------------------------------------------------+
```

- All rows checked by default
- User can uncheck individual rows to exclude them
- Click "Edit" to inline-edit title, module, or priority
- Expand a row to view/edit steps, expected result, and preconditions
- "Select All" toggles all checkboxes
- "Import Selected (N)" button shows count and inserts only checked rows
- After import, navigates back to the Test Scripts tab with a success message

---

## 6. API Endpoints (New)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/generate/init` | Start upload session. Receives encryption key, IV, file metadata. Returns `sessionId`. |
| `POST` | `/api/generate/upload-part` | Upload one encrypted chunk. Body: `{ sessionId, partNumber, data (base64) }`. |
| `POST` | `/api/generate/process` | Reassemble + decrypt + extract text + call OpenAI. Body: `{ sessionId, projectId }`. Returns `{ scripts: [...] }`. |
| `POST` | `/api/projects/:id/test-scripts/batch` | Bulk insert selected test scripts into a project. Body: `{ scripts: [...] }`. Returns `{ imported: N }`. |

### Request/Response Examples

**POST /api/generate/init**
```json
// Request
{
  "fileName": "requirements-v2.pdf",
  "fileType": "application/pdf",
  "totalParts": 3,
  "key": "base64-encoded-aes-key",
  "iv": "base64-encoded-iv"
}

// Response
{
  "sessionId": "uuid-v4-string"
}
```

**POST /api/generate/upload-part**
```json
// Request
{
  "sessionId": "uuid-v4-string",
  "partNumber": 1,
  "data": "base64-encoded-encrypted-chunk"
}

// Response
{
  "received": 1,
  "totalParts": 3
}
```

**POST /api/generate/process**
```json
// Request
{
  "sessionId": "uuid-v4-string",
  "projectId": 4
}

// Response
{
  "scripts": [
    {
      "title": "Login with valid credentials",
      "module": "Authentication",
      "priority": "high",
      "steps": "1. Navigate to login page\n2. Enter valid username\n3. Enter valid password\n4. Click Login",
      "expected_result": "User is redirected to the dashboard",
      "preconditions": "User account exists in the system"
    }
  ]
}
```

**POST /api/projects/:id/test-scripts/batch**
```json
// Request
{
  "scripts": [
    {
      "title": "Login with valid credentials",
      "module": "Authentication",
      "priority": "high",
      "steps": "1. Navigate to login page...",
      "expected_result": "User is redirected to the dashboard",
      "preconditions": "User account exists in the system"
    }
  ]
}

// Response
{
  "imported": 8,
  "total": 8
}
```

---

## 7. New Dependencies

| Package | Side | Purpose |
|---------|------|---------|
| `openai` | Server | OpenAI API client for GPT-4o |
| `pdf-parse` | Server | Extract text from PDF files |
| `mammoth` | Server | Extract text from DOCX files |
| `xlsx` | Server | Already installed — extract text from XLSX |
| `uuid` | Server | Generate session IDs |
| (none) | Client | Web Crypto API is built into the browser |

---

## 8. New Files

| File | Purpose |
|------|---------|
| `server/src/routes/generate.js` | Express router for `/api/generate/*` endpoints |
| `server/src/services/textExtractor.js` | Extracts text from PDF, DOCX, XLSX files |
| `server/src/services/scriptGenerator.js` | Sends extracted text to OpenAI, parses response |
| `server/src/services/cryptoSession.js` | Manages upload sessions, decryption, temp file cleanup |
| `client/src/api/generate.js` | API client for encrypt/split/upload/process flow |
| `client/src/pages/TestScriptGenerator.jsx` | Full-page UI: upload -> progress -> review -> import |
| `server/.env` | Environment variables (OPENAI_API_KEY, OPENAI_MODEL) |

---

## 9. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for GPT-4o |
| `OPENAI_MODEL` | No | `gpt-4o` | Model to use for generation |
| `OPENAI_MAX_TOKENS` | No | `4096` | Max tokens for AI response |
| `GENERATE_SESSION_TTL` | No | `600000` (10 min) | Session expiry in milliseconds |

---

## 10. Error Handling

| Scenario | Behavior |
|----------|----------|
| Unsupported file type | Client rejects before upload with message |
| Upload part fails (network error) | Client retries the failed part up to 3 times |
| Session expired | Server returns 410 Gone, client shows "Session expired, please try again" |
| OpenAI API error | Server returns 502, client shows "AI generation failed, please try again" |
| OpenAI returns malformed JSON | Server returns 422, client shows "Could not parse generated scripts" |
| File too large (> 10MB) | Client rejects before upload with size limit message |
| Empty document (no extractable text) | Server returns 400, client shows "No readable text found in document" |
