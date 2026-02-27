# M2b — Test Scripts Module Design

**Date:** 2026-02-27
**Scope:** Test Scripts (Test Cases) scoped inside Projects
**Depends on:** M2a (Project Module) — already implemented

---

## 1. Overview

Test Scripts are test cases that belong to a specific project. Every test script lives inside exactly one project. Only members assigned to that project can create, edit, or delete its test scripts.

**Current state:** The `test_cases` table exists but has no `project_id` foreign key. It links to projects only by string-matching `test_cases.module = projects.name`, which is fragile and incorrect. This design replaces that with a proper FK relationship and project-scoped APIs/UI.

---

## 2. Database Changes

### 2.1 Add `project_id` column to `test_cases`

```sql
ALTER TABLE test_cases ADD COLUMN project_id INTEGER REFERENCES projects(id);
```

- **Nullable initially** — existing test cases without a project will have `project_id = NULL`
- New test scripts created through project-scoped routes will **require** `project_id`
- The `module` field remains as a **free-text grouping label** within a project (e.g., "Login", "Checkout", "API") — it is no longer used to link to projects

### 2.2 Migration Strategy

On server startup (in `database.js`):

1. Check if `project_id` column exists on `test_cases` (via `PRAGMA table_info(test_cases)`)
2. If not, run `ALTER TABLE test_cases ADD COLUMN project_id INTEGER REFERENCES projects(id)`
3. Backfill: `UPDATE test_cases SET project_id = (SELECT id FROM projects WHERE projects.name = test_cases.module) WHERE project_id IS NULL`
4. This is a best-effort migration — test cases whose `module` doesn't match any project name will remain with `project_id = NULL`

### 2.3 Updated Schema

```
test_cases
  id              INTEGER PK AUTOINCREMENT
  project_id      INTEGER → projects(id)     ← NEW
  title           TEXT NOT NULL
  description     TEXT
  steps           TEXT
  expected_result TEXT
  module          TEXT                        -- free-text grouping within project
  priority        TEXT DEFAULT 'medium'       -- critical | high | medium | low
  status          TEXT DEFAULT 'draft'        -- draft | ready | deprecated
  created_by      INTEGER → team_members(id)
  created_at      TEXT
  updated_at      TEXT
```

---

## 3. API Design

### 3.1 Project-Scoped Test Script Endpoints (Primary)

These are the main endpoints for managing test scripts within a project.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/:projectId/test-scripts` | List test scripts for a project |
| `GET` | `/api/projects/:projectId/test-scripts/:id` | Get a single test script |
| `POST` | `/api/projects/:projectId/test-scripts` | Create a test script in the project |
| `PUT` | `/api/projects/:projectId/test-scripts/:id` | Update a test script |
| `DELETE` | `/api/projects/:projectId/test-scripts/:id` | Delete a test script |

#### `GET /api/projects/:projectId/test-scripts`

**Query parameters (all optional):**
- `module` — filter by module name (exact match)
- `priority` — filter by priority level
- `status` — filter by status
- `search` — full-text search on title and description

**Response:**
```json
[
  {
    "id": 1,
    "project_id": 5,
    "title": "Verify login with valid credentials",
    "description": "...",
    "steps": "1. Open login page\n2. Enter valid email\n3. Enter valid password\n4. Click Login",
    "expected_result": "User is redirected to dashboard",
    "module": "Authentication",
    "priority": "high",
    "status": "ready",
    "created_by": 2,
    "created_by_name": "Alice",
    "created_at": "2026-02-27T10:00:00.000Z",
    "updated_at": "2026-02-27T10:00:00.000Z"
  }
]
```

**Validation:**
- Return `404` if `projectId` does not exist

#### `POST /api/projects/:projectId/test-scripts`

**Request body:**
```json
{
  "title": "Verify login with valid credentials",
  "description": "Test the standard login flow",
  "steps": "1. Open login page\n2. Enter valid email\n3. Enter valid password\n4. Click Login",
  "expected_result": "User is redirected to dashboard",
  "module": "Authentication",
  "priority": "high",
  "status": "draft",
  "created_by": 2
}
```

**Validation:**
- `title` is required
- `created_by` is required and **must be a member of the project** → return `403` with message "Only project members can create test scripts"
- `projectId` must reference an existing project → return `404`

**Response:** `201` with the created test script object

#### `PUT /api/projects/:projectId/test-scripts/:id`

**Validation:**
- The test script must belong to the given `projectId` → return `404` if mismatch
- The request must include an `updated_by` field (or we infer from body) — this user **must be a project member** → return `403`

**Updatable fields:** `title`, `description`, `steps`, `expected_result`, `module`, `priority`, `status`

#### `DELETE /api/projects/:projectId/test-scripts/:id`

**Validation:**
- The test script must belong to the given `projectId` → return `404`
- Cannot delete if `test_results` reference it → return `409`
- Optionally: verify the requester is a project member (via query param or header `?member_id=X`)

### 3.2 Global Test Case Endpoints (Backward-Compatible, Read-Only)

Keep existing endpoints at `/api/test-cases` for cross-project views. These remain **read-only** for browsing all test cases regardless of project.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/test-cases` | List all test cases across all projects (includes `project_id` and `project_name` in response) |
| `GET` | `/api/test-cases/:id` | Get a single test case with project info |
| `GET` | `/api/test-cases/modules` | List distinct module values |

