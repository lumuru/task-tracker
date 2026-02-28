import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800">QA Task Tracker</h1>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
