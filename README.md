# QA Task Tracker

A full-stack web application for managing QA testing activities — test scripts, test runs, bug tracking, and AI-powered test script generation. Built for small QA teams on a local network.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Recharts |
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| AI | OpenAI-compatible API via OpenRouter (Claude, GPT, etc.) |
| File Processing | pdf-parse, mammoth (DOCX), xlsx (Excel) |

## Features

- **Projects** — Create and manage QA projects with team member assignments, status tracking, and activity feeds
- **Test Scripts** — CRUD for test cases scoped to projects, with filtering by module, priority, and status
- **AI Test Script Generator** — Upload a BRD (PDF, DOCX, XLSX) and generate SIT-level test scripts covering functional, security, and usability testing. Files are encrypted client-side (AES-256-GCM) and split into 3 parts before upload
- **Test Runs** — Execute test runs against project test cases with pass/fail/blocked/skipped tracking and pass rate calculation
- **Bug Tracking** — Log bugs with severity, priority, status workflow, and link them to test cases
- **Dashboard** — Project-centric metrics with charts for test execution trends and bug status
- **Excel Import/Export** — Bulk import test cases from Excel and export project test scripts
- **Team Members** — Manage QA team members and assign them to projects

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/lumuru/rmrmorales.git
cd rmrmorales
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### Configuration

Create `server/.env`:

```env
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=anthropic/claude-3.7-sonnet:thinking
```

### Running

```bash
npm run dev
```

This starts both the Express server (port 3001) and Vite dev server (port 5173) concurrently.

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Build for Production

```bash
cd client && npx vite build
```

The built files go to `client/dist/`. The Express server serves them in production mode.

## Project Structure

```
qa-task-tracker/
├── client/                  # React frontend
│   ├── src/
│   │   ├── api/             # API client modules
│   │   ├── components/      # Shared components (Layout)
│   │   └── pages/           # Page components
│   └── vite.config.js
├── server/                  # Express backend
│   ├── src/
│   │   ├── db/              # SQLite database setup & migrations
│   │   ├── routes/          # API route handlers
│   │   └── services/        # AI generation, encryption, text extraction
│   └── data/                # SQLite database files
├── docs/plans/              # Design documents
└── DEPLOYMENT-GUIDE.md      # Deployment instructions
```

## Deployment

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for instructions on deploying the frontend to a domain (Vercel, Netlify, etc.) and running the backend on a local device via Cloudflare Tunnel.

## License

MIT
