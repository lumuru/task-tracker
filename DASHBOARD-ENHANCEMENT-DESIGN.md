# Dashboard Enhancement — Feature Design

**Date:** 2026-02-27
**Scope:** Redesign dashboard to be project-centric with summary cards, project table, breakdown tables, and charts

---

## 1. Overview

The current dashboard shows flat global stats (total test cases, open bugs, test runs, pass rate). The enhanced dashboard should be **project-centric** — showing per-project metrics at a glance, with visual charts for status distribution and priority breakdown.

Inspired by the reference spreadsheet layout: summary cards at top, breakdown tables in the middle, and pie/bar charts at the bottom.

---

## 2. Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                         │
│                                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Total    │ │ Total    │ │ Active   │ │ Open     │ │ Avg Pass │ │
│  │ Projects │ │ Test     │ │ Projects │ │ Defects  │ │ Rate     │ │
│  │    4     │ │ Cases    │ │    3     │ │    5     │ │   72%    │ │
│  │          │ │   11     │ │          │ │          │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                    │
│  ─── Project Overview ─────────────────────────────────────────    │
│  ┌────────────────┬───────┬────────┬─────────┬──────────────────┐  │
│  │ Project        │ Test  │ Status │ Open    │ Latest Pass Rate │  │
│  │                │ Cases │        │ Defects │                  │  │
│  ├────────────────┼───────┼────────┼─────────┼──────────────────┤  │
│  │ BSC            │   5   │ Active │    2    │      85%         │  │
│  │ LDR            │   3   │ Active │    1    │      67%         │  │
│  │ Payment v2     │   1   │ Active │    0    │       —          │  │
│  │ Archive Proj   │   2   │Archived│    2    │      50%         │  │
│  └────────────────┴───────┴────────┴─────────┴──────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Status Breakdown           │ │  Priority Breakdown          │  │
│  │  ┌──────────┬───────┐       │ │  ┌──────────┬───────┐       │  │
│  │  │ Status   │ Count │       │ │  │ Priority │ Count │       │  │
│  │  ├──────────┼───────┤       │ │  ├──────────┼───────┤       │  │
│  │  │ Draft    │   4   │       │ │  │ Critical │   1   │       │  │
│  │  │ Ready    │   6   │       │ │  │ High     │   4   │       │  │
│  │  │Deprecated│   1   │       │ │  │ Medium   │   5   │       │  │
│  │  └──────────┴───────┘       │ │  │ Low      │   1   │       │  │
│  │                             │ │  └──────────┴───────┘       │  │
│  └─────────────────────────────┘ └──────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────┐ ┌──────────────────────────────┐  │
│  │                             │ │                              │  │
│  │  Test Case Status           │ │  Test Cases by Priority      │  │
│  │  Distribution               │ │                              │  │
│  │      (Pie Chart)            │ │      (Bar Chart)             │  │
│  │                             │ │                              │  │
│  │    ┌─────┐                  │ │    █                         │  │
│  │   /  Ready \                │ │    █   █                     │  │
│  │  │  55%     │               │ │    █   █                     │  │
│  │  │    Draft │               │ │    █   █   █                 │  │
│  │   \ 36%   /                 │ │    █   █   █   █             │  │
│  │    └─────┘                  │ │   Crit High Med  Low         │  │
│  │   Deprecated 9%             │ │                              │  │
│  │                             │ │                              │  │
│  └─────────────────────────────┘ └──────────────────────────────┘  │
│                                                                    │
│  ─── Recent Activity ──────────────────────────────────────────    │
│  ┌─────────────────────────────┐ ┌──────────────────────────────┐  │
│  │  Recent Bugs                │ │  Recent Test Executions       │  │
│  │  (same as current)          │ │  (same as current)            │  │
│  └─────────────────────────────┘ └──────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. New Data Requirements

### 3.1 New API Endpoint: Project Summary

```
GET /api/dashboard/project-summary
```

