import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TestCases from './pages/TestCases';
import TestCaseDetail from './pages/TestCaseDetail';
import TestCaseForm from './pages/TestCaseForm';
import TestRuns from './pages/TestRuns';
import TestRunExecution from './pages/TestRunExecution';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import BugForm from './pages/BugForm';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectForm from './pages/ProjectForm';
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
        <Route path="/test-cases" element={<TestCases />} />
        <Route path="/test-cases/new" element={<TestCaseForm />} />
        <Route path="/test-cases/:id" element={<TestCaseDetail />} />
        <Route path="/test-cases/:id/edit" element={<TestCaseForm />} />
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
