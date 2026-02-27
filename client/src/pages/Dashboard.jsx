import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

const pieColors = {
  draft: '#9CA3AF',
  ready: '#3B82F6',
  deprecated: '#EF4444',
};

const barColors = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E',
};

const severityColors = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500',
  trivial: 'bg-gray-400',
};

const resultColors = {
  pass: 'text-green-700 bg-green-50',
  fail: 'text-red-700 bg-red-50',
  blocked: 'text-yellow-700 bg-yellow-50',
  skipped: 'text-gray-600 bg-gray-50',
};

function passRateColor(rate) {
  if (rate === null || rate === undefined) return 'text-gray-400';
  if (rate >= 80) return 'text-green-600';
  if (rate >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

const RADIAN = Math.PI / 180;
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
      {`${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/api/dashboard/stats`).then(r => r.json()),
      fetch(`${BASE_URL}/api/dashboard/activity`).then(r => r.json()),
      fetch(`${BASE_URL}/api/dashboard/project-summary`).then(r => r.json()),
    ])
      .then(([s, a, p]) => { setStats(s); setActivity(a); setProjectSummary(p); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!stats) return <p className="text-gray-500">Loading...</p>;

  const pieData = (stats.status_breakdown || []).map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    key: s.status,
  }));

  const barData = (stats.priority_breakdown || []).map(p => ({
    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
    count: p.count,
    key: p.priority,
  }));

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie Chart — Status Distribution */}
        {pieData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2 text-center">Test Case Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={true}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={pieColors[entry.key] || '#6B7280'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar Chart — Priority */}
        {barData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2 text-center">Test Cases by Priority</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Test Cases" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 12 }}>
                  {barData.map((entry) => (
                    <Cell key={entry.key} fill={barColors[entry.key] || '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

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

        {/* Recent Test Results */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Recent Test Executions</h3>
          {activity && activity.recent_results.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {activity.recent_results.map((r, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    {r.project_id ? (
                      <Link to={`/projects/${r.project_id}/test-scripts/${r.test_case_id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium truncate block">
                        {r.test_case_title}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium truncate block">{r.test_case_title}</span>
                    )}
                    <p className="text-xs text-gray-400">
                      in <Link to={`/test-runs/${r.test_run_id}`} className="text-blue-500 hover:text-blue-700">{r.test_run_name}</Link>
                      {r.executed_by_name && <span> by {r.executed_by_name}</span>}
                    </p>
                  </div>
                  <span className={`ml-2 shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded capitalize ${resultColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No test executions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
