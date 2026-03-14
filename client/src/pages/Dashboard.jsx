import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch, getToken } from '../api/base';
import {
  FolderKanban,
  Users,
  Zap,
  Bug as BugIcon,
  TrendingUp,
  Info,
} from 'lucide-react';

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const severityDotColors = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500',
  trivial: 'bg-gray-400',
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

const statCards = [
  { key: 'total_projects', label: 'Total Projects', icon: FolderKanban, borderColor: 'border-l-blue-500', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', linkTo: '/projects' },
  { key: 'total_users', label: 'Testers', icon: Users, borderColor: 'border-l-violet-500', iconBg: 'bg-violet-50', iconColor: 'text-violet-600' },
  { key: 'active_projects', label: 'Active Projects', icon: Zap, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600', linkTo: '/projects' },
  { key: 'open_defects', label: 'Open Defects', icon: BugIcon, borderColor: 'border-l-red-500', iconBg: 'bg-red-50', iconColor: 'text-red-600', valueColor: 'text-red-600', linkTo: '/bugs' },
  { key: 'avg_pass_rate', label: 'Avg Pass Rate', icon: TrendingUp, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', isRate: true },
];

function StatCard({ label, value, subtitle, icon: Icon, borderColor, iconBg, iconColor, valueColor, linkTo, user }) {
  const Wrapper = user && linkTo ? Link : 'div';
  const wrapperProps = user && linkTo ? { to: linkTo } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`p-5 bg-white rounded-xl shadow-sm border-l-4 ${borderColor} hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${user && linkTo ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={16} className={iconColor} />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className={`text-3xl font-semibold ${valueColor || 'text-slate-800'}`}>{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </Wrapper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [teamAssignments, setTeamAssignments] = useState(null);
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
      fetchFn('/api/dashboard/team-assignments').then(r => r.json()),
    ])
      .then(([s, a, p, t]) => { setStats(s); setActivity(a); setProjectSummary(p); setTeamAssignments(t); })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>;
  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const getStatValue = (key) => {
    if (key === 'open_defects') return stats.bugs?.open ?? 0;
    if (key === 'avg_pass_rate') return stats.avg_pass_rate > 0 ? `${stats.avg_pass_rate}%` : '\u2014';
    return stats[key] ?? 0;
  };

  const getStatSubtitle = (key) => {
    if (key === 'open_defects') return `${stats.bugs?.total ?? 0} total`;
    return null;
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">Dashboard</h2>

      {!user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-center gap-3">
          <Info size={18} className="text-blue-500 flex-shrink-0" />
          You are viewing the public dashboard. Login to access full features and manage your projects.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={getStatValue(card.key)}
            subtitle={getStatSubtitle(card.key)}
            icon={card.icon}
            borderColor={card.borderColor}
            iconBg={card.iconBg}
            iconColor={card.iconColor}
            valueColor={card.isRate ? passRateColor(stats.avg_pass_rate) : card.valueColor}
            linkTo={card.linkTo}
            user={user}
          />
        ))}
      </div>

      {/* Project Overview Table */}
      {projectSummary && projectSummary.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Project Overview</h3>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Project</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Test Cases</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Open Defects</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectSummary.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      {user ? (
                        <Link to={`/projects/${p.id}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-800 font-medium">{p.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm text-slate-700 font-medium">{p.test_case_count}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusColors[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-center text-sm font-medium ${p.open_defects > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {p.open_defects}
                    </td>
                    <td className={`px-5 py-3.5 text-center text-sm font-semibold ${passRateColor(p.latest_pass_rate)}`}>
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
        {stats.status_breakdown && stats.status_breakdown.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Status Breakdown</h3>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.status_breakdown.map(({ status, count }) => (
                    <tr key={status} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-2.5 text-sm text-slate-700 capitalize">{status}</td>
                      <td className="px-5 py-2.5 text-sm text-slate-800 font-medium text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.priority_breakdown && stats.priority_breakdown.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Priority Breakdown</h3>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Priority</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.priority_breakdown.map(({ priority, count }) => (
                    <tr key={priority} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-2.5 text-sm text-slate-700 capitalize">{priority}</td>
                      <td className="px-5 py-2.5 text-sm text-slate-800 font-medium text-right">{count}</td>
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
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Team Assignments</h3>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
            {[...teamAssignments].sort((a, b) => b.project_count - a.project_count).map((member) => (
              <div key={member.id} className="px-5 py-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{member.name}</span>
                    <span className="text-xs text-slate-400 capitalize">{member.role}</span>
                  </div>
                  {member.projects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {member.projects.map((p) => {
                        const cls = `inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                          p.status === 'active'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`;
                        return user ? (
                          <Link key={p.id} to={`/projects/${p.id}`} className={`${cls} hover:opacity-80 transition-opacity`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                            {p.name}
                          </Link>
                        ) : (
                          <span key={p.id} className={cls}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                            {p.name}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No projects assigned</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0 mt-1">
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
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Open Bugs by Severity</h3>
          <div className="flex gap-3">
            {stats.bugs_by_severity.map(({ severity, count }) => {
              const inner = (
                <>
                  <span className={`w-2.5 h-2.5 rounded-full ${severityDotColors[severity] || 'bg-gray-400'}`} />
                  <span className="text-sm font-medium text-slate-700 capitalize">{severity}</span>
                  <span className="text-sm font-bold text-slate-800">{count}</span>
                </>
              );
              return user ? (
                <Link key={severity} to={`/bugs?severity=${severity}`} className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                  {inner}
                </Link>
              ) : (
                <div key={severity} className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bugs */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Recent Bugs</h3>
          {activity && activity.recent_bugs.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
              {activity.recent_bugs.map((bug) => (
                <div key={bug.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    {user ? (
                      <Link to={`/bugs/${bug.id}`} className="text-sm text-slate-800 hover:text-blue-600 font-medium truncate block transition-colors">
                        {bug.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-800 font-medium truncate block">{bug.title}</span>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {bug.reported_by_name && <span>by {bug.reported_by_name} &middot; </span>}
                      {bug.created_at}
                    </p>
                  </div>
                  <span className={`ml-3 shrink-0 inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${severityBadgeColors[bug.severity] || 'bg-gray-100 text-gray-600'}`}>
                    {bug.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No bugs reported yet.</p>
          )}
        </div>

        {/* Recent Test Runs */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">Recent Test Runs</h3>
          {activity && activity.recent_runs && activity.recent_runs.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
              {activity.recent_runs.map((run) => {
                const executed = run.passed + run.failed + run.blocked;
                const rate = executed > 0 ? Math.round((run.passed / executed) * 100) : null;
                return (
                  <div key={run.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      {user ? (
                        <Link to={`/test-runs/${run.id}`} className="text-sm text-slate-800 hover:text-blue-600 font-medium truncate block transition-colors">
                          {run.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-slate-800 font-medium truncate block">{run.name}</span>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {run.project_name && <span>{run.project_name} &middot; </span>}
                        {run.date || run.created_at}
                        {run.created_by_name && <span> &middot; {run.created_by_name}</span>}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                      {run.total > 0 && (
                        <div className="flex gap-1 text-xs">
                          {run.passed > 0 && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">{run.passed}P</span>}
                          {run.failed > 0 && <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">{run.failed}F</span>}
                          {run.blocked > 0 && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">{run.blocked}B</span>}
                        </div>
                      )}
                      {rate !== null ? (
                        <span className={`text-xs font-bold ${passRateColor(rate)}`}>{rate}%</span>
                      ) : (
                        <span className="text-xs text-slate-300">&mdash;</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No test runs yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
