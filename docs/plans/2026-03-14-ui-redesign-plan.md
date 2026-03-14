# UI Redesign — Clean Modern SaaS Style Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Dashboard + Sidebar from plain functional UI into a clean, modern SaaS-style interface (Linear/Vercel aesthetic) using Tailwind CSS + Lucide React icons.

**Architecture:** Pure CSS-class changes on 3 existing files (Layout.jsx, PublicLayout.jsx, Dashboard.jsx) plus installing lucide-react. No new component framework. Dark slate sidebar with light content area. Lucide icons in nav and dashboard stat cards.

**Tech Stack:** React 18, Tailwind CSS 3, Lucide React (new), React Router 6

---

### Task 1: Install lucide-react

**Files:**
- Modify: `client/package.json`

**Step 1: Install the dependency**

Run:
```bash
cd client && npm install lucide-react
```

**Step 2: Verify installation**

Run:
```bash
cd client && node -e "require('lucide-react')" 2>&1 || echo "ESM module, checking package.json"
grep lucide-react package.json
```
Expected: `lucide-react` appears in dependencies.

**Step 3: Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore: add lucide-react icon library"
```

---

### Task 2: Redesign sidebar (Layout.jsx)

**Files:**
- Modify: `client/src/components/Layout.jsx`

**Step 1: Rewrite Layout.jsx with dark sidebar, Lucide icons, and polished user footer**

Replace the entire file with:

```jsx
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  PlayCircle,
  Bug,
  Settings,
  LogOut,
} from 'lucide-react';

const iconMap = {
  '/': LayoutDashboard,
  '/projects': FolderKanban,
  '/test-cases': ClipboardList,
  '/test-runs': PlayCircle,
  '/bugs': Bug,
  '/settings': Settings,
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/test-cases', label: 'Test Cases' },
    { to: '/test-runs', label: 'Test Runs' },
    { to: '/bugs', label: 'Bugs' },
    ...(isAdmin ? [{ to: '/settings', label: 'Settings' }] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-slate-900 flex flex-col">
        {/* Brand */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <ClipboardList size={16} className="text-white" />
            </div>
            <h1 className="text-base font-semibold text-white tracking-tight">QA Tracker</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(({ to, label }) => {
            const Icon = iconMap[to] || LayoutDashboard;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-slate-800 text-white border-l-2 border-blue-500 -ml-[2px]'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-slate-700/50 px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                  user.role === 'admin'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors duration-150"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Verify it renders**

Run:
```bash
cd client && npx vite build
```
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add client/src/components/Layout.jsx
git commit -m "feat: redesign sidebar with dark theme and Lucide icons"
```

---

### Task 3: Redesign PublicLayout header

**Files:**
- Modify: `client/src/components/PublicLayout.jsx`

**Step 1: Rewrite PublicLayout.jsx with polished header**

Replace the entire file with:

```jsx
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList } from 'lucide-react';

export default function PublicLayout() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <ClipboardList size={16} className="text-white" />
          </div>
          <h1 className="text-base font-semibold text-slate-800 tracking-tight">QA Tracker</h1>
        </div>
        {!user ? (
          <form onSubmit={handleLogin} className="flex items-center gap-2">
            {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white w-44 transition-colors"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white w-36 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-sm font-medium text-slate-700">{user.name}</span>
          </div>
        )}
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Verify build**

Run:
```bash
cd client && npx vite build
```
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add client/src/components/PublicLayout.jsx
git commit -m "feat: polish PublicLayout header with consistent branding"
```

---

### Task 4: Redesign Dashboard page

**Files:**
- Modify: `client/src/pages/Dashboard.jsx`

**Step 1: Rewrite Dashboard.jsx with modern stat cards, polished tables, and refined activity feed**

Replace the entire file with:

```jsx
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
```

**Step 2: Verify build**

Run:
```bash
cd client && npx vite build
```
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add client/src/pages/Dashboard.jsx
git commit -m "feat: redesign Dashboard with modern stat cards and polished tables"
```

---

### Task 5: Build, deploy, and verify

**Step 1: Build frontend**

Run:
```bash
cd client && npm run build
```
Expected: Build succeeds.

**Step 2: Rebuild and restart Docker**

Run:
```bash
docker compose build --no-cache && docker compose up -d
```

**Step 3: Verify deployment**

Check container is running:
```bash
docker compose logs --tail=5 qa-tracker
```
Expected: `Server running on http://localhost:3001`

**Step 4: Commit built assets if needed**

```bash
git add -A && git status
```
