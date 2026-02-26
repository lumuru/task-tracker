const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  const totalTestCases = db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count;

  const bugCounts = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status NOT IN ('verified', 'closed') THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status IN ('verified', 'closed') THEN 1 ELSE 0 END) as closed
    FROM bugs
  `).get();

  const totalTestRuns = db.prepare('SELECT COUNT(*) as count FROM test_runs').get().count;

  // Pass rate of latest run
  const latestRun = db.prepare('SELECT id, name FROM test_runs ORDER BY created_at DESC LIMIT 1').get();
  let latestRunStats = null;
  if (latestRun) {
    const counts = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM test_results WHERE test_run_id = ?
    `).get(latestRun.id);
    const executed = counts.total - (counts.pending || 0);
    latestRunStats = {
      id: latestRun.id,
      name: latestRun.name,
      ...counts,
      executed,
      pass_rate: executed > 0 ? Math.round((counts.passed / executed) * 100) : 0,
    };
  }

  // Open bugs by severity
  const bugsBySeverity = db.prepare(`
    SELECT severity, COUNT(*) as count
    FROM bugs
    WHERE status NOT IN ('verified', 'closed')
    GROUP BY severity
    ORDER BY CASE severity
      WHEN 'critical' THEN 1
      WHEN 'major' THEN 2
      WHEN 'minor' THEN 3
      WHEN 'trivial' THEN 4
      ELSE 5
    END
  `).all();

  res.json({
    test_cases: totalTestCases,
    bugs: bugCounts,
    test_runs: totalTestRuns,
    latest_run: latestRunStats,
    bugs_by_severity: bugsBySeverity,
  });
});

// GET /api/dashboard/activity
router.get('/activity', (req, res) => {
  const recentBugs = db.prepare(`
    SELECT b.id, b.title, b.status, b.severity, b.created_at,
           reporter.name as reported_by_name
    FROM bugs b
    LEFT JOIN team_members reporter ON b.reported_by = reporter.id
    ORDER BY b.created_at DESC
    LIMIT 10
  `).all();

  const recentResults = db.prepare(`
    SELECT r.status, r.executed_at, r.notes,
           tc.id as test_case_id, tc.title as test_case_title,
           tr.id as test_run_id, tr.name as test_run_name,
           tm.name as executed_by_name
    FROM test_results r
    JOIN test_cases tc ON r.test_case_id = tc.id
    JOIN test_runs tr ON r.test_run_id = tr.id
    LEFT JOIN team_members tm ON r.executed_by = tm.id
    WHERE r.status != 'pending'
    ORDER BY r.executed_at DESC
    LIMIT 10
  `).all();

  res.json({
    recent_bugs: recentBugs,
    recent_results: recentResults,
  });
});

module.exports = router;