**Changes to existing endpoints:**
- `POST /api/test-cases` → **Remove** or redirect to project-scoped route. All new test scripts must be created within a project context.
- `PUT /api/test-cases/:id` → **Remove** or redirect. Edits go through project-scoped routes.
- `DELETE /api/test-cases/:id` → **Remove** or redirect.
- `POST /api/test-cases/upload` → **Move** to `/api/projects/:projectId/test-scripts/upload` (Excel import needs project context)

### 3.3 Modules Endpoint (per project)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/:projectId/test-scripts/modules` | List distinct module values within a project |

Used to populate the module filter dropdown on the test scripts list page.

---

## 4. Membership Enforcement Logic

### Server-Side Middleware / Helper

```
function isProjectMember(projectId, memberId) → boolean
  SELECT 1 FROM project_members WHERE project_id = ? AND member_id = ?
```

Applied on:
- `POST /api/projects/:projectId/test-scripts` → check `created_by`
- `PUT /api/projects/:projectId/test-scripts/:id` → check `updated_by`
- `DELETE /api/projects/:projectId/test-scripts/:id` → check `member_id` param

**Error response when not a member:**
```json
{
  "error": "Only members assigned to this project can perform this action"
}
```
HTTP status: `403 Forbidden`

### Client-Side

- The test script create/edit form only shows project members in the "Created By" / "Author" dropdown (not all team members)
- The UI hides create/edit/delete actions if the current user is not a project member (nice-to-have; server enforces regardless)

---

## 5. UI Design

### 5.1 New Routes

| Page | Route | Component |
|------|-------|-----------|
| Test Scripts List | `/projects/:projectId/test-scripts` | `ProjectTestScripts.jsx` |
| Test Script Detail | `/projects/:projectId/test-scripts/:id` | `ProjectTestScriptDetail.jsx` |
| Test Script Create | `/projects/:projectId/test-scripts/new` | `ProjectTestScriptForm.jsx` |
| Test Script Edit | `/projects/:projectId/test-scripts/:id/edit` | `ProjectTestScriptForm.jsx` |

### 5.2 Test Scripts List Page (`/projects/:projectId/test-scripts`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Project                                      │
│                                                         │
│  Test Scripts — [Project Name]          [+ New Script]  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Module: [All ▾]  Priority: [All ▾]  Status: [All ▾]│ │
│  │ Search: [________________________]              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌──────┬──────────────────┬──────┬──────┬──────┬─────┐ │
│  │  #   │ Title            │Module│Prior.│Status│ Act.│ │
│  ├──────┼──────────────────┼──────┼──────┼──────┼─────┤ │
│  │  1   │ Login valid cred │Auth  │ High │Ready │✎ 🗑│ │
│  │  2   │ Login invalid pw │Auth  │ Med  │Draft │✎ 🗑│ │
│  │  3   │ Add to cart      │Cart  │ High │Ready │✎ 🗑│ │
│  └──────┴──────────────────┴──────┴──────┴──────┴─────┘ │
│                                                         │
│  Showing 3 test scripts                                 │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Breadcrumb or back-link to project detail
- Project name in header for context
- Filter bar: module dropdown (populated from `/modules` endpoint), priority, status, search
- Filters persist in URL search params
- Table with clickable title → detail page
- Edit/Delete action buttons per row
- "New Test Script" button → create form
- Count of displayed scripts

### 5.3 Test Script Detail Page (`/projects/:projectId/test-scripts/:id`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Test Scripts                                 │
│                                                         │
│  [Title]                          [Edit] [Delete]       │
│                                                         │
│  Priority: [High]   Status: [Ready]   Module: Auth      │
│  Created by: Alice   Created: Feb 27, 2026              │
│                                                         │
│  ─── Description ───────────────────────────────────    │
│  Test the standard login flow with valid credentials    │
│                                                         │
│  ─── Steps ─────────────────────────────────────────    │
│  1. Open login page                                     │
│  2. Enter valid email                                   │
│  3. Enter valid password                                │
│  4. Click Login                                         │
│                                                         │
│  ─── Expected Result ───────────────────────────────    │
│  User is redirected to dashboard                        │
│                                                         │
│  ─── Linked Bugs ───────────────────────────────────    │
│  • BUG-12: Login button unresponsive (Open)             │
│                                                         │
│  [File Bug for this Test Script]                        │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- All test script fields displayed
- Priority and status as colored badges
- Steps rendered with line breaks preserved
- Linked bugs section (fetched via `GET /api/bugs?test_case_id=X`)
- "File Bug" quick-link → `/bugs/new?test_case_id=X`
- Edit and Delete buttons
- Back navigation to test scripts list (preserving project context)

