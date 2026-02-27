import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || '';

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/api/dashboard/stats`).then(r => r.json()),
      fetch(`${BASE_URL}/api/dashboard/activity`).then(r => r.json()),
    ])
      .then(([s, a]) => { setStats(s); setActivity(a); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!stats) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/test-cases" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Test Cases</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.test_cases}</p>
        </Link>
        <Link to="/bugs" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Open Bugs</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{stats.bugs.open}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.bugs.closed} closed &middot; {stats.bugs.total} total</p>
        </Link>
        <Link to="/test-runs" className="p-5 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-sm text-gray-500">Test Runs</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{stats.test_runs}</p>
        </Link>
        <div className="p-5 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Latest Run Pass Rate</p>
          {stats.latest_run ? (
            <>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.latest_run.pass_rate}%</p>
              <Link to={`/test-runs/${stats.latest_run.id}`} className="text-xs text-blue-500 hover:text-blue-700 mt-1 inline-block">
                {stats.latest_run.name}
              </Link>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-300 mt-1">—</p>
          )}
        </div>
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
                  <span className={`ml-2 shrink-0 inline-block px-2 py-0.5 text-xs font-medium rounded capitalize ${
                    severityColors[bug.severity] ? severityColors[bug.severity].replace('bg-', 'bg-').replace('500', '100') + ' ' + severityColors[bug.severity].replace('bg-', 'text-').replace('500', '800') : 'bg-gray-100 text-gray-600'
                  }`}>
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
                    <Link to={`/test-cases/${r.test_case_id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium truncate block">
                      {r.test_case_title}
                    </Link>
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
