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

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_by INTEGER REFERENCES team_members(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES team_members(id),
    assigned_at TEXT DEFAULT (datetime('now')),
    UNIQUE(project_id, member_id)
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

// Migration: add project_id column to test_cases if it doesn't exist
const columns = db.prepare("PRAGMA table_info(test_cases)").all();
const hasProjectId = columns.some(c => c.name === 'project_id');
if (!hasProjectId) {
  db.exec("ALTER TABLE test_cases ADD COLUMN project_id INTEGER REFERENCES projects(id)");
  // Backfill: match existing test cases to projects by module = project name
  db.exec(`
    UPDATE test_cases SET project_id = (
      SELECT id FROM projects WHERE projects.name = test_cases.module
    ) WHERE project_id IS NULL
  `);
}

// Create index after migration ensures column exists
db.exec("CREATE INDEX IF NOT EXISTS idx_test_cases_project_id ON test_cases(project_id)");

// Migration: add preconditions column to test_cases if it doesn't exist
const tcCols2 = db.prepare("PRAGMA table_info(test_cases)").all();
if (!tcCols2.some(c => c.name === 'preconditions')) {
  db.exec("ALTER TABLE test_cases ADD COLUMN preconditions TEXT");
}

// Migration: add project_id column to test_runs if it doesn't exist
const runColumns = db.prepare("PRAGMA table_info(test_runs)").all();
const runHasProjectId = runColumns.some(c => c.name === 'project_id');
if (!runHasProjectId) {
  db.exec("ALTER TABLE test_runs ADD COLUMN project_id INTEGER REFERENCES projects(id)");
}

module.exports = db;