### 5.4 Test Script Create/Edit Form (`/projects/:projectId/test-scripts/new` and `/:id/edit`)

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | Text input | Yes | Max length guidance: 200 chars |
| Description | Textarea | No | General description of what the test covers |
| Steps | Textarea | No | Numbered steps, one per line |
| Expected Result | Textarea | No | What should happen if the test passes |
| Module | Text input | No | Free-text grouping label (e.g., "Authentication", "Cart") |
| Priority | Select | Yes | Critical, High, Medium (default), Low |
| Status | Select | Yes | Draft (default), Ready, Deprecated |
| Created By | Select | Yes (create only) | **Only project members shown** |

**Behavior:**
- On create mode: `created_by` dropdown only lists members of **this** project
- On edit mode: `created_by` is read-only (shown but not editable)
- After save: redirect to the test script detail page
- Cancel: return to test scripts list

### 5.5 Changes to Existing Pages

#### `ProjectDetail.jsx` — Enhanced test scripts section

Currently shows a test script count. Change to:

```
┌─────────────────────────────────────────────────────────┐
│  ─── Test Scripts (12) ─────────── [View All] [+ New]   │
│                                                         │
│  • Login valid credentials        High   Ready          │
│  • Login invalid password         Med    Draft          │
│  • Add to cart                    High   Ready          │
│  • ... (show first 5)                                   │
│                                                         │
│  → View all 12 test scripts                             │
└─────────────────────────────────────────────────────────┘
```

- Show a preview of the first 5 test scripts with title, priority, status
- "View All" link → `/projects/:id/test-scripts`
- "+ New" button → `/projects/:id/test-scripts/new`

#### `TestCases.jsx` (Global `/test-cases` page) — Read-only cross-project view

- Add a `Project` column showing which project each test case belongs to
- Project name is a link to `/projects/:projectId`
- Remove create/edit/delete actions (all management happens through project context)
- Keep filters and search
- Show "unassigned" label for test cases with `project_id = NULL`

#### `Layout.jsx` — Navigation update

No change needed to sidebar — "Test Cases" global link stays. The project-scoped test scripts are accessed through **Projects → Project Detail → Test Scripts**, which is the intended primary navigation path.

### 5.6 Excel Import (moved to project context)

The existing Excel upload on `/test-cases` moves to the project test scripts page.

- New endpoint: `POST /api/projects/:projectId/test-scripts/upload`
- Uploaded test scripts automatically get `project_id` set
- The `created_by` for imported scripts must be a project member (passed as form field)
- Excel columns remain: Title, Description, Steps, Expected Result, Module, Priority, Status

---

## 6. Implementation Plan (Ordered Steps)

### Step 1: Database Migration
- Add `project_id` column to `test_cases` table in `database.js`
- Write backfill logic to match existing test cases to projects by name
- File: `server/src/db/database.js`

### Step 2: Server — Project-Scoped Test Script Routes
- Create new route file: `server/src/routes/projectTestScripts.js`
- Implement all 5 CRUD endpoints + modules endpoint + upload endpoint
- Add membership enforcement helper
- Mount at `/api/projects/:projectId/test-scripts` in `server/src/index.js`

### Step 3: Server — Update Global Test Case Routes
- Modify `GET /api/test-cases` to include `project_id` and `project_name` in response
- Remove or deprecate write endpoints (POST, PUT, DELETE) — redirect to project-scoped
- File: `server/src/routes/testCases.js`

### Step 4: Client — API Client
- Create `client/src/api/projectTestScripts.js` with functions for all project-scoped endpoints

### Step 5: Client — Test Scripts List Page
- Create `client/src/pages/ProjectTestScripts.jsx`
- Filters, search, table with actions
- Wire up to API

### Step 6: Client — Test Script Detail Page
- Create `client/src/pages/ProjectTestScriptDetail.jsx`
- Display all fields, linked bugs, file-bug link

### Step 7: Client — Test Script Form
- Create `client/src/pages/ProjectTestScriptForm.jsx`
- Create and edit modes, project member dropdown

### Step 8: Client — Update Existing Pages
- Update `ProjectDetail.jsx` — add test scripts preview section
- Update `TestCases.jsx` — add project column, make read-only
- Update `App.jsx` — add new routes

### Step 9: Client — Route Registration
- Add all new routes to `App.jsx`

---

## 7. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `server/src/db/database.js` | Modify | Add `project_id` column + migration |
| `server/src/routes/projectTestScripts.js` | **Create** | Project-scoped test script CRUD |
| `server/src/index.js` | Modify | Mount new routes |
| `server/src/routes/testCases.js` | Modify | Add project info to responses, deprecate writes |
| `client/src/api/projectTestScripts.js` | **Create** | API client for project test scripts |
| `client/src/pages/ProjectTestScripts.jsx` | **Create** | Test scripts list within project |
| `client/src/pages/ProjectTestScriptDetail.jsx` | **Create** | Test script detail within project |
| `client/src/pages/ProjectTestScriptForm.jsx` | **Create** | Test script create/edit form |
| `client/src/pages/ProjectDetail.jsx` | Modify | Add test scripts preview section |
| `client/src/pages/TestCases.jsx` | Modify | Add project column, read-only |
| `client/src/App.jsx` | Modify | Add new routes |
