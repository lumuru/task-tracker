const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/members — list all team members
router.get('/', (req, res) => {
  const members = db.prepare('SELECT * FROM team_members ORDER BY created_at DESC').all();
  res.json(members);
});

// POST /api/members — create a new member
router.post('/', (req, res) => {
  const { name, role } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!role || !role.trim()) {
    return res.status(400).json({ error: 'Role is required' });
  }

  const stmt = db.prepare('INSERT INTO team_members (name, role) VALUES (?, ?)');
  const result = stmt.run(name.trim(), role.trim());

  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(member);
});

// PUT /api/members/:id — update a member
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, role } = req.body;

  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!role || !role.trim()) {
    return res.status(400).json({ error: 'Role is required' });
  }

  db.prepare('UPDATE team_members SET name = ?, role = ? WHERE id = ?')
    .run(name.trim(), role.trim(), id);

  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
  res.json(member);
});

// DELETE /api/members/:id — delete a member (with reference check)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Check for references in other tables
  const refs = [
    db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE created_by = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM test_runs WHERE created_by = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM test_results WHERE executed_by = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM bugs WHERE assigned_to = ? OR reported_by = ?').get(id, id),
    db.prepare('SELECT COUNT(*) as count FROM project_members WHERE member_id = ?').get(id),
  ];

  const totalRefs = refs.reduce((sum, r) => sum + r.count, 0);
  if (totalRefs > 0) {
    return res.status(409).json({
      error: 'Cannot delete member: they are referenced by other records',
    });
  }

  db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
