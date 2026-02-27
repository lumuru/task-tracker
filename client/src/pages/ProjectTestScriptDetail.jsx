import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProjectTestScript, deleteProjectTestScript } from '../api/projectTestScripts';

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

export default function ProjectTestScriptDetail() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const [ts, setTs] = useState(null);
  const [linkedBugs, setLinkedBugs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProjectTestScript(projectId, id)
      .then(setTs)
      .catch((err) => setError(err.message));

    fetch(`${import.meta.env.VITE_API_URL || ''}/api/bugs?test_case_id=${id}`)
      .then(r => r.json())
      .then(setLinkedBugs)
      .catch(() => {});
  }, [projectId, id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this test script?')) return;
    try {
      await deleteProjectTestScript(projectId, id);
      navigate(`/projects/${projectId}/test-scripts`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !ts) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!ts) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/projects/${projectId}/test-scripts`} className="text-sm text-blue-600 hover:text-blue-800 mb-1 inline-block">
            &larr; Back to Test Scripts
          </Link>
          <h2 className="text-2xl font-bold text-gray-800">{ts.title}</h2>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/bugs/new?test_case_id=${id}`}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700"
          >
            File Bug
          </Link>
          <Link
            to={`/projects/${projectId}/test-scripts/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <div className="flex gap-3">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityColors[ts.priority] || ''}`}>
            {ts.priority}
          </span>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[ts.status] || ''}`}>
            {ts.status}
          </span>
          {ts.module && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800">
              {ts.module}
            </span>
          )}
        </div>

        {ts.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ts.description}</p>
          </div>
        )}

        {ts.steps && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Steps</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ts.steps}</p>
          </div>
        )}

        {ts.expected_result && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Expected Result</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{ts.expected_result}</p>
          </div>
        )}

        {/* Linked Bugs */}
        {linkedBugs.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Linked Bugs ({linkedBugs.length})</h3>
            <div className="space-y-2">
              {linkedBugs.map((bug) => (
                <div key={bug.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded">
                  <Link to={`/bugs/${bug.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    {bug.title}
                  </Link>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${bugStatusColors[bug.status] || ''}`}>
                      {bugStatusLabels[bug.status] || bug.status}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-50 text-red-700 capitalize">
                      {bug.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 space-y-1">
          {ts.created_by_name && <p>Created by: {ts.created_by_name}</p>}
          <p>Created: {ts.created_at}</p>
          <p>Updated: {ts.updated_at}</p>
        </div>
      </div>
    </div>
  );
}
