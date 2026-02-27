# Export Test Scripts as Excel — Feature Design

**Date:** 2026-02-27
**Scope:** Download all test scripts for a project as an .xlsx file

---

## 1. Overview

Users need to export a project's test scripts into an Excel file for offline review, sharing with stakeholders, or archival. The export produces a single `.xlsx` file named after the project, containing all test scripts in that project.

---

## 2. Excel File Format

### File Name

`Test Scripts - {Project Name}.xlsx`

Example: `Test Scripts - Balanced Scorecard (BSC).xlsx`

### Sheet Name

`Test Scripts`

### Columns

| Column | Source Field | Description |
|--------|-------------|-------------|
| Test Case ID | `test_cases.id` | Unique numeric identifier |
| Test Scenario | `test_cases.module` | The module/feature area grouping |
| Test Case | `test_cases.title` | The test case name/title |
| Test Steps | `test_cases.steps` | Step-by-step instructions |
| Expected Result | `test_cases.expected_result` | What should happen if the test passes |

### Column Mapping

```
DB Field            → Excel Column
─────────────────────────────────────
id                  → Test Case ID
module              → Test Scenario
title               → Test Case
steps               → Test Steps
expected_result     → Expected Result
```

### Example Output

| Test Case ID | Test Scenario | Test Case | Test Steps | Expected Result |
|---|---|---|---|---|
| 6 | Buttons | Functional | 1. Step One\n2. Step Two\n3. Step Three | Functional Test will run |
| 7 | Button | Buttons | 1. click\n2. Click\n3. Click click | click will run the button's functionality |

### Sorting

Rows are sorted by `module` (Test Scenario) first, then by `id` (Test Case ID) — so test scripts are grouped by scenario.

---

## 3. API Design

### Endpoint

```
GET /api/projects/:projectId/test-scripts/export
```

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.ml`
- Content-Disposition: `attachment; filename="Test Scripts - {Project Name}.xlsx"`
- Body: binary `.xlsx` file

**Error Responses:**
- `404` — Project not found
- `200` with empty sheet — Project has no test scripts (still downloads a valid file with headers only)

### Implementation

Uses the `xlsx` library (already installed on the server for the import feature) to build the workbook in memory and stream it as a response.

```
1. Validate project exists
2. Query all test_cases WHERE project_id = :projectId ORDER BY module, id
3. Map rows to export columns
4. Build workbook with xlsx library
5. Write buffer and send as download response
```

---

## 4. UI Design

### Download Button Placement

The export button appears in **two locations**:

#### 1. Project Test Scripts List Page (`/projects/:projectId/test-scripts`)

Next to the existing "Upload Excel" and "New Test Script" buttons in the header.

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Project                                      │
│                                                         │
│  Test Scripts — BSC    [Download Excel] [Upload] [+ New] │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

#### 2. Project Detail Page (`/projects/:id`)

In the Test Scripts section header, next to "View All" and "+ New".

```
┌─────────────────────────────────────────────────────────┐
│  ─── Test Scripts (5) ──── [Download] [View All] [+ New] │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Button Behavior

- Clicking "Download Excel" triggers a direct file download (no page navigation)
- Button is always enabled, even if the project has zero test scripts (downloads file with headers only)
- No loading spinner needed — the download is fast for typical data sizes

---

## 5. Implementation Plan

### Step 1: Server — Export Endpoint

**File:** `server/src/routes/projectTestScripts.js`

Add `GET /export` route before the `/:id` route (to avoid route conflict).

```js
router.get('/export', (req, res) => {
  // 1. Validate project
  // 2. Query test scripts ordered by module, id
  // 3. Map to export format
  // 4. Build xlsx workbook
  // 5. Send as download
});
```

### Step 2: Client — API Function

**File:** `client/src/api/projectTestScripts.js`

Add `exportProjectTestScripts(projectId)` function that triggers a file download via `window.open()` or `<a>` download link.

### Step 3: Client — Add Download Button to Test Scripts List

**File:** `client/src/pages/ProjectTestScripts.jsx`

Add "Download Excel" button in the header actions area.

### Step 4: Client — Add Download Button to Project Detail

**File:** `client/src/pages/ProjectDetail.jsx`

Add "Download" link in the test scripts section header.

---

## 6. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `server/src/routes/projectTestScripts.js` | Modify | Add `GET /export` endpoint |
| `client/src/api/projectTestScripts.js` | Modify | Add export download function |
| `client/src/pages/ProjectTestScripts.jsx` | Modify | Add "Download Excel" button |
| `client/src/pages/ProjectDetail.jsx` | Modify | Add "Download" link in test scripts section |
