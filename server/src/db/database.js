const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'qa-tracker.db');

const db = new Database(DB_PATH);

// Enable WAL mode for concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    steps TEXT,
    expected_result TEXT,
    module TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'draft',
    created_by INTEGER REFERENCES team_members(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    environment TEXT,
    date TEXT,
    created_by INTEGER REFERENCES team_members(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL REFERENCES test_runs(id),
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id),
    status TEXT NOT NULL,
    notes TEXT,
    executed_by INTEGER REFERENCES team_members(id),
    executed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    severity TEXT DEFAULT 'medium',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    module TEXT,
    assigned_to INTEGER REFERENCES team_members(id),
    reported_by INTEGER REFERENCES team_members(id),
    test_case_id INTEGER REFERENCES test_cases(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
