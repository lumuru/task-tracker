const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/members — list all team members (exclude password_hash)
router.get('/', (req, res) => {
  const members = db.prepare(
    'SELECT id, name, role, email, is_active, last_login, created_at FROM team_members ORDER BY created_at DESC'
  ).all();
  res.json(members.map(m => ({ ...m, is_active: !!m.is_active })));
});

// POST /api/members — create a new member (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { name, role, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const validRoles = ['admin', 'member'];
  const memberRole = validRoles.includes(role) ? role : 'member';

  // Check email uniqueness
  const existing = db.prepare('SELECT id FROM team_members WHERE email = ?').get(email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(
    'INSERT INTO team_members (name, role, email, password_hash, is_active, must_change_password) VALUES (?, ?, ?, ?, 1, 1)'
  );
  const result = stmt.run(name.trim(), memberRole, email.trim().toLowerCase(), hash);

  const member = db.prepare(
    'SELECT id, name, role, email, is_active, last_login, created_at FROM team_members WHERE id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json({ ...member, is_active: !!member.is_active });
});

// PUT /api/members/:id — update a member (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, role, email, password, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const validRoles = ['admin', 'member'];
  const memberRole = validRoles.includes(role) ? role : existing.role;

  // Check email uniqueness if changing
  const newEmail = email ? email.trim().toLowerCase() : existing.email;
  if (newEmail !== existing.email) {
    const dup = db.prepare('SELECT id FROM team_members WHERE email = ? AND id != ?').get(newEmail, id);
    if (dup) {
      return res.status(409).json({ error: 'Email already in use' });
    }
  }

  // Update password if provided
  let hash = existing.password_hash;
  if (password && password.length >= 6) {
    hash = bcrypt.hashSync(password, 10);
  }

  const active = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

  db.prepare(
    'UPDATE team_members SET name = ?, role = ?, email = ?, password_hash = ?, is_active = ? WHERE id = ?'
  ).run(name.trim(), memberRole, newEmail, hash, active, id);

  const member = db.prepare(
    'SELECT id, name, role, email, is_active, last_login, created_at FROM team_members WHERE id = ?'
  ).get(id);
  res.json({ ...member, is_active: !!member.is_active });
});

// DELETE /api/members/:id — delete a member (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM team_members WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Prevent deleting yourself
  if (req.user && req.user.id === parseInt(id)) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  // Check for references in other tables
  const refs = [
    db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE created_by = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM test_runs WHERE created_by = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM test_results WHERE executed_by = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM bugs WHERE assigned_to = ? OR reported_by = ?').get(id, id),
    db.prepare('SELECT COUNT(*) as count FROM project_members WHERE member_id = ?').get(id),
    db.prepare('SELECT COUNT(*) as count FROM projects WHERE created_by = ?').get(id),
  ];

  const totalRefs = refs.reduce((sum, r) => sum + r.count, 0);
  if (totalRefs > 0) {
    const reasons = [];
    if (refs[4].count > 0) reasons.push('assigned to a project');
    if (refs[5].count > 0) reasons.push('created a project');
    if (refs[0].count > 0) reasons.push('created test scripts');
    if (refs[1].count > 0) reasons.push('created test runs');
    if (refs[2].count > 0) reasons.push('has test execution results');
    if (refs[3].count > 0) reasons.push('linked to bugs');

    return res.status(409).json({
      error: `Cannot delete member: ${reasons.join(', ')}`,
    });
  }

  db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
  res.status(204).end();
});

module.exports = router;
