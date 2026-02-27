# Test Script Detail Page Enhancement Design

**Date:** 2026-02-28
**Status:** Approved

## Overview

Redesign the test script detail page from a narrow single-column card to a full-width two-column layout with a metadata sidebar, matching the professional style of the enhanced Project Detail page.

## Current Problems

- Content constrained to `max-w-2xl` — wastes screen space
- Action buttons (File Bug, Edit, Delete) are oversized colored blocks crammed next to the title
- Preconditions field is not displayed
- No execution history — can't see how this test case performed across test runs
- Metadata (priority, status, module) shown as tiny tags with no visual hierarchy
- Linked bugs section is basic

## Design

### Layout: Full-Width Two-Column (2/3 + 1/3)

**Header area (full width):**
- Back link: `← Back to Test Scripts`
- Title: large heading
- Actions: outlined "Edit" button + overflow menu (⋯) containing "File Bug" and "Delete"

**Left column — Main Content:**
- **Description** — section with heading, pre-wrapped text
- **Preconditions** — section with heading (currently missing from view)
- **Steps** — section with heading, pre-wrapped numbered steps
- **Expected Result** — section with heading, pre-wrapped text

Each section has a subtle bottom border separator.

**Right column — Sidebar (sticky top):**

1. **Details card:**
   - Status (badge with color)
   - Priority (badge with color)
   - Module (chip)
   - Created By (name)
   - Created date (formatted)
   - Updated date (formatted)

2. **Linked Bugs card:**
   - Count in heading
   - Each bug: clickable title, status badge, severity badge
   - "File Bug" link if no bugs exist

3. **Execution History card (NEW):**
   - Shows all test run results for this test case
   - Each entry: test run name (clickable), status icon (pass ✓ / fail ✗ / blocked ⊘), date
   - Color-coded: green for pass, red for fail, yellow for blocked
   - Fetched from `test_results` table joined with `test_runs`
   - "No executions yet" placeholder if empty

### Server Changes

Add new endpoint or modify existing:
- `GET /api/test-cases/:id/executions` — returns test run results for a specific test case

```sql
SELECT tr.id, tr.name, tr.date, r.status, r.executed_at, tm.name as executed_by_name
FROM test_results r
JOIN test_runs tr ON r.test_run_id = tr.id
LEFT JOIN team_members tm ON r.executed_by = tm.id
WHERE r.test_case_id = ?
ORDER BY r.executed_at DESC
```

### UI Improvements

- Remove `max-w-2xl` constraint — use full available width
- Action buttons: outlined/ghost style instead of solid colored blocks
- Delete moved to overflow menu (consistent with Project Detail)
- Responsive: on mobile, sidebar stacks below main content
