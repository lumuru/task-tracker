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
