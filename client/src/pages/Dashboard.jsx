import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch, getToken } from '../api/base';
import { Info } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const severityColors = {
  critical: '#dc2626',
  major: '#ea580c',
  minor: '#ca8a04',
  trivial: '#94a3b8',
};

const severityBadgeColors = {
  critical: 'bg-red-50 text-red-700',
  major: 'bg-orange-50 text-orange-700',
  minor: 'bg-yellow-50 text-yellow-700',
  trivial: 'bg-gray-100 text-gray-600',
};

function passRateColor(rate) {
  if (rate === null || rate === undefined) return 'text-slate-400';
  if (rate >= 80) return 'text-emerald-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function passRateBarColor(rate) {
  if (rate === null || rate === undefined) return 'bg-slate-100';
  if (rate >= 80) return 'bg-emerald-400';
  if (rate >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

function PassRateRing({ rate, totalRuns, passed, failed }) {
  const safeRate = rate ?? 0;
  const hasData = rate !== null && rate !== undefined;
  const data = [
    { value: safeRate },
    { value: 100 - safeRate },
  ];
  const ringColor = safeRate >= 80 ? '#10b981' : safeRate >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={62}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={hasData ? ringColor : '#e2e8f0'} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold tracking-tight ${passRateColor(rate)}`}>
          {hasData ? `${safeRate}%` : '\u2014'}
        </span>
      </div>
    </div>
  );
}

function BugSeverityChart({ data }) {
  const ordered = ['critical', 'major', 'minor', 'trivial'];
  const chartData = ordered
    .map((s) => {
      const found = data.find((d) => d.severity === s);
      return found ? { name: s.charAt(0).toUpperCase() + s.slice(1), count: found.count, severity: s } : null;
    })
    .filter(Boolean);

  if (chartData.length === 0) return <p className="text-sm text-slate-400 py-4">No open bugs.</p>;

  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={56}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={false}
            contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            formatter={(value) => [value, 'Bugs']}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={14}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={severityColors[entry.severity] || '#9ca3af'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const BASE_URL = import.meta.env.VITE_API_URL || '';
    const fetchFn = (url) => {
      const token = getToken();
      if (token) {
        return authFetch(url);
      }
      return fetch(`${BASE_URL}${url}`);
    };

    Promise.all([
      fetchFn('/api/dashboard/stats').then(r => r.json()),
      fetchFn('/api/dashboard/activity').then(r => r.json()),
      fetchFn('/api/dashboard/project-summary').then(r => r.json()),
    ])
      .then(([s, a, p]) => { setStats(s); setActivity(a); setProjectSummary(p); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>;
  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const latestRun = stats.latest_run;
  const totalPassed = latestRun?.passed ?? 0;
  const totalFailed = latestRun?.failed ?? 0;

  // Public view: show all projects so outside teams get full visibility
  // Authenticated users: only show projects with activity (they can navigate to /projects for the rest)
  const allProjects = projectSummary || [];
  const activeProjects = user
    ? allProjects.filter(p => p.test_case_count > 0 || p.open_defects > 0)
    : allProjects;
  const emptyProjects = user
    ? allProjects.filter(p => p.test_case_count === 0 && p.open_defects === 0)
    : [];

  // Merge recent bugs + runs into a single activity feed
  const activityFeed = [];
  if (activity) {
    activity.recent_bugs?.forEach((bug) => {
      activityFeed.push({ type: 'bug', id: bug.id, title: bug.title, date: bug.created_at, severity: bug.severity, by: bug.reported_by_name });
    });
    activity.recent_runs?.forEach((run) => {
      const executed = run.passed + run.failed + run.blocked;
      const rate = executed > 0 ? Math.round((run.passed / executed) * 100) : null;
      activityFeed.push({ type: 'run', id: run.id, title: run.name, date: run.date || run.created_at, project: run.project_name, rate, by: run.created_by_name });
    });
  }
  activityFeed.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentActivity = activityFeed.slice(0, 10);

  return (
    <div className="space-y-8">
      {!user && (
        <div className="p-3 bg-blue-50/80 border border-blue-100 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <Info size={16} className="text-blue-500 flex-shrink-0" />
          Public view. Log in to manage projects.
        </div>
      )}

      {/* Hero — pass rate + key numbers in a single card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm">
        <div className="p-6 flex flex-col sm:flex-row items-center gap-8">
          {/* Ring */}
          <div className="flex-shrink-0">
            <PassRateRing
              rate={stats.avg_pass_rate > 0 ? stats.avg_pass_rate : null}
              totalRuns={stats.test_runs}
              passed={totalPassed}
              failed={totalFailed}
            />
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4 w-full">
            <div>
              <div className="text-2xl font-bold text-slate-800">{stats.test_runs ?? 0}</div>
              <div className="text-xs text-slate-400 mt-0.5">test runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {totalPassed}
                <span className="text-sm font-normal text-slate-300 ml-1">/ {totalFailed} fail</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">passed (latest)</div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-bold ${stats.bugs?.open > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                  {stats.bugs?.open ?? 0}
                </span>
                {user && <Link to="/bugs" className="text-xs text-slate-400 hover:text-blue-500">view</Link>}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">open defects</div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-800">{stats.active_projects}</span>
                <span className="text-sm text-slate-300">/ {stats.total_projects}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">active projects</div>
            </div>
          </div>
        </div>

        {/* Severity pills inline — only if there are bugs */}
        {stats.bugs_by_severity?.length > 0 && (
          <div className="px-6 pb-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">By severity:</span>
            {stats.bugs_by_severity.map(({ severity, count }) => (
              <span
                key={severity}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${severityColors[severity]}12`, color: severityColors[severity] }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: severityColors[severity] }} />
                {count} {severity}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Project Health */}
      {activeProjects.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Project Health</h3>
            {user && (
              <Link to="/projects" className="text-xs text-slate-400 hover:text-blue-500">All projects</Link>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
            {activeProjects.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-4">
                <div className="w-48 min-w-0">
                  {user ? (
                    <Link to={`/projects/${p.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block">
                      {p.name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-800 truncate block">{p.name}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    {p.latest_pass_rate !== null && (
                      <div
                        className={`h-full rounded-full transition-all ${passRateBarColor(p.latest_pass_rate)}`}
                        style={{ width: `${p.latest_pass_rate}%` }}
                      />
                    )}
                  </div>
                  <span className={`text-xs font-semibold w-10 text-right tabular-nums ${passRateColor(p.latest_pass_rate)}`}>
                    {p.latest_pass_rate !== null ? `${p.latest_pass_rate}%` : '\u2014'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 tabular-nums">
                  <span>{p.test_case_count} tests</span>
                  {p.open_defects > 0 ? (
                    <span className="text-red-500 font-medium">{p.open_defects} bugs</span>
                  ) : (
                    <span className="w-12" />
                  )}
                </div>
              </div>
            ))}
          </div>
          {emptyProjects.length > 0 && (
            <p className="text-xs text-slate-400 mt-2 ml-1">
              + {emptyProjects.length} project{emptyProjects.length > 1 ? 's' : ''} with no test data
            </p>
          )}
        </div>
      )}

      {/* Bottom — Bug chart + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bug Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Bug Distribution</h3>
          <BugSeverityChart data={stats.bugs_by_severity || []} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-0">
              {recentActivity.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`flex items-center gap-3 py-2 ${idx > 0 ? 'border-t border-slate-50' : ''}`}
                >
                  <span
                    className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide w-8 text-center py-0.5 rounded ${
                      item.type === 'bug'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-blue-50 text-blue-500'
                    }`}
                  >
                    {item.type === 'bug' ? 'BUG' : 'RUN'}
                  </span>
                  <div className="min-w-0 flex-1">
                    {user ? (
                      <Link
                        to={item.type === 'bug' ? `/bugs/${item.id}` : `/test-runs/${item.id}`}
                        className="text-sm text-slate-700 hover:text-blue-600 truncate block"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-700 truncate block">{item.title}</span>
                    )}
                  </div>
                  {item.type === 'bug' && item.severity && (
                    <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded capitalize ${severityBadgeColors[item.severity] || 'bg-gray-100 text-gray-600'}`}>
                      {item.severity}
                    </span>
                  )}
                  {item.type === 'run' && item.rate !== null && (
                    <span className={`flex-shrink-0 text-xs font-semibold tabular-nums ${passRateColor(item.rate)}`}>{item.rate}%</span>
                  )}
                  <span className="text-[11px] text-slate-400 flex-shrink-0 w-16 text-right">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-4">No activity yet.</p>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-6 text-xs text-slate-400 pb-2">
        <span>{stats.test_cases ?? 0} test cases</span>
        <span>{stats.total_users ?? 0} team members</span>
        <span>{stats.bugs?.total ?? 0} total bugs ({stats.bugs?.closed ?? 0} closed)</span>
      </div>
    </div>
  );
}
