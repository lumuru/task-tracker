const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/projects — list all projects with member count and test script count
router.get('/', (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT p.*,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
      (SELECT COUNT(*) FROM test_cases WHERE project_id = p.id) AS test_script_count,
      (SELECT name FROM team_members WHERE id = p.created_by) AS created_by_name,
      (SELECT name FROM projects WHERE id = p.parent_id) AS parent_name,
      (SELECT COUNT(*) FROM projects c WHERE c.parent_id = p.id) AS sub_project_count
    FROM projects p
  `;
  const params = [];
  if (status && ['active', 'archived'].includes(status)) {
    sql += ' WHERE p.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY p.created_at DESC';
  const projects = db.prepare(sql).all(...params);
  res.json(projects);
});

// GET /api/projects/:id — get project detail with members list
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const project = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM test_cases WHERE project_id = p.id) AS test_script_count,
      (SELECT name FROM team_members WHERE id = p.created_by) AS created_by_name,
      (SELECT name FROM projects WHERE id = p.parent_id) AS parent_name
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

  // Open defects for this project
  const openDefects = db.prepare(`
    SELECT COUNT(*) as count FROM bugs
    WHERE project_id = ?
      AND status NOT IN ('verified', 'closed')
  `).get(id).count;

  // Latest pass rate
  const latestRunResult = db.prepare(`
    SELECT tr.id FROM test_runs tr
    WHERE EXISTS (
      SELECT 1 FROM test_results r
      JOIN test_cases tc ON r.test_case_id = tc.id
      WHERE r.test_run_id = tr.id AND tc.project_id = ?
    )
    ORDER BY tr.created_at DESC LIMIT 1
  `).get(id);

  let latestPassRate = null;
  if (latestRunResult) {
    const rc = db.prepare(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN r.status = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_results r
      JOIN test_cases tc ON r.test_case_id = tc.id
      WHERE r.test_run_id = ? AND tc.project_id = ?
    `).get(latestRunResult.id, id);
    const executed = rc.total - (rc.pending || 0);
    latestPassRate = executed > 0 ? Math.round((rc.passed / executed) * 100) : null;
  }

  // Sub-projects for this project
  const subProjects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM test_cases WHERE project_id = p.id) AS test_script_count,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count
    FROM projects p
    WHERE p.parent_id = ?
    ORDER BY p.name
  `).all(id);

  res.json({ ...project, members, open_defects: openDefects, latest_pass_rate: latestPassRate, sub_projects: subProjects });
});

// POST /api/projects — create project
router.post('/', (req, res) => {
  const { name, description, status, priority, created_by, member_ids, parent_id } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Validate parent_id if provided
  if (parent_id) {
    const parent = db.prepare('SELECT id, parent_id FROM projects WHERE id = ?').get(parent_id);
    if (!parent) {
      return res.status(400).json({ error: 'Parent project not found' });
    }
    if (parent.parent_id) {
      return res.status(400).json({ error: 'Cannot nest under a sub-project. Only one level of nesting is allowed.' });
    }
  }

  const stmt = db.prepare(
    'INSERT INTO projects (name, description, status, priority, created_by, parent_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name.trim(), description || null, status || 'active', priority || 'medium', created_by || null, parent_id || null);
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
  const { name, description, status, priority } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.prepare(
    "UPDATE projects SET name = ?, description = ?, status = ?, priority = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name.trim(), description || null, status || 'active', priority || 'medium', id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json(project);
});

// GET /api/projects/:id/delete-summary — preview what will be deleted
router.get('/:id/delete-summary', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const testScripts = db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE project_id = ?').get(id).count;
  const testCaseIds = db.prepare('SELECT id FROM test_cases WHERE project_id = ?').all(id).map(r => r.id);

  let testResults = 0;
  let bugs = 0;
  if (testCaseIds.length > 0) {
    const placeholders = testCaseIds.map(() => '?').join(',');
    testResults = db.prepare(`SELECT COUNT(*) as count FROM test_results WHERE test_case_id IN (${placeholders})`).get(...testCaseIds).count;
    bugs = db.prepare(`SELECT COUNT(*) as count FROM bugs WHERE project_id = ? OR test_case_id IN (${placeholders})`).get(id, ...testCaseIds).count;
  } else {
    bugs = db.prepare('SELECT COUNT(*) as count FROM bugs WHERE project_id = ?').get(id).count;
  }

  const subProjects = db.prepare('SELECT COUNT(*) as count FROM projects WHERE parent_id = ?').get(id).count;
  const members = db.prepare('SELECT COUNT(*) as count FROM project_members WHERE project_id = ?').get(id).count;

  res.json({ testScripts, testResults, bugs, subProjects, members });
});

// DELETE /api/projects/:id — delete project and all associated data
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const subProjects = db.prepare(
    'SELECT COUNT(*) as count FROM projects WHERE parent_id = ?'
  ).get(id);

  if (subProjects.count > 0) {
    return res.status(409).json({
      error: 'Cannot delete project: it has sub-projects. Delete or reassign them first.',
    });
  }

  const cascadeDelete = db.transaction(() => {
    const testCaseIds = db.prepare('SELECT id FROM test_cases WHERE project_id = ?').all(id).map(r => r.id);

    if (testCaseIds.length > 0) {
      const placeholders = testCaseIds.map(() => '?').join(',');
      // Delete test results referencing these test cases
      db.prepare(`DELETE FROM test_results WHERE test_case_id IN (${placeholders})`).run(...testCaseIds);
      // Unlink bugs from test cases (keep the bugs but clear the reference)
      db.prepare(`UPDATE bugs SET test_case_id = NULL WHERE test_case_id IN (${placeholders})`).run(...testCaseIds);
    }

    // Delete bugs scoped to this project
    db.prepare('DELETE FROM bugs WHERE project_id = ?').run(id);
    // Delete test cases
    db.prepare('DELETE FROM test_cases WHERE project_id = ?').run(id);
    // Delete project members
    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(id);
    // Delete AI generation logs
    db.prepare('DELETE FROM ai_generation_logs WHERE project_id = ?').run(id);
    // Delete the project
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });

  cascadeDelete();
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

// GET /api/projects/:id/activity — recent bugs and test results for this project
router.get('/:id/activity', (req, res) => {
  const { id } = req.params;

  const recentBugs = db.prepare(`
    SELECT b.id, b.title, b.status, b.severity, b.created_at,
           reporter.name as reported_by_name
    FROM bugs b
    LEFT JOIN team_members reporter ON b.reported_by = reporter.id
    WHERE b.project_id = ?
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all(id);

  const recentResults = db.prepare(`
    SELECT r.status, r.executed_at, r.notes,
           tc.id as test_case_id, tc.title as test_case_title,
           tr.id as test_run_id, tr.name as test_run_name,
           tm.name as executed_by_name
    FROM test_results r
    JOIN test_cases tc ON r.test_case_id = tc.id
    JOIN test_runs tr ON r.test_run_id = tr.id
    LEFT JOIN team_members tm ON r.executed_by = tm.id
    WHERE tc.project_id = ? AND r.status != 'pending'
    ORDER BY r.executed_at DESC
    LIMIT 10
  `).all(id);

  res.json({ recent_bugs: recentBugs, recent_results: recentResults });
});

module.exports = router;
