import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProjectTestScript, deleteProjectTestScript } from '../api/projectTestScripts';
import { authFetch } from '../api/base';

const priorityColors = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  ready: 'bg-blue-100 text-blue-800',
  deprecated: 'bg-red-50 text-red-600',
};

const bugStatusColors = {
  new: 'bg-blue-100 text-blue-800',
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  fixed: 'bg-green-100 text-green-800',
  verified: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-100 text-gray-600',
};

const bugStatusLabels = {
  new: 'New', open: 'Open', in_progress: 'In Progress',
  fixed: 'Fixed', verified: 'Verified', closed: 'Closed',
};

const execStatusConfig = {
  pass: { icon: '✓', color: 'text-green-600 bg-green-50', label: 'Pass' },
  fail: { icon: '✗', color: 'text-red-600 bg-red-50', label: 'Fail' },
  blocked: { icon: '⊘', color: 'text-yellow-600 bg-yellow-50', label: 'Blocked' },
  skipped: { icon: '—', color: 'text-gray-500 bg-gray-50', label: 'Skipped' },
  pending: { icon: '○', color: 'text-gray-400 bg-gray-50', label: 'Pending' },
};

function OverflowMenu({ onFileBug, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        title="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
          <button
            onClick={() => { setOpen(false); onFileBug(); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            File Bug
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div className="pb-5 mb-5 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{children}</div>
    </div>
  );
}

export default function ProjectTestScriptDetail() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const [ts, setTs] = useState(null);
  const [linkedBugs, setLinkedBugs] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProjectTestScript(projectId, id)
      .then(setTs)
      .catch((err) => setError(err.message));

    authFetch(`/api/bugs?test_case_id=${id}`)
      .then(r => r.json())
      .then(setLinkedBugs)
      .catch(() => {});

    authFetch(`/api/test-cases/${id}/executions`)
      .then(r => r.json())
      .then(setExecutions)
      .catch(() => {});
  }, [projectId, id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this test script?')) return;
    try {
      await deleteProjectTestScript(projectId, id);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !ts) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!ts) return <p className="text-gray-500">Loading...</p>;

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}`}
          className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Project
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">{ts.title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/projects/${projectId}/test-scripts/${id}/edit`}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
            <OverflowMenu
              onFileBug={() => navigate(`/bugs/new?test_case_id=${id}`)}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Main content — left */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-6">
          <Section title="Description">
            {ts.description || null}
          </Section>

          <Section title="Preconditions">
            {ts.preconditions || null}
          </Section>

          <Section title="Steps">
            {ts.steps || null}
          </Section>

          <Section title="Expected Result">
            {ts.expected_result || null}
          </Section>

          {!ts.description && !ts.preconditions && !ts.steps && !ts.expected_result && (
            <p className="text-sm text-gray-400 italic">No details added yet.</p>
          )}
        </div>

        {/* Sidebar — right */}
        <div className="w-72 shrink-0 space-y-4 sticky top-4">
          {/* Details card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[ts.status] || 'bg-gray-100 text-gray-800'}`}>
                    {ts.status}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Priority</dt>
                <dd>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${priorityColors[ts.priority] || ''}`}>
                    {ts.priority}
                  </span>
                </dd>
              </div>
              {ts.module && (
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Module</dt>
                  <dd>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                      {ts.module}
                    </span>
                  </dd>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <dt className="text-gray-500">Created by</dt>
                <dd className="text-gray-800 font-medium">{ts.created_by_name || '—'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-600">{formatDate(ts.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Updated</dt>
                <dd className="text-gray-600">{formatDate(ts.updated_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Linked Bugs card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Linked Bugs {linkedBugs.length > 0 && `(${linkedBugs.length})`}
            </h3>
            {linkedBugs.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-xs text-gray-400 mb-2">No bugs linked</p>
                <Link
                  to={`/bugs/new?test_case_id=${id}`}
                  className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                >
                  + File a bug
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedBugs.map((bug) => (
                  <Link
                    key={bug.id}
                    to={`/bugs/${bug.id}`}
                    className="block px-3 py-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <p className="text-sm text-gray-800 font-medium truncate">{bug.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${bugStatusColors[bug.status] || ''}`}>
                        {bugStatusLabels[bug.status] || bug.status}
                      </span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-50 text-red-700 capitalize">
                        {bug.severity}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Execution History card */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Execution History {executions.length > 0 && `(${executions.length})`}
            </h3>
            {executions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No executions yet</p>
            ) : (
              <div className="space-y-2">
                {executions.map((exec, i) => {
                  const cfg = execStatusConfig[exec.status] || execStatusConfig.pending;
                  return (
                    <Link
                      key={i}
                      to={`/test-runs/${exec.run_id}`}
                      className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${cfg.color}`}>
                        {cfg.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">{exec.run_name}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(exec.run_date)}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
