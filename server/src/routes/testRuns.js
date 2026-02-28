const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/test-runs — list all runs with summary counts
router.get('/', (req, res) => {
  const runs = db.prepare(`
    SELECT tr.*, tm.name as created_by_name, p.name as project_name,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id) as total,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'pass') as passed,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'fail') as failed,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'blocked') as blocked,
      (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'skipped') as skipped
    FROM test_runs tr
    LEFT JOIN team_members tm ON tr.created_by = tm.id
    LEFT JOIN projects p ON tr.project_id = p.id
    ORDER BY tr.created_at DESC
  `).all();
  res.json(runs);
});

// GET /api/test-runs/:id — single run with its results
router.get('/:id', (req, res) => {
  const run = db.prepare(`
    SELECT tr.*, tm.name as created_by_name
    FROM test_runs tr
    LEFT JOIN team_members tm ON tr.created_by = tm.id
    WHERE tr.id = ?
  `).get(req.params.id);

  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }

  const results = db.prepare(`
    SELECT r.*, tc.title as test_case_title, tc.module, tc.priority,
           tm.name as executed_by_name
    FROM test_results r
    JOIN test_cases tc ON r.test_case_id = tc.id
    LEFT JOIN team_members tm ON r.executed_by = tm.id
    WHERE r.test_run_id = ?
    ORDER BY tc.module, tc.title
  `).all(req.params.id);

  res.json({ ...run, results });
});

// POST /api/test-runs — create a new run with linked test cases
router.post('/', (req, res) => {
  const { name, environment, date, created_by, project_id, test_case_ids } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!test_case_ids || test_case_ids.length === 0) {
    return res.status(400).json({ error: 'At least one test case must be selected' });
  }

  const create = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO test_runs (name, environment, date, created_by, project_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name.trim(), environment || null, date || null, created_by || null, project_id || null);

    const runId = result.lastInsertRowid;

    const insertResult = db.prepare(
      'INSERT INTO test_results (test_run_id, test_case_id, status) VALUES (?, ?, ?)'
    );
    for (const tcId of test_case_ids) {
      insertResult.run(runId, tcId, 'pending');
    }

    return runId;
  });

  const runId = create();
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(runId);
  res.status(201).json(run);
});

// PUT /api/test-runs/:id/results — bulk update results
router.put('/:id/results', (req, res) => {
  const { id } = req.params;
  const { results, executed_by } = req.body;

  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(id);
  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }

  if (!results || !Array.isArray(results)) {
    return res.status(400).json({ error: 'Results array is required' });
  }

  const update = db.transaction(() => {
    const stmt = db.prepare(`
      UPDATE test_results
      SET status = ?, notes = ?, executed_by = ?, executed_at = datetime('now')
      WHERE test_run_id = ? AND test_case_id = ?
    `);

    for (const r of results) {
      stmt.run(
        r.status || 'pending',
        r.notes || null,
        executed_by || null,
        id,
        r.test_case_id
      );
    }
  });

  update();
  res.json({ updated: results.length });
});

// GET /api/test-runs/:id/summary
router.get('/:id/summary', (req, res) => {
  const run = db.prepare('SELECT * FROM test_runs WHERE id = ?').get(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Test run not found' });
  }

  const counts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
      SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM test_results WHERE test_run_id = ?
  `).get(req.params.id);

  const executed = counts.total - (counts.pending || 0);
  res.json({
    ...counts,
    executed,
    pass_rate: executed > 0 ? Math.round((counts.passed / executed) * 100) : 0,
  });
});

module.exports = router;
