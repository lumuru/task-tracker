const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/projects — list all projects with member count and test script count
router.get('/', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
      (SELECT COUNT(*) FROM test_cases WHERE module = p.name) AS test_script_count,
      (SELECT name FROM team_members WHERE id = p.created_by) AS created_by_name
    FROM projects p
    ORDER BY p.created_at DESC
  `).all();
  res.json(projects);
});

// GET /api/projects/:id — get project detail with members list
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const project = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM test_cases WHERE module = p.name) AS test_script_count,
      (SELECT name FROM team_members WHERE id = p.created_by) AS created_by_name
    FROM projects p WHERE p.id = ?
  `).get(id);

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const members = db.prepare(`
    SELECT tm.*, pm.assigned_at
    FROM project_members pm
    JOIN team_members tm ON tm.id = pm.member_id
    WHERE pm.project_id = ?
    ORDER BY pm.assigned_at DESC
  `).all(id);

  res.json({ ...project, members });
});

// POST /api/projects — create project
router.post('/', (req, res) => {
  const { name, description, status, created_by, member_ids } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const stmt = db.prepare(
    'INSERT INTO projects (name, description, status, created_by) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(name.trim(), description || null, status || 'active', created_by || null);
  const projectId = result.lastInsertRowid;

  if (member_ids && member_ids.length > 0) {
    const insertMember = db.prepare(
      'INSERT OR IGNORE INTO project_members (project_id, member_id) VALUES (?, ?)'
    );
    for (const memberId of member_ids) {
      insertMember.run(projectId, memberId);
    }
  }

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.status(201).json(project);
});

// PUT /api/projects/:id — update project
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.prepare(
    "UPDATE projects SET name = ?, description = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name.trim(), description || null, status || 'active', id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json(project);
});

// DELETE /api/projects/:id — delete project (only if no test scripts exist)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const testScripts = db.prepare(
    'SELECT COUNT(*) as count FROM test_cases WHERE module = ?'
  ).get(existing.name);

  if (testScripts.count > 0) {
    return res.status(409).json({
      error: 'Cannot delete project: it has associated test scripts',
    });
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.status(204).end();
});

// GET /api/projects/:id/members — list project members
router.get('/:id/members', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const members = db.prepare(`
    SELECT tm.*, pm.assigned_at
    FROM project_members pm
    JOIN team_members tm ON tm.id = pm.member_id
    WHERE pm.project_id = ?
    ORDER BY pm.assigned_at DESC
  `).all(id);

  res.json(members);
});

// POST /api/projects/:id/members — assign members
router.post('/:id/members', (req, res) => {
  const { id } = req.params;
  const { member_ids } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
    return res.status(400).json({ error: 'member_ids array is required' });
  }

  const insertMember = db.prepare(
    'INSERT OR IGNORE INTO project_members (project_id, member_id) VALUES (?, ?)'
  );
  for (const memberId of member_ids) {
    insertMember.run(id, memberId);
  }

  const members = db.prepare(`
    SELECT tm.*, pm.assigned_at
    FROM project_members pm
    JOIN team_members tm ON tm.id = pm.member_id
    WHERE pm.project_id = ?
    ORDER BY pm.assigned_at DESC
  `).all(id);

  res.json(members);
});

// DELETE /api/projects/:id/members/:memberId — remove member from project
router.delete('/:id/members/:memberId', (req, res) => {
  const { id, memberId } = req.params;

  const existing = db.prepare(
    'SELECT * FROM project_members WHERE project_id = ? AND member_id = ?'
  ).get(id, memberId);

  if (!existing) {
    return res.status(404).json({ error: 'Member assignment not found' });
  }

  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND member_id = ?'
  ).run(id, memberId);

  res.status(204).end();
});

module.exports = router;
