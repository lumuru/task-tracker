import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">QA Task Tracker</h1>
        {!user ? (
          <Link
            to="/login"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
            <Link
              to="/"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Go to App
            </Link>
          </div>
        )}
      </header>
      <main className="p-6 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