Returns per-project stats for the dashboard table.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Balanced Scorecard (BSC)",
    "status": "active",
    "test_case_count": 5,
    "open_defects": 2,
    "latest_pass_rate": 85
  },
  {
    "id": 2,
    "name": "TACAD P2 LDR",
    "status": "active",
    "test_case_count": 3,
    "open_defects": 1,
    "latest_pass_rate": 67
  }
]
```

**SQL Logic per project:**
- `test_case_count`: `SELECT COUNT(*) FROM test_cases WHERE project_id = p.id`
- `open_defects`: `SELECT COUNT(*) FROM bugs WHERE test_case_id IN (SELECT id FROM test_cases WHERE project_id = p.id) AND status NOT IN ('verified','closed')`
- `latest_pass_rate`: Find the latest test_run that includes test cases from this project, compute pass rate from its results

### 3.2 Enhanced Stats Endpoint

Add to existing `GET /api/dashboard/stats`:

```json
{
  "total_projects": 4,
  "active_projects": 3,
  "test_cases": 11,
  "bugs": { "total": 6, "open": 5, "closed": 1 },
  "avg_pass_rate": 72,
  "status_breakdown": [
    { "status": "draft", "count": 4 },
    { "status": "ready", "count": 6 },
    { "status": "deprecated", "count": 1 }
  ],
  "priority_breakdown": [
    { "priority": "critical", "count": 1 },
    { "priority": "high", "count": 4 },
    { "priority": "medium", "count": 5 },
    { "priority": "low", "count": 1 }
  ],
  "test_runs": 2,
  "latest_run": { ... },
  "bugs_by_severity": [ ... ]
}
```

**New fields:**
- `total_projects` — count of all projects
- `active_projects` — count of projects with status = 'active'
- `avg_pass_rate` — average pass rate across all test runs that have been executed
- `status_breakdown` — count of test cases by status (draft/ready/deprecated)
- `priority_breakdown` — count of test cases by priority (critical/high/medium/low)

---

## 4. Charts

### 4.1 Library

Use **Recharts** — lightweight React charting library, works well with Tailwind.

```
npm install recharts
```

### 4.2 Pie Chart — Test Case Status Distribution

- Segments: Draft, Ready, Deprecated
- Colors: Gray (draft), Blue (ready), Red (deprecated)
- Labels show count and percentage
- Legend at bottom

### 4.3 Bar Chart — Test Cases by Priority

- X-axis: Critical, High, Medium, Low
- Y-axis: Number of test cases
- Colors: Red (critical), Orange (high), Yellow (medium), Green (low)
- Value labels on top of each bar

---

## 5. UI Component Breakdown

### Section 1: Summary Cards (top row)

| Card | Value | Color |
|------|-------|-------|
| Total Projects | `total_projects` | Gray |
| Total Test Cases | `test_cases` | Gray |
| Active Projects | `active_projects` | Green |
| Open Defects | `bugs.open` | Red |
| Avg Pass Rate | `avg_pass_rate`% | Blue |

5 cards in a row, matching the reference spreadsheet's top bar.

### Section 2: Project Overview Table

A table listing every project with:

| Column | Source | Notes |
|--------|--------|-------|
| Project | `name` | Link to project detail |
| Test Cases | `test_case_count` | Numeric count |
| Status | `status` | Colored badge (Active=green, Archived=gray) |
| Open Defects | `open_defects` | Red text if > 0 |
| Latest Pass Rate | `latest_pass_rate` | Percentage with color coding: green ≥80%, yellow ≥50%, red <50%, dash if no runs |

### Section 3: Breakdown Tables (side by side)

Two small tables:

**Status Breakdown**
| Status | Count |
|--------|-------|
| Draft | 4 |
| Ready | 6 |
| Deprecated | 1 |

**Priority Breakdown**
| Priority | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 1 |

### Section 4: Charts (side by side)

- Left: Pie chart — Test Case Status Distribution
- Right: Bar chart — Test Cases by Priority

### Section 5: Recent Activity (kept from current)

- Recent Bugs (left)
- Recent Test Executions (right)

---

## 6. Implementation Plan

### Step 1: Install Recharts

```bash
cd client && npm install recharts
```

### Step 2: Server — Add project-summary endpoint and enhance stats

**File:** `server/src/routes/dashboard.js`

- Add `GET /api/dashboard/project-summary` endpoint
- Enhance `GET /api/dashboard/stats` to include `total_projects`, `active_projects`, `avg_pass_rate`, `status_breakdown`, `priority_breakdown`

### Step 3: Client — Rewrite Dashboard page

**File:** `client/src/pages/Dashboard.jsx`

- Fetch `/api/dashboard/stats`, `/api/dashboard/activity`, `/api/dashboard/project-summary`
- Render 5 summary cards
- Render project overview table
- Render status + priority breakdown tables
- Render pie chart + bar chart using Recharts
- Keep recent activity section

---

## 7. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `client/package.json` | Modify | Add `recharts` dependency |
| `server/src/routes/dashboard.js` | Modify | Add project-summary endpoint, enhance stats |
| `client/src/pages/Dashboard.jsx` | Modify | Full rewrite with new layout, tables, and charts |
