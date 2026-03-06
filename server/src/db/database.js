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

// Migration: add auth columns to team_members
const memberCols = db.prepare("PRAGMA table_info(team_members)").all();
const colNames = memberCols.map(c => c.name);

if (!colNames.includes('email')) {
  db.exec("ALTER TABLE team_members ADD COLUMN email TEXT");
  db.exec("ALTER TABLE team_members ADD COLUMN password_hash TEXT");
  db.exec("ALTER TABLE team_members ADD COLUMN is_active INTEGER DEFAULT 1");
  db.exec("ALTER TABLE team_members ADD COLUMN last_login TEXT");
  db.exec("ALTER TABLE team_members ADD COLUMN must_change_password INTEGER DEFAULT 0");

  // Backfill existing members with email from name
  const bcrypt = require('bcryptjs');
  const tempHash = bcrypt.hashSync('changeme123', 10);
  const existing = db.prepare('SELECT id, name FROM team_members').all();
  const updateStmt = db.prepare('UPDATE team_members SET email = ?, password_hash = ?, role = ?, must_change_password = 1 WHERE id = ?');

  existing.forEach((m, i) => {
    const slug = m.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
    const email = `${slug}@local`;
    const role = i === 0 ? 'admin' : 'member';
    updateStmt.run(email, tempHash, role, m.id);
  });

  // Create unique index on email (after backfill to avoid null conflicts)
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email)");
}

// Migration: add project_id column to bugs if it doesn't exist
const bugCols = db.prepare("PRAGMA table_info(bugs)").all();
if (!bugCols.some(c => c.name === 'project_id')) {
  db.exec("ALTER TABLE bugs ADD COLUMN project_id INTEGER REFERENCES projects(id)");
  // Backfill from linked test case's project
  db.exec(`
    UPDATE bugs SET project_id = (
      SELECT tc.project_id FROM test_cases tc WHERE tc.id = bugs.test_case_id
    ) WHERE project_id IS NULL AND test_case_id IS NOT NULL
  `);
}

// Migration: add source column to test_cases if it doesn't exist
const tcColsSource = db.prepare("PRAGMA table_info(test_cases)").all();
if (!tcColsSource.some(c => c.name === 'source')) {
  db.exec("ALTER TABLE test_cases ADD COLUMN source TEXT DEFAULT 'manual'");
}

// Migration: add priority column to projects if it doesn't exist
const projColsCheck = db.prepare("PRAGMA table_info(projects)").all();
if (!projColsCheck.some(c => c.name === 'priority')) {
  db.exec("ALTER TABLE projects ADD COLUMN priority TEXT DEFAULT 'medium'");
}

// Migration: add generated_at column to projects if it doesn't exist
const projCols = db.prepare("PRAGMA table_info(projects)").all();
if (!projCols.some(c => c.name === 'generated_at')) {
  db.exec("ALTER TABLE projects ADD COLUMN generated_at TEXT DEFAULT NULL");
}

// Migration: add parent_id column to projects for sub-project hierarchy
const projColsParent = db.prepare("PRAGMA table_info(projects)").all();
if (!projColsParent.some(c => c.name === 'parent_id')) {
  db.exec("ALTER TABLE projects ADD COLUMN parent_id INTEGER REFERENCES projects(id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON projects(parent_id)");
}

// One-time backfill: tag existing batch-imported scripts as ai_generated
// Scripts created without a created_by but with a project_id were batch-imported via AI generation
const backfillDone = db.prepare("SELECT 1 FROM app_settings WHERE key = 'backfill_ai_source_done'").get();
if (!backfillDone) {
  db.exec(`
    UPDATE test_cases SET source = 'ai_generated'
    WHERE project_id IS NOT NULL AND created_by IS NULL AND source = 'manual'
  `);
  // Set generated_at on projects that have AI-generated scripts
  db.exec(`
    UPDATE projects SET generated_at = (
      SELECT MAX(tc.created_at) FROM test_cases tc
      WHERE tc.project_id = projects.id AND tc.source = 'ai_generated'
    )
    WHERE id IN (SELECT DISTINCT project_id FROM test_cases WHERE source = 'ai_generated')
  `);
}

// Create app_settings table for in-app configuration
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Insert backfill marker after app_settings table is guaranteed to exist
if (!backfillDone) {
  db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('backfill_ai_source_done', '1')").run();
}

// Create ai_generation_logs table
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES team_members(id),
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_estimate REAL DEFAULT 0,
    scripts_generated INTEGER DEFAULT 0,
    thinking_enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migration: add actual_result and override columns to test_results
const trCols = db.prepare("PRAGMA table_info(test_results)").all();
const trColNames = trCols.map(c => c.name);
if (!trColNames.includes('actual_result')) {
  db.exec("ALTER TABLE test_results ADD COLUMN actual_result TEXT");
}
if (!trColNames.includes('override_steps')) {
  db.exec("ALTER TABLE test_results ADD COLUMN override_steps TEXT");
  db.exec("ALTER TABLE test_results ADD COLUMN override_expected_result TEXT");
  db.exec("ALTER TABLE test_results ADD COLUMN override_preconditions TEXT");
}

// Seed default settings from env vars if not already present
const seedSetting = db.prepare(
  'INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
);
seedSetting.run('ai_model', process.env.AI_MODEL || 'gpt-4o');
seedSetting.run('ai_thinking_enabled', process.env.AI_THINKING_ENABLED || 'false');

// Seed default admin if no members exist
const memberCount = db.prepare('SELECT COUNT(*) as count FROM team_members').get().count;
if (memberCount === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO team_members (name, role, email, password_hash, is_active, must_change_password) VALUES (?, ?, ?, ?, 1, 1)'
  ).run('Admin', 'admin', 'admin@local', hash);
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email)");
}

module.exports = db;
