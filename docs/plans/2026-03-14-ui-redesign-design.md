# UI Redesign — Clean Modern SaaS Style

## Vision
Transform the QA Task Tracker from a functional but plain interface into a clean, modern SaaS-style app inspired by Linear, Notion, and Vercel. Focus on Dashboard + Sidebar first.

## Approach
Tailwind-only polish + Lucide React icons. No new UI framework. Dark sidebar with light content area.

## New Dependency
- `lucide-react` — lightweight modern icon library

## Design Specifications

### Sidebar (Layout.jsx)
- Background: `bg-slate-900`, text: `text-slate-300`
- App title: white text with accent icon
- Nav items: Lucide icon + label, `text-slate-400` default, `text-white bg-slate-800` active, `hover:bg-slate-800/50` hover
- Active indicator: left border `border-l-2 border-blue-500`
- User footer: avatar circle `bg-blue-500 text-white`, name white, role badge, LogOut icon
- All interactive elements: `transition-colors duration-150`

### Dashboard Summary Cards
- White background, `shadow-sm`, `hover:shadow-md`, `rounded-xl`
- Subtle colored left border per type (blue=projects, green=active, red=defects, amber=pass rate)
- Label: `text-xs uppercase tracking-wider text-slate-500`
- Value: `text-3xl font-semibold`
- Hover: `hover:scale-[1.02] transition-all duration-200`
- Lucide icon in colored circle beside each label

### Tables (Project Overview, Breakdowns)
- Container: `rounded-xl shadow-sm overflow-hidden`, no visible border
- Header: `bg-slate-50`, `text-xs uppercase tracking-wider text-slate-500 font-medium`
- Rows: `hover:bg-slate-50/50` transition
- Status badges: pill-shaped `rounded-full px-2.5 py-0.5`, color-coded
- Pass rate: colored text (green/yellow/red thresholds)

### Activity Feed (Recent Bugs & Test Runs)
- Clean list style (no cards), polished with better spacing and typography
- Severity: colored dots + text instead of gray badges
- Left color accent line per severity
- Timestamps: current format kept

### Public Layout Header (PublicLayout.jsx)
- White with `shadow-sm`, slightly taller padding
- Login form inputs: `rounded-lg` with focus ring animation
- Info banner: softer blue with Lucide `Info` icon

### Color Palette
- Sidebar: `slate-900`, `slate-800`, `slate-700`
- Content bg: `gray-50`
- Cards: white with `shadow-sm`
- Primary accent: `blue-500`/`blue-600`
- Status: green (active/pass), red (defects/fail), amber (warning), gray (archived)
- Text: `slate-800` (primary), `slate-500` (secondary), `slate-400` (muted)

### Typography
- Headings: `font-semibold` (not bold)
- Labels: `text-xs uppercase tracking-wider`
- Body: `text-sm`
- Values/stats: `text-3xl font-semibold`
