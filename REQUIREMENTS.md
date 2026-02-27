# QA Task Tracker - Application Requirements Document

## 1. Overview

**Project Name:** QA Task Tracker
**Version:** 1.0
**Date:** 2026-02-26

A lightweight web application for managing QA testing activities. It allows a small team (2-5 members) to create and organize test cases, track test execution results, and report/manage bugs — all from a single local-network application.

---

## 2. Goals

- Provide a centralized place for the QA team to manage testing activities
- Replace spreadsheet-based tracking with a structured, shared web interface
- Keep setup and maintenance minimal (no cloud infrastructure, no authentication overhead)

---

## 3. Tech Stack

| Layer      | Technology          | Rationale                              |
|------------|---------------------|----------------------------------------|
| Frontend   | React (Vite)        | Fast dev experience, component-based   |
| Backend    | Node.js + Express   | Simple REST API, JS full-stack         |
| Database   | SQLite              | Zero-config, file-based, portable      |
| Styling    | CSS Modules or Tailwind CSS | Scoped styles, utility-first option |

---

## 4. Deployment & Access

- **Hosting:** Single machine on the local network (developer's workstation or a shared server)
- **Access:** Any team member on the same network can access via `http://<host-ip>:<port>`
- **Authentication:** None — open access for anyone on the network
- **User identification:** Users select their name from a pre-configured team member list when performing actions (creating bugs, running tests, etc.)

---

## 5. Core Features

### 5.1 Team Member Management

- Pre-configured list of team members (name, role)
- Editable via a settings page
- Used for assignment and activity attribution

### 5.2 Project Management

| Capability              | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| Create project          | Name, description, status (active/archived)                  |
| Edit / archive          | Modify project details or archive completed projects         |
| Assign members          | Assign one or more team members to a project                 |
| View test scripts       | Navigate from project to its test scripts                    |
| Auto-responsibility     | Members assigned to a project are automatically responsible for all changes to its test scripts |

**Key Rules:**
- Every project has its own isolated set of test scripts (test cases)
- Only members assigned to a project can create, edit, or delete its test scripts
- When a team member is assigned to a project, they gain full responsibility over that project's test scripts — no additional per-test-script assignment is needed
- A team member can be assigned to multiple projects
- Project navigation is the primary entry point for managing test scripts: **Project → Test Scripts**

### 5.3 Test Script Management (formerly Test Case Management)

> **Note:** Test cases are now called **Test Scripts** when accessed within the context of a project. They are scoped per project.

| Capability              | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| Create test script      | Title, description, steps, expected result, priority, module |
| Edit / delete           | Modify or remove test scripts (by project members only)      |
| Belongs to a project    | Every test script is associated with exactly one project      |
| Organize by module      | Group test scripts by feature area or module within a project|
| Priority levels         | Critical, High, Medium, Low                                  |
| Status                  | Draft, Ready, Deprecated                                     |
| Search & filter         | Filter by module, priority, status; full-text search         |
| Responsibility          | Changes attributed to the project member who made them       |

### 5.4 Test Execution Tracking

| Capability              | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| Create test run         | Name, date, environment, linked test cases                   |
| Execute tests           | Mark each case as Pass, Fail, Blocked, Skipped               |
| Record notes            | Add notes/comments per test case execution                   |
| Link bugs               | Link a failed test to a new or existing bug                  |
| Run summary             | Show pass/fail/blocked counts and percentage                 |
| History                 | View past test runs and their results                        |

### 5.5 Bug / Defect Tracking

| Capability              | Description                                                  |
|-------------------------|--------------------------------------------------------------|
| Report bug              | Title, description, steps to reproduce, severity, module     |
| Assign                  | Assign bug to a team member                                  |
| Status workflow         | New → Open → In Progress → Fixed → Verified → Closed        |
| Severity levels         | Critical, Major, Minor, Trivial                              |
| Priority levels         | P1, P2, P3, P4                                               |
| Link to test case       | Associate bug with the test case that found it               |
| Search & filter         | Filter by status, severity, priority, assignee, module       |

### 5.6 Dashboard

- Summary cards: total test cases, total bugs (open/closed), recent test runs
- Quick stats: pass rate of latest run, open bug count by severity
- Recent activity feed (latest bugs reported, tests executed)

---

## 6. Data Model (Conceptual)

### TeamMember
- id, name, role, created_at

### Project
- id, name, description, status (active/archived), created_by (FK → TeamMember), created_at, updated_at

### ProjectMember
- id, project_id (FK → Project), member_id (FK → TeamMember), assigned_at
- **Unique constraint:** (project_id, member_id) — a member can only be assigned once per project
- **Role implication:** Any member listed here is automatically responsible for all test scripts in the project

### TestCase (Test Script)
- id, **project_id (FK → Project)**, title, description, steps (text), expected_result, module, priority, status, created_by (FK → TeamMember), created_at, updated_at
- **Constraint:** created_by must be a member of the associated project

### TestRun
- id, name, environment, date, created_by, created_at

### TestResult
- id, test_run_id (FK), test_case_id (FK), status (pass/fail/blocked/skipped), notes, executed_by, executed_at

### Bug
- id, title, description, steps_to_reproduce, severity, priority, status, module, assigned_to (FK), reported_by (FK), test_case_id (FK, nullable), created_at, updated_at

### Entity Relationships Diagram

```
TeamMember ──┐
             ├──< ProjectMember >──┤
Project ─────┘                     │
   │                               │
   └──< TestCase (Test Script) ────┘ (created_by must be a project member)
          │
          ├──< TestResult >── TestRun
          │
          └──< Bug (linked via test_case_id)
```

---

## 7. API Endpoints (Planned)

```
# Team Members
GET    /api/members
POST   /api/members
PUT    /api/members/:id
DELETE /api/members/:id

# Projects
GET    /api/projects                          # List all projects (with member count, test script count)
GET    /api/projects/:id                      # Get project details with members and test script summary
POST   /api/projects                          # Create project (name, description, member_ids[])
PUT    /api/projects/:id                      # Update project details
DELETE /api/projects/:id                      # Delete project (only if no test scripts exist)

# Project Members
GET    /api/projects/:id/members              # List members assigned to a project
POST   /api/projects/:id/members              # Assign member(s) to project (member_ids[])
DELETE /api/projects/:id/members/:memberId    # Remove member from project

# Test Scripts (Test Cases scoped to a project)
GET    /api/projects/:projectId/test-scripts                # List test scripts for a project
GET    /api/projects/:projectId/test-scripts/:id            # Get test script detail
POST   /api/projects/:projectId/test-scripts                # Create test script (creator must be project member)
PUT    /api/projects/:projectId/test-scripts/:id            # Update test script (editor must be project member)
DELETE /api/projects/:projectId/test-scripts/:id            # Delete test script (by project member only)

# Test Cases (legacy/global access — kept for backward compatibility)
GET    /api/test-cases                        # List all test cases across all projects
GET    /api/test-cases/:id                    # Get test case detail
POST   /api/test-cases                        # Create test case (project_id required)
PUT    /api/test-cases/:id                    # Update test case
DELETE /api/test-cases/:id                    # Delete test case

# Test Runs
GET    /api/test-runs
GET    /api/test-runs/:id
POST   /api/test-runs
PUT    /api/test-runs/:id/results
GET    /api/test-runs/:id/summary

# Bugs
GET    /api/bugs
GET    /api/bugs/:id
POST   /api/bugs
PUT    /api/bugs/:id
DELETE /api/bugs/:id

# Dashboard
GET    /api/dashboard/stats
GET    /api/dashboard/activity
```

---

## 8. UI Pages

| Page                     | Route                                      | Description                                         |
|--------------------------|---------------------------------------------|-----------------------------------------------------|
| Dashboard                | `/`                                         | Overview with stats and recent activity              |
| Projects                 | `/projects`                                 | List all projects with status and member count       |
| Project Detail           | `/projects/:id`                             | View project info, members, and its test scripts     |
| Project Form             | `/projects/new`, `/projects/:id/edit`       | Create or edit a project, assign members             |
| Test Scripts (per project) | `/projects/:projectId/test-scripts`       | List test scripts for a specific project             |
| Test Script Detail       | `/projects/:projectId/test-scripts/:id`     | View full test script details                        |
| Test Script Form         | `/projects/:projectId/test-scripts/new`     | Create test script within a project                  |
| Test Cases (global)      | `/test-cases`                               | List all test cases across projects (read-only view) |
| Test Case Detail         | `/test-cases/:id`                           | View full test case details                          |
| Test Runs                | `/test-runs`                                | List and create test runs                            |
| Test Run Execution       | `/test-runs/:id`                            | Execute tests and record results                     |
| Bugs                     | `/bugs`                                     | List, create, edit, filter bugs                      |
| Bug Detail               | `/bugs/:id`                                 | View full bug details and status history             |
| Settings                 | `/settings`                                 | Manage team members and modules                      |

---

## 9. Non-Functional Requirements

| Requirement    | Detail                                                       |
|----------------|--------------------------------------------------------------|
| Performance    | Page loads under 1 second on local network                   |
| Data storage   | SQLite DB file stored alongside the server                   |
| Backup         | DB file can be copied for manual backup                      |
| Browser support| Modern browsers (Chrome, Firefox, Edge — latest 2 versions)  |
| Responsiveness | Usable on desktop screens (responsive nice-to-have)          |
| Concurrency    | SQLite WAL mode to handle multiple simultaneous users        |

---

## 10. Out of Scope (v1.0)

- User authentication / passwords
- Role-based access control
- File/image attachments on bugs
- Email or Slack notifications
- CI/CD integration
- Test automation integration
- Export/import (CSV, Excel) — potential v1.1 feature
- Cloud deployment

---

## 11. Project Structure (Planned)

```
qa-task-tracker/
├── client/                # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page-level components
│   │   ├── api/           # API client functions
│   │   └── App.jsx
│   └── package.json
├── server/                # Express backend
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── db/            # SQLite setup and migrations
│   │   └── index.js       # Server entry point
│   ├── data/              # SQLite DB file location
│   └── package.json
└── README.md
```

---

## 12. Milestones

| Milestone | Scope                                          |
|-----------|-------------------------------------------------|
| M1        | Project setup, DB schema, team member CRUD      |
| M2        | Project management + Test script management (CRUD + UI) — see M2 detailed breakdown below |
| M3        | Test run execution and results tracking          |
| M4        | Bug tracking (CRUD + status workflow + UI)       |
| M5        | Dashboard and cross-linking (bugs ↔ test cases) |
| M6        | Polish, testing, and local deployment            |

### M2 Detailed Breakdown

**M2a — Project Module**
1. Create `projects` and `project_members` DB tables
2. Project CRUD API endpoints (`/api/projects`)
3. Project member assignment endpoints (`/api/projects/:id/members`)
4. Projects list page (`/projects`) — show all projects with status, member count, test script count
5. Project detail page (`/projects/:id`) — show project info, assigned members, and list of test scripts
6. Project create/edit form (`/projects/new`, `/projects/:id/edit`) — with member multi-select

**M2b — Test Script Module (scoped to Project)**
1. Add `project_id` column to `test_cases` table (FK → projects)
2. Test script CRUD API scoped under projects (`/api/projects/:projectId/test-scripts`)
3. Enforce project membership: only assigned members can create/edit/delete test scripts
4. Test scripts list page within project context (`/projects/:projectId/test-scripts`)
5. Test script create/edit form within project context
6. Keep backward-compatible global test case list (`/test-cases`) as a read-only cross-project view
7. Excel import updated to require project context

**M2c — Navigation & Integration**
1. Update sidebar navigation: add "Projects" as a primary nav item
2. Update flow: Projects → Test Scripts (primary path for managing test scripts)
3. Update Dashboard to show project-level stats
