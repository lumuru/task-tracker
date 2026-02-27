import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProject, getProjectMembers } from '../api/projects';
import { getProjectTestScript, createProjectTestScript, updateProjectTestScript } from '../api/projectTestScripts';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['draft', 'ready', 'deprecated'];

export default function ProjectTestScriptForm() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    steps: '',
    expected_result: '',
    module: '',
    priority: 'medium',
    status: 'draft',
    created_by: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [proj, projectMembers] = await Promise.all([
          getProject(projectId),
          getProjectMembers(projectId),
        ]);
        setProject(proj);
        setMembers(projectMembers);

        if (isEditing) {
          const ts = await getProjectTestScript(projectId, id);
          setForm({
            title: ts.title || '',
            description: ts.description || '',
            steps: ts.steps || '',
            expected_result: ts.expected_result || '',
            module: ts.module || '',
            priority: ts.priority || 'medium',
            status: ts.status || 'draft',
            created_by: ts.created_by || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectId, id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!isEditing && !form.created_by) {
      setError('Created By is required');
      return;
    }

    try {
      if (isEditing) {
        await updateProjectTestScript(projectId, id, {
          ...form,
          updated_by: form.created_by || null,
        });
        navigate(`/projects/${projectId}/test-scripts/${id}`);
      } else {
        const created = await createProjectTestScript(projectId, {
          ...form,
          created_by: Number(form.created_by),
        });
        navigate(`/projects/${projectId}/test-scripts/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link to={`/projects/${projectId}/test-scripts`} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Test Scripts
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Test Script' : 'New Test Script'}
        {project ? ` \u2014 ${project.name}` : ''}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Steps</label>
          <textarea
            name="steps"
            value={form.steps}
            onChange={handleChange}
            rows={4}
            placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Result</label>
          <textarea
            name="expected_result"
            value={form.expected_result}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <input
              type="text"
              name="module"
              value={form.module}
              onChange={handleChange}
              placeholder="e.g. Authentication, Checkout"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditing ? 'Created By' : 'Created By *'}
            </label>
            <select
              name="created_by"
              value={form.created_by}
              onChange={handleChange}
              disabled={isEditing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">— Select —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {!isEditing && members.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No members assigned to this project. Add members first.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/projects/${projectId}/test-scripts`)}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

