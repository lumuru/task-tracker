import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getBug, updateBug, deleteBug } from '../api/bugs';

const STATUSES = ['new', 'open', 'in_progress', 'fixed', 'verified', 'closed'];
const STATUS_LABELS = { new: 'New', open: 'Open', in_progress: 'In Progress', fixed: 'Fixed', verified: 'Verified', closed: 'Closed' };

const severityColors = {
  critical: 'bg-red-100 text-red-800',
  major: 'bg-orange-100 text-orange-800',
  minor: 'bg-yellow-100 text-yellow-800',
  trivial: 'bg-gray-100 text-gray-600',
};

const priorityColors = {
  P1: 'bg-red-100 text-red-800',
  P2: 'bg-orange-100 text-orange-800',
  P3: 'bg-yellow-100 text-yellow-800',
  P4: 'bg-gray-100 text-gray-600',
};

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  open: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  fixed: 'bg-green-100 text-green-800',
  verified: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-100 text-gray-600',
};

export default function BugDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState(null);
  const [error, setError] = useState(null);

  const fetchBug = () => {
    getBug(id).then(setBug).catch((err) => setError(err.message));
  };

  useEffect(() => { fetchBug(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateBug(id, { ...bug, status: newStatus });
      fetchBug();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this bug?')) return;
    try {
      await deleteBug(id);
      navigate('/bugs');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !bug) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!bug) return <p className="text-gray-500">Loading...</p>;

  // Determine allowed next statuses based on workflow
  const currentIdx = STATUSES.indexOf(bug.status);
  const nextStatuses = STATUSES.filter((_, i) => i !== currentIdx);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/bugs" className="text-sm text-blue-600 hover:text-blue-800 mb-1 inline-block">&larr; Back to Bugs</Link>
          <h2 className="text-2xl font-bold text-gray-800">{bug.title}</h2>
        </div>
        <div className="flex gap-2">
          <Link to={`/bugs/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Edit</Link>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">Delete</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        {/* Status workflow */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Status Workflow</h3>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  s === bug.status
                    ? `${statusColors[s]} border-current ring-2 ring-offset-1 ring-current`
                    : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="flex gap-3 flex-wrap">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${severityColors[bug.severity] || ''}`}>
            {bug.severity}
          </span>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityColors[bug.priority] || ''}`}>
            {bug.priority}
          </span>
          {bug.module && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">{bug.module}</span>
          )}
        </div>

        {/* Assignee & Reporter */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned To</h3>
            <p className="text-sm text-gray-800">{bug.assigned_to_name || 'Unassigned'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Reported By</h3>
            <p className="text-sm text-gray-800">{bug.reported_by_name || '—'}</p>
          </div>
        </div>

        {bug.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{bug.description}</p>
          </div>
        )}

        {bug.steps_to_reproduce && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Steps to Reproduce</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{bug.steps_to_reproduce}</p>
          </div>
        )}

        {bug.project_name && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Project</h3>
            <p className="text-sm text-gray-800">{bug.project_name}</p>
          </div>
        )}

        {bug.test_case_title && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Linked Test Case</h3>
            <Link to={`/test-cases/${bug.test_case_id}`} className="text-sm text-blue-600 hover:text-blue-800">
              {bug.test_case_title}
            </Link>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 space-y-1">
          <p>Created: {bug.created_at}</p>
          <p>Updated: {bug.updated_at}</p>
        </div>
      </div>
    </div>
  );
}
