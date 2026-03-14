import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBug, createBug, updateBug } from '../api/bugs';
import { getMembers } from '../api/members';
import { getTestCases } from '../api/testCases';
import { getProjects } from '../api/projects';

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const STATUSES = ['new', 'open', 'in_progress', 'fixed', 'verified', 'closed'];
const STATUS_LABELS = { new: 'New', open: 'Open', in_progress: 'In Progress', fixed: 'Fixed', verified: 'Verified', closed: 'Closed' };

export default function BugForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    steps_to_reproduce: '',
    severity: 'major',
    priority: 'P2',
    status: 'new',
    module: '',
    assigned_to: '',
    reported_by: '',
    project_id: searchParams.get('project_id') || '',
    test_case_id: searchParams.get('test_case_id') || '',
  });

  useEffect(() => {
    Promise.all([getMembers(), getProjects(), getTestCases()]).then(([m, p, tc]) => {
      setMembers(m);
      setProjects(p);
      setTestCases(tc);
      // Auto-fill project_id from linked test case when test_case_id is set from URL
      const tcIdParam = searchParams.get('test_case_id');
      if (tcIdParam) {
        const tcFromParam = tc.find(t => String(t.id) === String(tcIdParam));
        if (tcFromParam) {
          setForm(prev => ({
            ...prev,
            project_id: prev.project_id || String(tcFromParam.project_id || ''),
            module: tcFromParam.module || prev.module,
          }));
        }
      }
    });

    if (isEditing) {
      getBug(id)
        .then((bug) => {
          setForm({
            title: bug.title || '',
            description: bug.description || '',
            steps_to_reproduce: bug.steps_to_reproduce || '',
            severity: bug.severity || 'major',
            priority: bug.priority || 'P2',
            status: bug.status || 'new',
            module: bug.module || '',
            assigned_to: bug.assigned_to || '',
            reported_by: bug.reported_by || '',
            project_id: bug.project_id || '',
            test_case_id: bug.test_case_id || '',
          });
          setLoading(false);
        })
        .catch((err) => { setError(err.message); setLoading(false); });
    }
  }, [id]);

  // Filter test cases by selected project
  const filteredTestCases = form.project_id
    ? testCases.filter(tc => String(tc.project_id) === String(form.project_id))
    : testCases;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'project_id') {
      const currentTc = testCases.find(tc => String(tc.id) === String(form.test_case_id));
      const shouldReset = !currentTc || String(currentTc.project_id) !== String(value);
      setForm({ ...form, project_id: value, test_case_id: shouldReset ? '' : form.test_case_id });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }

    try {
      const data = {
        ...form,
        assigned_to: form.assigned_to || null,
        reported_by: form.reported_by || null,
        project_id: form.project_id || null,
        test_case_id: form.test_case_id || null,
      };
      if (isEditing) {
        await updateBug(id, data);
      } else {
        await createBug(data);
      }
      navigate('/bugs');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Bug' : 'Report Bug'}
      </h2>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input type="text" name="title" value={form.title} onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Steps to Reproduce</label>
          <textarea name="steps_to_reproduce" value={form.steps_to_reproduce} onChange={handleChange} rows={4}
            placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select name="severity" value={form.severity} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" value={form.priority} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select name="project_id" value={form.project_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">— None —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <input type="text" name="module" value={form.module} onChange={handleChange}
              placeholder="e.g. Authentication, Checkout"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Linked Test Case</label>
          <select name="test_case_id" value={form.test_case_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="">— None —</option>
            {filteredTestCases.map(tc => <option key={tc.id} value={tc.id}>{tc.title}</option>)}
          </select>
          {form.project_id && filteredTestCases.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">No test cases found for this project.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <input type="text" name="assigned_to" value={form.assigned_to} onChange={handleChange}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
            <select name="reported_by" value={form.reported_by} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">— Select —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            {isEditing ? 'Update' : 'Report Bug'}
          </button>
          <button type="button" onClick={() => navigate('/bugs')} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
