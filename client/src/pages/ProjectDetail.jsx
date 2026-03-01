import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import FuzzyFilter, { fuzzyMatch } from '../components/FuzzyFilter';
import { getProject, deleteProject, addProjectMembers, removeProjectMember, getProjectActivity } from '../api/projects';
import { getMembers } from '../api/members';
import { getProjectTestScripts, getProjectTestScriptModules, deleteProjectTestScript, uploadProjectTestScripts, bulkUpdateTestScriptStatus } from '../api/projectTestScripts';
import { getBugs, deleteBug } from '../api/bugs';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

const statusLabels = {
  active: 'Active',
  archived: 'Archived',
};

const priorityColors = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const scriptStatusColors = {
  draft: 'bg-gray-100 text-gray-800',
  ready: 'bg-blue-100 text-blue-800',
  deprecated: 'bg-red-50 text-red-600',
};

const severityColors = {
  critical: 'bg-red-100 text-red-800',
  major: 'bg-orange-100 text-orange-800',
  minor: 'bg-yellow-100 text-yellow-800',
  trivial: 'bg-gray-100 text-gray-600',
};

const resultStatusColors = {
  pass: 'text-green-700 bg-green-50',
  fail: 'text-red-700 bg-red-50',
  blocked: 'text-yellow-700 bg-yellow-50',
  skipped: 'text-gray-500 bg-gray-50',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function OverflowMenu({ onDelete, hasTestScripts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        title="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
          {hasTestScripts ? (
            <div className="px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
              Delete
              <span className="block text-xs">Has test scripts</span>
            </div>
          ) : (
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ project, allMembers, onAddMember, onRemoveMember, testScriptCount }) {
  const [selectedMember, setSelectedMember] = useState('');
  const assignedIds = new Set(project.members.map((m) => m.id));
  const availableMembers = allMembers.filter((m) => !assignedIds.has(m.id));

  // Quick stats from the project data
  const openDefects = project.open_defects || 0;
  const latestPassRate = project.latest_pass_rate;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Members panel */}
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Members ({project.members.length})
        </h3>

        {project.members.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No members assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.members.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 text-sm rounded-full border border-blue-200"
              >
                <span className="font-medium">{member.name}</span>
                <span className="text-blue-500 text-xs">({member.role})</span>
                <button
                  onClick={() => onRemoveMember(member.id)}
                  className="ml-1 text-blue-400 hover:text-red-600 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                  title={`Remove ${member.name}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {availableMembers.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm flex-1"
            >
              <option value="">— Select member to add —</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
            <button
              onClick={() => { if (selectedMember) { onAddMember(selectedMember); setSelectedMember(''); } }}
              disabled={!selectedMember}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quick Stats</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Test Scripts</span>
            <span className="text-lg font-semibold text-gray-800">{testScriptCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Open Defects</span>
            <span className={`text-lg font-semibold ${openDefects > 0 ? 'text-red-600' : 'text-gray-800'}`}>{openDefects}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Pass Rate</span>
            <span className={`text-lg font-semibold ${
              latestPassRate === null ? 'text-gray-400' :
              latestPassRate >= 80 ? 'text-green-600' :
              latestPassRate >= 50 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {latestPassRate !== null ? `${latestPassRate}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Test Scripts Tab ─────────────────────────────────────────
function TestScriptsTab({ projectId, project }) {
  const [scripts, setScripts] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moduleFilter, setModuleFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const [s, m] = await Promise.all([
        getProjectTestScripts(projectId),
        getProjectTestScriptModules(projectId),
      ]);
      setScripts(s);
      setModules(m);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScripts(); }, [projectId]);

  // Client-side fuzzy filter
  const filteredScripts = useMemo(() => {
    if (!moduleFilter.trim()) return scripts;
    return scripts.filter((s) => s.module && fuzzyMatch(s.module, moduleFilter));
  }, [scripts, moduleFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this test script?')) return;
    try {
      await deleteProjectTestScript(projectId, id);
      fetchScripts();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadProjectTestScripts(projectId, file);
      setUploadResult(result);
      fetchScripts();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredScripts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredScripts.map(s => s.id)));
    }
  };

  const handleBulkStatus = async (status) => {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    try {
      await bulkUpdateTestScriptStatus(projectId, [...selected], status);
      setSelected(new Set());
      fetchScripts();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600">Change status to:</span>
          {['ready', 'draft', 'deprecated'].map(s => (
            <button
              key={s}
              onClick={() => handleBulkStatus(s)}
              disabled={bulkUpdating}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                s === 'ready' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                s === 'draft' ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' :
                'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FuzzyFilter
          options={modules.map(m => ({ value: m, label: m }))}
          value={moduleFilter}
          onChange={setModuleFilter}
          placeholder="Filter by module..."
          liveFilter
        />

        <div className="ml-auto flex gap-2">
          <label className={`px-4 py-2.5 text-sm font-medium rounded-lg cursor-pointer transition-colors ${uploading ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {uploading ? 'Uploading...' : 'Upload Excel'}
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
          <Link
            to={`/projects/${projectId}/generate`}
            className={`px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${
              project.generated_at && scripts.length > 0
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {project.generated_at && scripts.length > 0 ? 'Regenerate with AI' : 'Generate with AI'}
          </Link>
          <Link
            to={`/projects/${projectId}/test-scripts/new`}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Test Script
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {uploadResult && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
          <p className="font-medium text-green-800">
            Imported {uploadResult.imported} of {uploadResult.total_rows} test scripts.
          </p>
          {uploadResult.errors.length > 0 && (
            <ul className="mt-1 text-green-700">
              {uploadResult.errors.map((e, i) => <li key={i}>Row {e.row}: {e.error}</li>)}
            </ul>
          )}
          <button onClick={() => setUploadResult(null)} className="mt-1 text-xs text-green-600 underline">Dismiss</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filteredScripts.length === 0 ? (
        <p className="text-gray-500">{moduleFilter ? 'No test scripts match this filter.' : 'No test scripts found.'}</p>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredScripts.length > 0 && selected.size === filteredScripts.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 h-4 w-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScripts.map((ts) => (
                  <tr key={ts.id} className={`hover:bg-gray-50 ${selected.has(ts.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.has(ts.id)}
                        onChange={() => toggleSelect(ts.id)}
                        className="rounded border-gray-300 h-4 w-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${projectId}/test-scripts/${ts.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        {ts.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{ts.module || '\u2014'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityColors[ts.priority] || ''}`}>
                        {ts.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${scriptStatusColors[ts.status] || ''}`}>
                        {ts.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <Link to={`/projects/${projectId}/test-scripts/${ts.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">Edit</Link>
                      <button onClick={() => handleDelete(ts.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            {filteredScripts.length}{moduleFilter ? ` of ${scripts.length}` : ''} test script{filteredScripts.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}

// ── Bugs Tab ─────────────────────────────────────────────────
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

function BugsTab({ projectId }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const data = await getBugs({ project_id: projectId });
      setBugs(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBugs(); }, [projectId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bug?')) return;
    try {
      await deleteBug(id);
      fetchBugs();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Link
          to={`/bugs/new?project_id=${projectId}`}
          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Report Bug
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : bugs.length === 0 ? (
        <p className="text-gray-500">No bugs found for this project.</p>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bugs.map((bug) => (
                  <tr key={bug.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/bugs/${bug.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">{bug.title}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${bugStatusColors[bug.status] || ''}`}>
                        {bugStatusLabels[bug.status] || bug.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${severityColors[bug.severity] || ''}`}>
                        {bug.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityColors[bug.priority] || ''}`}>
                        {bug.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bug.assigned_to_name || '\u2014'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{bug.module || '\u2014'}</td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <Link to={`/bugs/${bug.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">Edit</Link>
                      <button onClick={() => handleDelete(bug.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500">{bugs.length} bug{bugs.length !== 1 ? 's' : ''}</p>
        </>
      )}
    </div>
  );
}

// ── Activity Tab ─────────────────────────────────────────────
function ActivityTab({ projectId }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjectActivity(projectId)
      .then(setActivity)
      .catch(() => setActivity({ recent_bugs: [], recent_results: [] }))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!activity) return null;

  const { recent_bugs, recent_results } = activity;
  const hasNone = recent_bugs.length === 0 && recent_results.length === 0;

  if (hasNone) return <p className="text-gray-500">No recent activity for this project.</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Bugs */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Recent Bugs</h3>
        {recent_bugs.length === 0 ? (
          <p className="text-sm text-gray-400">No bugs reported.</p>
        ) : (
          <div className="space-y-3">
            {recent_bugs.map((bug) => (
              <div key={bug.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className={`mt-0.5 inline-block px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${severityColors[bug.severity] || ''}`}>
                  {bug.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{bug.title}</p>
                  <p className="text-xs text-gray-400">
                    {bug.reported_by_name && `by ${bug.reported_by_name} · `}{formatDate(bug.created_at)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                  bug.status === 'open' ? 'bg-red-50 text-red-700' :
                  bug.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{bug.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Test Executions */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Recent Test Executions</h3>
        {recent_results.length === 0 ? (
          <p className="text-sm text-gray-400">No test executions yet.</p>
        ) : (
          <div className="space-y-3">
            {recent_results.map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className={`mt-0.5 inline-block px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${resultStatusColors[r.status] || ''}`}>
                  {r.status}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.test_case_title}</p>
                  <p className="text-xs text-gray-400">
                    {r.test_run_name}{r.executed_by_name && ` · ${r.executed_by_name}`}{r.executed_at && ` · ${formatDate(r.executed_at)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [testScriptCount, setTestScriptCount] = useState(0);
  const [bugCount, setBugCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [projectData, membersData, scriptsData, bugsData] = await Promise.all([
        getProject(id),
        getMembers(),
        getProjectTestScripts(id),
        getBugs({ project_id: id }),
      ]);
      setProject(projectData);
      setAllMembers(membersData);
      setTestScriptCount(scriptsData.length);
      setBugCount(bugsData.length);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (memberId) => {
    try {
      await addProjectMembers(id, [Number(memberId)]);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await removeProjectMember(id, memberId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !project) return <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>;
  if (!project) return <p className="text-gray-500">Loading...</p>;

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'test-scripts', label: `Test Scripts (${testScriptCount})` },
    { key: 'bugs', label: `Bugs (${bugCount})` },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">&larr; Back to Projects</Link>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-800 truncate">{project.name}</h2>
              <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ${statusColors[project.status] || ''}`}>
                {statusLabels[project.status] || project.status}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 mb-1">{project.description}</p>
            )}
            <p className="text-xs text-gray-400">
              {project.created_by_name && `Created by ${project.created_by_name}`}
              {project.created_by_name && project.updated_at && ' \u00B7 '}
              {project.updated_at && `Updated ${formatDate(project.updated_at)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <Link
              to={`/projects/${id}/edit`}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit
            </Link>
            <OverflowMenu onDelete={handleDelete} hasTestScripts={testScriptCount > 0} />
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          project={project}
          allMembers={allMembers}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          testScriptCount={testScriptCount}
        />
      )}
      {activeTab === 'test-scripts' && (
        <TestScriptsTab projectId={id} project={project} />
      )}
      {activeTab === 'bugs' && (
        <BugsTab projectId={id} />
      )}
      {activeTab === 'activity' && (
        <ActivityTab projectId={id} />
      )}
    </div>
  );
}
