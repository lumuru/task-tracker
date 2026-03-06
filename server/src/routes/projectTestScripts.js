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

// GET /api/projects/:projectId/test-scripts/export — download test scripts as Excel template
router.get('/export', (req, res) => {
  const { projectId } = req.params;
  const project = getProject(projectId);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const scripts = db.prepare(
    'SELECT * FROM test_cases WHERE project_id = ? ORDER BY id'
  ).all(projectId);

  const rows = scripts.map((tc, i) => ({
    'TEST CASE ID#': `TC${String(i + 1).padStart(2, '0')}`,
    'TEST SCENARIO': tc.module || '',
    'TEST CASE': tc.title,
    'TEST STEPS': tc.steps || '',
    'EXPECTED RESULT': tc.expected_result || '',
    'ACTUAL RESULT': '',
    'TESTER': '',
    'TEST DATE': '',
    'EXECUTED?': 'No',
    'RESULT': 'Not Started',
    'REMARKS': '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 14 },  // TEST CASE ID#
    { wch: 25 },  // TEST SCENARIO
    { wch: 35 },  // TEST CASE
    { wch: 45 },  // TEST STEPS
    { wch: 35 },  // EXPECTED RESULT
    { wch: 30 },  // ACTUAL RESULT
    { wch: 18 },  // TESTER
    { wch: 14 },  // TEST DATE
    { wch: 12 },  // EXECUTED?
    { wch: 12 },  // RESULT
    { wch: 25 },  // REMARKS
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

// PATCH /api/projects/:projectId/test-scripts/bulk-status — bulk update status
router.patch('/bulk-status', (req, res) => {
  const { projectId } = req.params;
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' });
  }

  const validStatuses = ['draft', 'ready', 'deprecated'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const placeholders = ids.map(() => '?').join(',');
  const update = db.prepare(
    `UPDATE test_cases SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders}) AND project_id = ?`
  );
  const result = update.run(status, ...ids, projectId);

  res.json({ updated: result.changes });
});

// DELETE /api/projects/:projectId/test-scripts/ai-generated — delete all AI-generated scripts
router.delete('/ai-generated', (req, res) => {
  try {
    const { projectId } = req.params;

    if (!getProject(projectId)) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get IDs of AI-generated scripts to clean up related data
    const aiScriptIds = db.prepare(
      "SELECT id FROM test_cases WHERE project_id = ? AND source = 'ai_generated'"
    ).all(projectId).map(r => r.id);

    let unlinkedBugs = 0;
    let deletedResults = 0;

    if (aiScriptIds.length > 0) {
      const placeholders = aiScriptIds.map(() => '?').join(',');

      // Unlink bugs — keep the bug but remove the test_case_id reference
      unlinkedBugs = db.prepare(
        `UPDATE bugs SET test_case_id = NULL WHERE test_case_id IN (${placeholders})`
      ).run(...aiScriptIds).changes;

      // Delete test results that reference these scripts
      deletedResults = db.prepare(
        `DELETE FROM test_results WHERE test_case_id IN (${placeholders})`
      ).run(...aiScriptIds).changes;
    }

    // Now safe to delete the test cases
    const result = db.prepare(
      "DELETE FROM test_cases WHERE project_id = ? AND source = 'ai_generated'"
    ).run(projectId);

    res.json({ deleted: result.changes, unlinkedBugs, deletedResults });
  } catch (err) {
    console.error('Delete AI scripts error:', err);
    res.status(500).json({ error: 'Failed to delete AI-generated scripts: ' + err.message });
  }
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

    // Find the best sheet: prefer one named "Test Script(s)" or similar, else first sheet
    const TEST_SHEET_PATTERN = /test.*(script|case)/i;
    const sheetName = workbook.SheetNames.find(s => TEST_SHEET_PATTERN.test(s)) || workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'Excel file has no sheets' });
    }

    const sheet = workbook.Sheets[sheetName];
    const sheetRange = XLSX.utils.decode_range(sheet['!ref']);

    // Auto-detect header row by scanning actual cells for known header patterns
    // A header row must have at least 2 matches from these keywords
    const HEADER_KEYWORDS = ['test case', 'test scenario', 'test steps', 'expected result', 'title', 'module', 'steps', 'input data'];
    let headerRowIndex = 0;
    for (let r = 0; r <= Math.min(sheetRange.e.r, 30); r++) {
      const cellValues = [];
      for (let c = 0; c <= sheetRange.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (sheet[addr]) cellValues.push((sheet[addr].v || '').toString().toLowerCase().trim());
      }
      const matchCount = cellValues.filter(v => HEADER_KEYWORDS.some(kw => v === kw || v.startsWith(kw + ' ') || v.startsWith(kw + '#'))).length;
      if (matchCount >= 2) {
        headerRowIndex = r;
        break;
      }
    }

    // Re-parse with detected header row
    const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
    console.log('[Upload] Sheet:', sheetName, '| Header row:', headerRowIndex + 1, '| Data rows:', rows.length,
      '| Columns:', rows.length > 0 ? Object.keys(rows[0]) : 'none');
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Sheet is empty' });
    }

    const normalize = (key) => key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
    const VALID_STATUSES = ['draft', 'ready', 'deprecated'];

    // Map normalized column names to canonical field names
    const FIELD_ALIASES = {
      title: 'title', test_case: 'title',
      module: 'module', test_scenario: 'module',
      steps: 'steps', test_steps: 'steps',
      expected_result: 'expected_result',
      description: 'description',
      priority: 'priority',
      status: 'status',
      input_data: 'input_data',
      preconditions: 'preconditions',
    };

    const stmt = db.prepare(
      `INSERT INTO test_cases (project_id, title, description, steps, expected_result, module, priority, status, created_by, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'imported')`
    );

    const inserted = [];
    const errors = [];

    const insertAll = db.transaction(() => {
      rows.forEach((raw, i) => {
        const row = {};
        Object.entries(raw).forEach(([k, v]) => {
          const normalized = normalize(k);
          const field = FIELD_ALIASES[normalized] || normalized;
          if (!row[field]) row[field] = v;
        });

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

// POST /api/projects/:projectId/test-scripts/batch — bulk import generated test scripts
router.post('/batch', (req, res) => {
  try {
    const { projectId } = req.params;
    const { scripts, source, usage } = req.body;

    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return res.status(400).json({ error: 'scripts array is required' });
    }

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const validSources = ['manual', 'ai_generated', 'imported'];
    const sourceValue = validSources.includes(source) ? source : 'manual';

    const stmt = db.prepare(`
      INSERT INTO test_cases (title, module, description, preconditions, steps, expected_result, priority, status, project_id, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `);

    let imported = 0;
    for (const s of scripts) {
      if (!s.title) continue;
      stmt.run(
        s.title,
        s.module || null,
        s.description || null,
        s.preconditions || null,
        s.steps || null,
        s.expected_result || null,
        s.priority || 'medium',
        projectId,
        sourceValue,
      );
      imported++;
    }

    // Update generated_at timestamp if AI-generated
    if (sourceValue === 'ai_generated' && imported > 0) {
      db.prepare("UPDATE projects SET generated_at = datetime('now') WHERE id = ?").run(projectId);

      // Log AI generation usage
      if (usage) {
        db.prepare(`
          INSERT INTO ai_generation_logs (project_id, user_id, model, prompt_tokens, completion_tokens, total_tokens, cost_estimate, scripts_generated, thinking_enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          projectId,
          req.user?.id || null,
          usage.model || 'unknown',
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0,
          usage.total_tokens || 0,
          usage.cost_estimate || 0,
          imported,
          usage.thinking_enabled ? 1 : 0,
        );
      }
    }

    res.json({ imported, total: scripts.length });
  } catch (err) {
    console.error('Batch import error:', err);
    res.status(500).json({ error: 'Failed to import scripts: ' + err.message });
  }
});

module.exports = router;
