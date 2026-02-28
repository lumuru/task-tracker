import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import TestRuns from './pages/TestRuns';
import TestRunExecution from './pages/TestRunExecution';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import BugForm from './pages/BugForm';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectForm from './pages/ProjectForm';
import ProjectTestScripts from './pages/ProjectTestScripts';
import ProjectTestScriptDetail from './pages/ProjectTestScriptDetail';
import ProjectTestScriptForm from './pages/ProjectTestScriptForm';
import TestScriptGenerator from './pages/TestScriptGenerator';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force password change
  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />

      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        <Route path="/projects/:projectId/test-scripts" element={<ProjectTestScripts />} />
        <Route path="/projects/:projectId/test-scripts/new" element={<ProjectTestScriptForm />} />
        <Route path="/projects/:projectId/test-scripts/:id" element={<ProjectTestScriptDetail />} />
        <Route path="/projects/:projectId/test-scripts/:id/edit" element={<ProjectTestScriptForm />} />
        <Route path="/projects/:projectId/generate" element={<TestScriptGenerator />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/test-runs" element={<TestRuns />} />
        <Route path="/test-runs/:id" element={<TestRunExecution />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/bugs/new" element={<BugForm />} />
        <Route path="/bugs/:id" element={<BugDetail />} />
        <Route path="/bugs/:id/edit" element={<BugForm />} />
        <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
