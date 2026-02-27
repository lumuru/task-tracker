import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        <Route path="/projects/:projectId/test-scripts" element={<ProjectTestScripts />} />
        <Route path="/projects/:projectId/test-scripts/new" element={<ProjectTestScriptForm />} />
        <Route path="/projects/:projectId/test-scripts/:id" element={<ProjectTestScriptDetail />} />
        <Route path="/projects/:projectId/test-scripts/:id/edit" element={<ProjectTestScriptForm />} />
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/test-runs" element={<TestRuns />} />
        <Route path="/test-runs/:id" element={<TestRunExecution />} />
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/bugs/new" element={<BugForm />} />
        <Route path="/bugs/:id" element={<BugDetail />} />
        <Route path="/bugs/:id/edit" element={<BugForm />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
