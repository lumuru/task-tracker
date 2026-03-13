const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/bugs — list with optional filters
router.get('/', (req, res) => {
  const { status, severity, priority, assigned_to, module, search, test_case_id, project_id } = req.query;

  const isMember = req.user.role !== 'admin';
  let memberProjectIds = null;
  if (isMember) {
    memberProjectIds = db.prepare(
      'SELECT project_id FROM project_members WHERE member_id = ?'
    ).all(req.user.id).map(r => r.project_id);
    if (memberProjectIds.length === 0) {
      return res.json([]);
    }
  }

  let sql = `
    SELECT b.*,
      assignee.name as assigned_to_name,
      reporter.name as reported_by_name,
      tc.title as test_case_title,
      p.name as project_name
    FROM bugs b
    LEFT JOIN team_members assignee ON b.assigned_to = assignee.id
    LEFT JOIN team_members reporter ON b.reported_by = reporter.id
    LEFT JOIN test_cases tc ON b.test_case_id = tc.id
    LEFT JOIN projects p ON b.project_id = p.id
  `;
  const conditions = [];
  const params = [];

  if (isMember) {
    conditions.push(`b.project_id IN (${memberProjectIds.map(() => '?').join(', ')})`);
    params.push(...memberProjectIds);
  }

  if (status) {
    conditions.push('b.status = ?');
    params.push(status);
  }
  if (severity) {
    conditions.push('b.severity = ?');
    params.push(severity);
  }
  if (priority) {
    conditions.push('b.priority = ?');
    params.push(priority);
  }
  if (assigned_to) {
    conditions.push('b.assigned_to = ?');
    params.push(assigned_to);
  }
  if (module) {
    conditions.push('b.module = ?');
    params.push(module);
  }
  if (search) {
    conditions.push('(b.title LIKE ? OR b.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (test_case_id) {
    conditions.push('b.test_case_id = ?');
    params.push(test_case_id);
  }
  if (project_id) {
    conditions.push('b.project_id = ?');
    params.push(project_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY b.updated_at DESC';

  const bugs = db.prepare(sql).all(...params);
  res.json(bugs);
});

// GET /api/bugs/modules — distinct module values
router.get('/modules', (req, res) => {
  const modules = db.prepare("SELECT DISTINCT module FROM bugs WHERE module IS NOT NULL AND module != '' ORDER BY module").all();
  res.json(modules.map(m => m.module));
});

// GET /api/bugs/:id
router.get('/:id', (req, res) => {
  const bug = db.prepare(`
    SELECT b.*,
      assignee.name as assigned_to_name,
      reporter.name as reported_by_name,
      tc.title as test_case_title,
      p.name as project_name
    FROM bugs b
    LEFT JOIN team_members assignee ON b.assigned_to = assignee.id
    LEFT JOIN team_members reporter ON b.reported_by = reporter.id
    LEFT JOIN test_cases tc ON b.test_case_id = tc.id
    LEFT JOIN projects p ON b.project_id = p.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!bug) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  const isMember = req.user.role !== 'admin';
  if (isMember) {
    const memberProjectIds = db.prepare(
      'SELECT project_id FROM project_members WHERE member_id = ?'
    ).all(req.user.id).map(r => r.project_id);
    if (!memberProjectIds.includes(bug.project_id)) {
      return res.status(404).json({ error: 'Bug not found' });
    }
  }

  res.json(bug);
});

// POST /api/bugs
router.post('/', (req, res) => {
  const { title, description, steps_to_reproduce, severity, priority, status, module, assigned_to, reported_by, test_case_id, project_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare(
    `INSERT INTO bugs (title, description, steps_to_reproduce, severity, priority, status, module, assigned_to, reported_by, test_case_id, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    title.trim(),
    description || null,
    steps_to_reproduce || null,
    severity || 'medium',
    priority || 'P2',
    status || 'new',
    module || null,
    assigned_to || null,
    reported_by || null,
    test_case_id || null,
    project_id || null
  );

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(bug);
});

// PUT /api/bugs/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  const { title, description, steps_to_reproduce, severity, priority, status, module, assigned_to, reported_by, test_case_id, project_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.prepare(
    `UPDATE bugs SET title = ?, description = ?, steps_to_reproduce = ?, severity = ?, priority = ?, status = ?, module = ?, assigned_to = ?, reported_by = ?, test_case_id = ?, project_id = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title.trim(),
    description || null,
    steps_to_reproduce || null,
    severity || 'medium',
    priority || 'P2',
    status || 'new',
    module || null,
    assigned_to || null,
    reported_by || null,
    test_case_id || null,
    project_id || null,
    id
  );

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  res.json(bug);
});

// DELETE /api/bugs/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  db.prepare('DELETE FROM bugs WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
