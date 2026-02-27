# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

QA Task Tracker is a lightweight full-stack web app for managing QA testing activities (test scripts, test runs, bugs) for a small team on a local network. No authentication — users identify themselves by selecting from a pre-configured team member list.

## Commands

### Development

```sh
# Start both server and client concurrently
npm run dev

# Start server only (Express on port 3001)
npm run server

# Start client only (Vite on port 5173)
npm run client
```

### Build

```sh
# Build client for production
cd client && npx vite build
```

### Database

The SQLite database lives at `server/data/qa-tracker.db`. It is gitignored and created automatically on first server start. To reset, delete the file and restart the server.

### No Test Framework or Linter

There is currently no test framework, linter, or type checker configured in this project.

## Architecture

### Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router v6
- **Backend:** Node.js + Express (CommonJS `require`)
- **Database:** SQLite via `better-sqlite3` (synchronous API)
- **File uploads:** multer + xlsx (Excel import for test scripts)

### Server (`server/`)

- **Entry point:** `server/src/index.js` — mounts all route handlers and starts Express on `PORT` (default 3001).
- **Database setup:** `server/src/db/database.js` — creates all tables on `require()`, runs inline migrations (e.g. adding `project_id` to `test_cases`), enables WAL mode and foreign keys. This single file is the schema source of truth.
- **Routes:** Each domain entity has its own Express router in `server/src/routes/`:
  - `members.js`, `projects.js`, `projectTestScripts.js`, `testCases.js`, `testRuns.js`, `bugs.js`, `dashboard.js`
- **Pattern:** Routes use `db.prepare(...).all()` / `.get()` / `.run()` directly (no ORM, no async). Validation is inline in route handlers. Errors return JSON `{ error: "..." }` with appropriate HTTP status codes.

### Client (`client/`)

- **Entry point:** `client/src/main.jsx` → `App.jsx` (React Router with a shared `Layout` wrapper).
- **API layer:** `client/src/api/` — one module per entity, each exporting async functions that call `fetch()`. All use `const BASE_URL = import.meta.env.VITE_API_URL || ''` to support the Vite dev proxy (no hardcoded port).
- **Pages:** `client/src/pages/` — one component per route (list, detail, form patterns).
- **Layout:** `client/src/components/Layout.jsx` — sidebar nav + `<Outlet />`.
- **Styling:** Tailwind utility classes directly in JSX. Config in `tailwind.config.js` / `postcss.config.js`.
- **Vite proxy:** In dev mode, `/api` requests are proxied from port 5173 → 3001 (configured in `vite.config.js`).

### Key Domain Concepts

- **Test scripts** are test cases scoped to a project via `test_cases.project_id` FK. The primary CRUD path is through project-scoped routes (`/api/projects/:projectId/test-scripts`). The global `/api/test-cases` endpoints are kept as a read-only cross-project view.
- **Project membership enforcement:** Only members assigned to a project (via `project_members` table) can create, edit, or delete its test scripts. The server returns 403 when this constraint is violated. The helper `isProjectMember()` in `projectTestScripts.js` handles this check.
- **No authentication:** The client sends `created_by` / `member_id` in request bodies or query params to identify who is performing the action. There are no sessions or tokens.

### Database Schema (7 tables)

`team_members` → `project_members` ← `projects`; `test_cases` (has `project_id` FK to `projects`); `test_runs` → `test_results` ← `test_cases`; `bugs` (optional FK to `test_cases`). Full DDL is in `server/src/db/database.js`.

### Adding a New API Resource

1. Create a new route file in `server/src/routes/` following the existing Express router pattern.
2. Mount the router in `server/src/index.js`.
3. Create a corresponding API client module in `client/src/api/`.
4. Add page components in `client/src/pages/` and register routes in `client/src/App.jsx`.

## Milestone Progress

See `REQUIREMENTS.md` for the full requirements and milestone plan. `M2B-TEST-SCRIPTS-DESIGN.md` contains the detailed design for the test scripts module. Milestones M1 (setup, schema, team members) and M2 (projects + test scripts) are implemented. M3 (test run execution), M4 (bug tracking), M5 (dashboard), and M6 (polish) are in progress or planned.
