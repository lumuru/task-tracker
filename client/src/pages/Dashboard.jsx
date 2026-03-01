import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authFetch } from '../api/base';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};


const severityColors = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500',
  trivial: 'bg-gray-400',
};

function passRateColor(rate) {
  if (rate === null || rate === undefined) return 'text-gray-400';
  if (rate >= 80) return 'text-green-600';
  if (rate >= 50) return 'text-yellow-600';
  return 'text-red-600';
}


export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      authFetch('/api/dashboard/stats').then(r => r.json()),
      authFetch('/api/dashboard/activity').then(r => r.json()),
      authFetch('/api/dashboard/project-summary').then(r => r.json()),
      authFetch('/api/dashboard/team-assignments').then(r => r.json()),
    ])
      .then(([s, a, p, t]) => { setStats(s); setActivity(a); setProjectSummary(p); setTeamAssignments(t); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!stats) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Link to="/projects" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total_projects}</p>
        </Link>
        <Link to="/test-cases" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Total Test Cases</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.test_cases}</p>
        </Link>
        <Link to="/projects" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Active Projects</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.active_projects}</p>
        </Link>
        <Link to="/bugs" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Open Defects</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{stats.bugs.open}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.bugs.total} total</p>
        </Link>
        <div className="p-5 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Avg Pass Rate</p>
          <p className={`text-3xl font-bold mt-1 ${passRateColor(stats.avg_pass_rate)}`}>
            {stats.avg_pass_rate > 0 ? `${stats.avg_pass_rate}%` : '\u2014'}
          </p>
        </div>
      </div>

      {/* Project Overview Table */}
      {projectSummary && projectSummary.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Project Overview</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Test Cases</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Open Defects</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Latest Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projectSummary.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/projects/${p.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-800 font-medium">{p.test_case_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded capitalize ${statusColors[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-center text-sm font-medium ${p.open_defects > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {p.open_defects}
                    </td>
                    <td className={`px-4 py-3 text-center text-sm font-bold ${passRateColor(p.latest_pass_rate)}`}>
                      {p.latest_pass_rate !== null ? `${p.latest_pass_rate}%` : '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status Breakdown */}
        {stats.status_breakdown && stats.status_breakdown.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Status Breakdown</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.status_breakdown.map(({ status, count }) => (
                    <tr key={status}>
                      <td className="px-4 py-2 text-sm text-gray-700 capitalize">{status}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 font-medium text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Priority Breakdown */}
        {stats.priority_breakdown && stats.priority_breakdown.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Priority Breakdown</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.priority_breakdown.map(({ priority, count }) => (
                    <tr key={priority}>
                      <td className="px-4 py-2 text-sm text-gray-700 capitalize">{priority}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 font-medium text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Team Assignments */}
      {teamAssignments && teamAssignments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Team Assignments</h3>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {[...teamAssignments].sort((a, b) => b.project_count - a.project_count).map((member) => (
              <div key={member.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{member.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{member.role}</span>
                  </div>
                  {member.projects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {member.projects.map((p) => (
                        <Link
                          key={p.id}
                          to={`/projects/${p.id}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full hover:opacity-80 transition-opacity ${
                            p.status === 'active'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 mt-1">No projects assigned</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 mt-1">
                  {member.project_count} project{member.project_count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Bugs by Severity */}
      {stats.bugs_by_severity.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Open Bugs by Severity</h3>
          <div className="flex gap-3">
            {stats.bugs_by_severity.map(({ severity, count }) => (
              <Link
                key={severity}
                to={`/bugs?severity=${severity}`}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:shadow-sm"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${severityColors[severity] || 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-gray-700 capitalize">{severity}</span>
                <span className="text-sm font-bold text-gray-800">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bugs */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Bugs</h3>
          {activity && activity.recent_bugs.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {activity.recent_bugs.map((bug) => (
                <div key={bug.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <Link to={`/bugs/${bug.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium truncate block">
                      {bug.title}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {bug.reported_by_name && <span>by {bug.reported_by_name} &middot; </span>}
                      {bug.created_at}
                    </p>
                  </div>
                  <span className="ml-2 shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded capitalize bg-gray-100 text-gray-700">
                    {bug.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No bugs reported yet.</p>
          )}
        </div>

        {/* Recent Test Runs */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Test Runs</h3>
          {activity && activity.recent_runs && activity.recent_runs.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {activity.recent_runs.map((run) => {
                const executed = run.passed + run.failed + run.blocked;
                const rate = executed > 0 ? Math.round((run.passed / executed) * 100) : null;
                return (
                  <div key={run.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <Link to={`/test-runs/${run.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium truncate block">
                        {run.name}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {run.project_name && <span>{run.project_name} &middot; </span>}
                        {run.date || run.created_at}
                        {run.created_by_name && <span> &middot; {run.created_by_name}</span>}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                      {run.total > 0 && (
                        <div className="flex gap-1 text-xs">
                          {run.passed > 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded">{run.passed}P</span>}
                          {run.failed > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded">{run.failed}F</span>}
                          {run.blocked > 0 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">{run.blocked}B</span>}
                        </div>
                      )}
                      {rate !== null ? (
                        <span className={`text-xs font-bold ${passRateColor(rate)}`}>{rate}%</span>
                      ) : (
                        <span className="text-xs text-gray-300">&mdash;</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No test runs yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
