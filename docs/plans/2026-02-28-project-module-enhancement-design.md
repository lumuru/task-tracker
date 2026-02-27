# Project Module Enhancement — Design Document

**Date:** 2026-02-28
**Status:** Draft — Pending Approval

---

## 1. Overview

Redesign the Project module to be more user-friendly, professional, and maximize screen usage. The current module uses narrow layouts, tiny text-link buttons, and cramped forms that make navigation difficult.

---

## 2. Project List Page (`/projects`)

### Current
- Narrow table with small text-link Edit/Delete actions
- No search or filtering
- No description preview

### Enhanced — Card Grid Layout

```
+-------------------------------------------------------------------+
|  Projects                       [Search...] [All v] [+ New Project]|
+-------------------------------------------------------------------+
|  +-----------------------+  +-----------------------+              |
|  | * Active              |  | * Active              |              |
|  | BSC Project           |  | TACAD P2 LDR          |              |
|  | A quality mgmt...     |  | Learning & dev...     |              |
|  |                       |  |                       |              |
|  | 3 members             |  | 5 members             |              |
|  | 12 test scripts       |  | 8 test scripts        |              |
|  |                       |  |                       |              |
|  | Created by Ron        |  | Created by Jerico     |              |
|  |          [Edit] [...] |  |          [Edit] [...] |              |
|  +-----------------------+  +-----------------------+              |
+-------------------------------------------------------------------+
```

- **Card grid**: 3 columns on desktop, 2 on tablet, 1 on mobile
- **Each card shows**: status badge, name (clickable), description preview (2 lines truncated), member count, test script count, created by name
- **Actions per card**: visible "Edit" button + "..." overflow menu containing Archive and Delete
- **Top bar**: search input (filters by name/description), status dropdown (All / Active / Archived), "+ New Project" button
- Clicking the card body navigates to the detail page

---

## 3. Project Detail Page (`/projects/:id`)

### Current
- Constrained to `max-w-2xl` (narrow column)
- All sections stacked vertically in one scroll
- Tiny text-link actions for test scripts

### Enhanced — Full-Width with Tabs

```
+-------------------------------------------------------------------+
|  <- Back to Projects                                               |
|  BSC Project                   * Active        [Edit] [...]        |
|  A quality management system for balanced scorecard tracking       |
|  Created by Ron  *  Updated Jan 15, 2025                          |
+-------------------------------------------------------------------+
|  [Overview]  [Test Scripts (12)]  [Activity]                       |
+-------------------------------------------------------------------+
|                                                                     |
|  OVERVIEW TAB:                                                      |
|  +------------------------------+ +------------------------------+ |
|  | Members (3)             [+]  | | Quick Stats                  | |
|  |                              | |                              | |
|  | [Ron - QA Lead         x]   | |  Test Scripts    12          | |
|  | [Jerico - Tester       x]   | |  Open Defects    3          | |
|  | [Maria - Developer     x]   | |  Pass Rate      85%         | |
|  |                              | |                              | |
|  | [Select member to add  v]   | |                              | |
|  +------------------------------+ +------------------------------+ |
+-------------------------------------------------------------------+
```

**Tabs:**
- **Overview**: Two-column layout with Members panel (left) and Quick Stats (right)
- **Test Scripts**: Embeds the existing `ProjectTestScripts` component with filters, sort, upload, download, and the new "Generate Test Scripts" button
- **Activity**: Recent bugs and test executions for this project (reuses dashboard activity data scoped to project)

**Header (above tabs):**
- Full-width with project name, status badge, description, creator name, formatted timestamps
- "Edit" button visible, "..." overflow menu with Archive/Delete
- Delete is disabled with tooltip if project has test scripts

**Members as chips:**
- Each member displayed as a removable chip/tag showing name and role
- "x" button on each chip to remove (with confirmation)
- Dropdown at the bottom to add new members

---

## 4. Project Form Page (`/projects/new` and `/projects/:id/edit`)

### Current
- Constrained to `max-w-2xl`
- Checkbox list for member selection (scrollable box)
- After edit, navigates to list page (loses context)

### Enhanced

- Widen to `max-w-3xl` for comfortable form width
- **Member selection**: Replace checkbox list with multi-select dropdown showing selected members as removable chips
- **After edit**: Navigate to `/projects/:id` (detail page) instead of `/projects` (list)
- **On edit mode**: Show "Created by" as read-only text so users know who created the project
- Larger input fields and proper spacing for touch-friendliness

---

## 5. Changes Summary

| Area | Current | Enhanced |
|------|---------|----------|
| List layout | Table with text links | Card grid with search + filter |
| List actions | Tiny Edit/Delete text | Edit button + overflow menu |
| Detail width | max-w-2xl (narrow) | Full-width |
| Detail structure | Single scroll | Tabbed (Overview, Test Scripts, Activity) |
| Members display | List with tiny Remove links | Chip tags with inline remove |
| Delete UX | Confirm dialog, error after click | Overflow menu, disabled with tooltip if has scripts |
| Timestamps | Raw ISO strings | Formatted dates |
| Search/Filter | None | Search by name, filter by status |
| Form after edit | Navigates to list | Navigates to detail page |
| Form members | Checkbox scrollable list | Multi-select dropdown with chips |

---

## 6. Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Projects.jsx` | Rewrite from table to card grid, add search + status filter |
| `client/src/pages/ProjectDetail.jsx` | Rewrite to full-width tabbed layout, chip-based members, overflow menu |
| `client/src/pages/ProjectForm.jsx` | Widen form, chip-based member selection, fix post-edit navigation |
| `server/src/routes/projects.js` | Add optional `?status=` query param filter to GET /api/projects |

---

## 7. No New Dependencies

All enhancements use existing Tailwind CSS utilities and React patterns already in the project.
