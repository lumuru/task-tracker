const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db/database');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// GET /api/test-cases — list with optional filters
router.get('/', (req, res) => {
  const { module, priority, status, search, project_id } = req.query;

  let sql = `SELECT tc.*, tm.name as created_by_name, p.name as project_name,
    (SELECT r.status FROM test_results r JOIN test_runs tr ON r.test_run_id = tr.id WHERE r.test_case_id = tc.id ORDER BY r.executed_at DESC LIMIT 1) as last_exec_status,
    (SELECT r.executed_at FROM test_results r JOIN test_runs tr ON r.test_run_id = tr.id WHERE r.test_case_id = tc.id ORDER BY r.executed_at DESC LIMIT 1) as last_exec_date,
    (SELECT COUNT(*) FROM bugs b WHERE b.test_case_id = tc.id) as bug_count
    FROM test_cases tc
    LEFT JOIN team_members tm ON tc.created_by = tm.id
    LEFT JOIN projects p ON tc.project_id = p.id`;
  const conditions = [];
  const params = [];

  if (module) {
    conditions.push('tc.module = ?');
    params.push(module);
  }
  if (priority) {
    conditions.push('tc.priority = ?');
    params.push(priority);
  }
  if (status) {
    conditions.push('tc.status = ?');
    params.push(status);
  }
  if (project_id) {
    conditions.push('tc.project_id = ?');
    params.push(project_id);
  }
  if (search) {
    conditions.push('(tc.title LIKE ? OR tc.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY tc.updated_at DESC';

  const testCases = db.prepare(sql).all(...params);
  res.json(testCases);
});

// GET /api/test-cases/modules — distinct module values for filters
router.get('/modules', (req, res) => {
  const modules = db.prepare("SELECT DISTINCT module FROM test_cases WHERE module IS NOT NULL AND module != '' ORDER BY module").all();
  res.json(modules.map(m => m.module));
});

// POST /api/test-cases/upload — bulk import from Excel
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'Excel file has no sheets' });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Sheet is empty' });
    }

    // Normalize column headers: lowercase + underscores
    const normalize = (key) => key.trim().toLowerCase().replace(/\s+/g, '_');

    const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
    const VALID_STATUSES = ['draft', 'ready', 'deprecated'];

    const stmt = db.prepare(
      `INSERT INTO test_cases (title, description, steps, expected_result, module, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const inserted = [];
    const errors = [];

    const insertAll = db.transaction(() => {
      rows.forEach((raw, i) => {
        const row = {};
        Object.entries(raw).forEach(([k, v]) => { row[normalize(k)] = v; });

        const title = (row.title || '').toString().trim();
        if (!title) {
          errors.push({ row: i + 2, error: 'Missing title' });
          return;
        }

        const priority = (row.priority || 'medium').toString().trim().toLowerCase();
        const status = (row.status || 'draft').toString().trim().toLowerCase();

        const result = stmt.run(
          title,
          (row.description || '').toString() || null,
          (row.steps || '').toString() || null,
          (row.expected_result || '').toString() || null,
          (row.module || '').toString() || null,
          VALID_PRIORITIES.includes(priority) ? priority : 'medium',
          VALID_STATUSES.includes(status) ? status : 'draft'
        );

        inserted.push(result.lastInsertRowid);
      });
    });

    insertAll();

    res.json({
      imported: inserted.length,
      errors,
      total_rows: rows.length,
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
  }
});

// GET /api/test-cases/:id/executions — execution history for a test case
router.get('/:id/executions', (req, res) => {
  const executions = db.prepare(`
    SELECT r.status, r.notes, r.executed_at,
           tr.id as run_id, tr.name as run_name, tr.date as run_date,
           tm.name as executed_by_name
    FROM test_results r
    JOIN test_runs tr ON r.test_run_id = tr.id
    LEFT JOIN team_members tm ON r.executed_by = tm.id
    WHERE r.test_case_id = ?
    ORDER BY r.executed_at DESC
  `).all(req.params.id);
  res.json(executions);
});

// GET /api/test-cases/:id
router.get('/:id', (req, res) => {
  const testCase = db.prepare(`
    SELECT tc.*, tm.name as created_by_name, p.name as project_name
    FROM test_cases tc
    LEFT JOIN team_members tm ON tc.created_by = tm.id
    LEFT JOIN projects p ON tc.project_id = p.id
    WHERE tc.id = ?
  `).get(req.params.id);

  if (!testCase) {
    return res.status(404).json({ error: 'Test case not found' });
  }
  res.json(testCase);
});

// POST /api/test-cases
router.post('/', (req, res) => {
  const { title, description, steps, expected_result, module, priority, status, created_by } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const stmt = db.prepare(
    `INSERT INTO test_cases (title, description, steps, expected_result, module, priority, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    title.trim(),
    description || null,
    steps || null,
    expected_result || null,
    module || null,
    priority || 'medium',
    status || 'draft',
    created_by || null
  );

  const testCase = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(testCase);
});

// PUT /api/test-cases/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Test case not found' });
  }

  const { title, description, steps, expected_result, module, priority, status, created_by } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.prepare(
    `UPDATE test_cases SET title = ?, description = ?, steps = ?, expected_result = ?, module = ?, priority = ?, status = ?, created_by = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title.trim(),
    description || null,
    steps || null,
    expected_result || null,
    module || null,
    priority || 'medium',
    status || 'draft',
    created_by || null,
    id
  );

  const testCase = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
  res.json(testCase);
});

// DELETE /api/test-cases/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Test case not found' });
  }

  // Check for references in test_results
  const refCount = db.prepare('SELECT COUNT(*) as count FROM test_results WHERE test_case_id = ?').get(id).count;
  if (refCount > 0) {
    return res.status(409).json({ error: 'Cannot delete: test case has execution results' });
  }

  db.prepare('DELETE FROM test_cases WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
