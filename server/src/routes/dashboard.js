const express = require('express');
const db = require('../db/database');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  const totalTestCases = db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count;
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM team_members WHERE is_active = 1").get().count;

  const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get().count;

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

  // Average pass rate across all runs
  const allRuns = db.prepare('SELECT id FROM test_runs').all();
  let avgPassRate = 0;
  if (allRuns.length > 0) {
    let totalRate = 0;
    let runsWithResults = 0;
    for (const run of allRuns) {
      const rc = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM test_results WHERE test_run_id = ?
      `).get(run.id);
      const executed = rc.total - (rc.pending || 0);
      if (executed > 0) {
        totalRate += Math.round((rc.passed / executed) * 100);
        runsWithResults++;
      }
    }
    avgPassRate = runsWithResults > 0 ? Math.round(totalRate / runsWithResults) : 0;
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

  // Status breakdown
  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM test_cases
    GROUP BY status
    ORDER BY CASE status
      WHEN 'draft' THEN 1
      WHEN 'ready' THEN 2
      WHEN 'deprecated' THEN 3
      ELSE 4
    END
  `).all();

  // Priority breakdown
  const priorityBreakdown = db.prepare(`
    SELECT priority, COUNT(*) as count
    FROM test_cases
    GROUP BY priority
    ORDER BY CASE priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
      ELSE 5
    END
  `).all();

  res.json({
    total_projects: totalProjects,
    active_projects: activeProjects,
    test_cases: totalTestCases,
    total_users: totalUsers,
    bugs: bugCounts,
    test_runs: totalTestRuns,
    latest_run: latestRunStats,
    avg_pass_rate: avgPassRate,
    bugs_by_severity: bugsBySeverity,
    status_breakdown: statusBreakdown,
    priority_breakdown: priorityBreakdown,
  });
});

// GET /api/dashboard/project-summary
router.get('/project-summary', (req, res) => {
  const projects = db.prepare(`
    SELECT p.id, p.name, p.status,
      (SELECT COUNT(*) FROM test_cases WHERE project_id = p.id) as test_case_count
    FROM projects p
    ORDER BY p.status ASC, p.name ASC
  `).all();

  // For each project, compute open defects and latest pass rate
  const result = projects.map(p => {
    // Open defects linked to this project's test cases
    const openDefects = db.prepare(`
      SELECT COUNT(*) as count FROM bugs
      WHERE project_id = ?
        AND status NOT IN ('verified', 'closed')
    `).get(p.id).count;

    // Latest pass rate: find the most recent test run that includes this project's test cases
    const latestRunResult = db.prepare(`
      SELECT tr.id
      FROM test_runs tr
      WHERE EXISTS (
        SELECT 1 FROM test_results r
        JOIN test_cases tc ON r.test_case_id = tc.id
        WHERE r.test_run_id = tr.id AND tc.project_id = ?
      )
      ORDER BY tr.created_at DESC
      LIMIT 1
    `).get(p.id);

    let latestPassRate = null;
    if (latestRunResult) {
      const rc = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN r.status = 'pass' THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM test_results r
        JOIN test_cases tc ON r.test_case_id = tc.id
        WHERE r.test_run_id = ? AND tc.project_id = ?
      `).get(latestRunResult.id, p.id);
      const executed = rc.total - (rc.pending || 0);
      latestPassRate = executed > 0 ? Math.round((rc.passed / executed) * 100) : null;
    }

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      test_case_count: p.test_case_count,
      open_defects: openDefects,
      latest_pass_rate: latestPassRate,
    };
  });

  res.json(result);
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

  const recentRuns = db.prepare(`
    SELECT tr.id, tr.name, tr.date, tr.environment, tr.created_at,
           p.name as project_name,
           tm.name as created_by_name,
           (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id) as total,
           (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'pass') as passed,
           (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'fail') as failed,
           (SELECT COUNT(*) FROM test_results WHERE test_run_id = tr.id AND status = 'blocked') as blocked
    FROM test_runs tr
    LEFT JOIN projects p ON tr.project_id = p.id
    LEFT JOIN team_members tm ON tr.created_by = tm.id
    ORDER BY tr.created_at DESC
    LIMIT 10
  `).all();

  res.json({
    recent_bugs: recentBugs,
    recent_runs: recentRuns,
  });
});

// GET /api/dashboard/team-assignments — members with their assigned projects
router.get('/team-assignments', (req, res) => {
  const members = db.prepare(`
    SELECT tm.id, tm.name, tm.role,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.member_id = tm.id) as project_count
    FROM team_members tm
    WHERE tm.is_active = 1
    ORDER BY tm.name
  `).all();

  const assignments = db.prepare(`
    SELECT pm.member_id, p.id as project_id, p.name as project_name, p.status as project_status
    FROM project_members pm
    JOIN projects p ON pm.project_id = p.id
    ORDER BY p.name
  `).all();

  const assignmentMap = {};
  for (const a of assignments) {
    if (!assignmentMap[a.member_id]) assignmentMap[a.member_id] = [];
    assignmentMap[a.member_id].push({ id: a.project_id, name: a.project_name, status: a.project_status });
  }

  res.json(members.map(m => ({ ...m, projects: assignmentMap[m.id] || [] })));
});

module.exports = router;
