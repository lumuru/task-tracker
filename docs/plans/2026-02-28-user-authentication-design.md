# User Authentication Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Add email/password authentication to the QA Task Tracker. Currently the app has no auth — users manually select their name from a dropdown. This design introduces login, JWT-based sessions, role-based access (Admin/Member), and admin-managed accounts.

## Requirements

- **Auth method:** Email + password (bcrypt hashed)
- **Registration:** Admin-only (no self-registration)
- **Roles:** Admin (full access) and Member (project-scoped access)
- **Sessions:** JWT tokens stored in localStorage, 8-hour expiry
- **First login:** Force password change on default/temporary passwords

## Database Changes

Alter `team_members` table — add columns via migration in `database.js`:

| Column | Type | Description |
|--------|------|-------------|
| `email` | TEXT UNIQUE NOT NULL | Login identifier |
| `password_hash` | TEXT NOT NULL | bcrypt hash |
| `is_active` | INTEGER DEFAULT 1 | Soft disable accounts |
| `last_login` | TEXT | Timestamp for audit |

The existing `role` column (currently free-text) is enforced as `'admin'` or `'member'`.

### Migration Strategy

- Existing `team_members` rows get `email` set to `<name-slugified>@local` and a temporary bcrypt password hash.
- The first existing user is promoted to `admin`; remaining users default to `member`.
- If no users exist, seed a default admin: `admin@local` / `admin123`.

### Environment Variables

Add to `server/.env`:
```
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=8h
```

## Backend Architecture

### New Files

- **`server/src/middleware/auth.js`** — JWT verification middleware
- **`server/src/routes/auth.js`** — Authentication endpoints

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | Public | Accepts `{ email, password }`, returns `{ token, user }` |
| GET | `/api/auth/me` | Required | Returns current user profile from token |
| PUT | `/api/auth/change-password` | Required | Accepts `{ oldPassword, newPassword }` |

### Middleware

- **`requireAuth`** — Applied to all `/api/*` routes except `/api/auth/login`. Verifies JWT from `Authorization: Bearer <token>` header. Attaches `req.user = { id, email, name, role }` to the request. Returns 401 on missing/invalid/expired token.
- **`requireAdmin`** — Checks `req.user.role === 'admin'`. Returns 403 if not admin. Applied to: user management (CRUD in Settings), project deletion.

### Existing Route Changes

- All `created_by` fields auto-populated from `req.user.id` on the server side — client no longer sends this.
- Project membership check (`isProjectMember()`) continues to work as-is.
- Settings member CRUD routes protected with `requireAdmin`.

## Frontend Architecture

### New Files

- **`client/src/pages/Login.jsx`** — Login form (email + password), error display, redirect to dashboard on success
- **`client/src/context/AuthContext.jsx`** — React Context providing `{ user, token, login, logout, isAdmin }`

### Auth State Management

- Token stored in `localStorage` under key `qa_tracker_token`
- On app load, `AuthContext` reads token from storage, calls `GET /api/auth/me` to validate and hydrate user
- If token is expired or invalid, redirect to `/login`
- `login(email, password)` calls the API, stores token, sets user state
- `logout()` clears token and user state, redirects to `/login`

### API Layer Changes

- Create a shared `authFetch()` wrapper in `client/src/api/base.js` that:
  - Auto-attaches `Authorization: Bearer <token>` header
  - Handles 401 responses → clears token, redirects to `/login`
- All existing API modules (`projects.js`, `testCases.js`, etc.) use `authFetch()` instead of raw `fetch()`

### Route Protection

- `App.jsx` wraps all routes (except `/login`) in a `<PrivateRoute>` component
- Unauthenticated users always land on `/login`
- First-login users (temporary password) are redirected to change-password before accessing the app

### Layout Changes

- **Sidebar footer:** Shows logged-in user name + role badge (Admin/Member)
- **Logout button** in sidebar
- **Remove manual "Created By" dropdowns** from ProjectForm, TestCaseForm, BugForm — auto-filled from AuthContext

### Admin-Only UI

- Settings page (user management) only visible in sidebar for admins
- Project delete button only visible to admins
- User creation form in Settings includes email, temporary password, and role selection
- Member role badge displayed throughout the UI

## Security Considerations

- Passwords hashed with bcrypt (cost factor 10)
- JWT signed with server-side secret (never exposed to client)
- Token expiry set to 8 hours (configurable via env)
- Failed login attempts return generic "Invalid credentials" (no email/password hints)
- Inactive accounts (`is_active = 0`) blocked at login
- All API routes require valid token except login endpoint
