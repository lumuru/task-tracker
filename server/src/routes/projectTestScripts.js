const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db/database');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router({ mergeParams: true });

// Helper: check if a member belongs to a project
function isProjectMember(projectId, memberId) {
  return !!db.prepare(
    'SELECT 1 FROM project_members WHERE project_id = ? AND member_id = ?'
  ).get(projectId, memberId);
}

// Helper: verify project exists, return project or null
function getProject(projectId) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
}

// GET /api/projects/:projectId/test-scripts — list test scripts for a project
router.get('/', (req, res) => {
  const { projectId } = req.params;

  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { module, priority, status, search } = req.query;

  let sql = `
    SELECT tc.*, tm.name as created_by_name
    FROM test_cases tc
    LEFT JOIN team_members tm ON tc.created_by = tm.id
    WHERE tc.project_id = ?
  `;
  const params = [projectId];

  if (module) {
    sql += ' AND tc.module = ?';
    params.push(module);
  }
  if (priority) {
    sql += ' AND tc.priority = ?';
    params.push(priority);
  }
  if (status) {
    sql += ' AND tc.status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (tc.title LIKE ? OR tc.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY tc.updated_at DESC';

  const testScripts = db.prepare(sql).all(...params);
  res.json(testScripts);
});

// GET /api/projects/:projectId/test-scripts/modules — distinct modules in project
router.get('/modules', (req, res) => {
  const { projectId } = req.params;

  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const modules = db.prepare(
    "SELECT DISTINCT module FROM test_cases WHERE project_id = ? AND module IS NOT NULL AND module != '' ORDER BY module"
  ).all(projectId);
  res.json(modules.map(m => m.module));
});

// GET /api/projects/:projectId/test-scripts/export — download as Excel
router.get('/export', (req, res) => {
  const { projectId } = req.params;

  const project = getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const testScripts = db.prepare(`
    SELECT id, module, title, steps, expected_result
    FROM test_cases
    WHERE project_id = ?
    ORDER BY module, id
  `).all(projectId);

  const rows = testScripts.map(ts => ({
    'Test Case ID': ts.id,
    'Test Scenario': ts.module || '',
    'Test Case': ts.title,
    'Test Steps': ts.steps || '',
    'Expected Result': ts.expected_result || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 },  // Test Case ID
    { wch: 20 },  // Test Scenario
    { wch: 35 },  // Test Case
    { wch: 45 },  // Test Steps
    { wch: 35 },  // Expected Result
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Scripts');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const filename = `Test Scripts - ${project.name}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// GET /api/projects/:projectId/test-scripts/:id — get single test script
router.get('/:id', (req, res) => {
  const { projectId, id } = req.params;

  const testScript = db.prepare(`
    SELECT tc.*, tm.name as created_by_name
    FROM test_cases tc
    LEFT JOIN team_members tm ON tc.created_by = tm.id
    WHERE tc.id = ? AND tc.project_id = ?
  `).get(id, projectId);

  if (!testScript) {
    return res.status(404).json({ error: 'Test script not found in this project' });
  }

  res.json(testScript);
});

// POST /api/projects/:projectId/test-scripts — create test script
router.post('/', (req, res) => {
  const { projectId } = req.params;

  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { title, description, steps, expected_result, module, priority, status, created_by } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (!created_by) {
    return res.status(400).json({ error: 'Created by is required' });
  }

  if (!isProjectMember(projectId, created_by)) {
    return res.status(403).json({ error: 'Only members assigned to this project can create test scripts' });
  }

  const stmt = db.prepare(
    `INSERT INTO test_cases (project_id, title, description, steps, expected_result, module, priority, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    projectId,
    title.trim(),
    description || null,
    steps || null,
    expected_result || null,
    module || null,
    priority || 'medium',
    status || 'draft',
    created_by
  );

  const testScript = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(testScript);
});

// PUT /api/projects/:projectId/test-scripts/:id — update test script
router.put('/:id', (req, res) => {
  const { projectId, id } = req.params;

  const existing = db.prepare(
    'SELECT * FROM test_cases WHERE id = ? AND project_id = ?'
  ).get(id, projectId);

  if (!existing) {
    return res.status(404).json({ error: 'Test script not found in this project' });
  }

  const { title, description, steps, expected_result, module, priority, status, updated_by } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (updated_by && !isProjectMember(projectId, updated_by)) {
    return res.status(403).json({ error: 'Only members assigned to this project can edit test scripts' });
  }

  db.prepare(
    `UPDATE test_cases SET title = ?, description = ?, steps = ?, expected_result = ?, module = ?, priority = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title.trim(),
    description || null,
    steps || null,
    expected_result || null,
    module || null,
    priority || 'medium',
    status || 'draft',
    id
  );

  const testScript = db.prepare(`
    SELECT tc.*, tm.name as created_by_name
    FROM test_cases tc
    LEFT JOIN team_members tm ON tc.created_by = tm.id
    WHERE tc.id = ?
  `).get(id);
  res.json(testScript);
});

// DELETE /api/projects/:projectId/test-scripts/:id — delete test script
router.delete('/:id', (req, res) => {
  const { projectId, id } = req.params;
  const { member_id } = req.query;

  const existing = db.prepare(
    'SELECT * FROM test_cases WHERE id = ? AND project_id = ?'
  ).get(id, projectId);

  if (!existing) {
    return res.status(404).json({ error: 'Test script not found in this project' });
  }

  if (member_id && !isProjectMember(projectId, member_id)) {
    return res.status(403).json({ error: 'Only members assigned to this project can delete test scripts' });
  }

  // Check for references in test_results
  const refCount = db.prepare('SELECT COUNT(*) as count FROM test_results WHERE test_case_id = ?').get(id).count;
  if (refCount > 0) {
    return res.status(409).json({ error: 'Cannot delete: test script has execution results' });
  }

  db.prepare('DELETE FROM test_cases WHERE id = ?').run(id);
  res.status(204).end();
});

// POST /api/projects/:projectId/test-scripts/upload — bulk import from Excel
router.post('/upload', upload.single('file'), (req, res) => {
  const { projectId } = req.params;

  if (!getProject(projectId)) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const created_by = req.body.created_by ? Number(req.body.created_by) : null;
  if (created_by && !isProjectMember(projectId, created_by)) {
    return res.status(403).json({ error: 'Only project members can import test scripts' });
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

    const normalize = (key) => key.trim().toLowerCase().replace(/\s+/g, '_');
    const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
    const VALID_STATUSES = ['draft', 'ready', 'deprecated'];

    const stmt = db.prepare(
      `INSERT INTO test_cases (project_id, title, description, steps, expected_result, module, priority, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          projectId,
          title,
          (row.description || '').toString() || null,
          (row.steps || '').toString() || null,
          (row.expected_result || '').toString() || null,
          (row.module || '').toString() || null,
          VALID_PRIORITIES.includes(priority) ? priority : 'medium',
          VALID_STATUSES.includes(status) ? status : 'draft',
          created_by
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

module.exports = router;
