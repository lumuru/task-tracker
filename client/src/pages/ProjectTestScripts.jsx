import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import FuzzyFilter from '../components/FuzzyFilter';
import { getProject } from '../api/projects';
import {
  getProjectTestScripts,
  getProjectTestScriptModules,
  deleteProjectTestScript,
  uploadProjectTestScripts,
} from '../api/projectTestScripts';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['draft', 'ready', 'deprecated'];

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { draft: 0, ready: 1, deprecated: 2 };

const SORTABLE_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'module', label: 'Module' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: 'created_by_name', label: 'Created By' },
];

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

export default function ProjectTestScripts() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [testScripts, setTestScripts] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sortKey, setSortKey] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedScripts = [...testScripts].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    if (sortKey === 'priority') {
      aVal = PRIORITY_ORDER[aVal] ?? 99;
      bVal = PRIORITY_ORDER[bVal] ?? 99;
    } else if (sortKey === 'status') {
      aVal = STATUS_ORDER[aVal] ?? 99;
      bVal = STATUS_ORDER[bVal] ?? 99;
    } else {
      aVal = (aVal || '').toString().toLowerCase();
      bVal = (bVal || '').toString().toLowerCase();
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ active, dir }) => (
    <svg className={`inline w-3 h-3 ml-1 ${active ? 'text-blue-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {!active ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l4 4 4-4" />
        </>
      ) : dir === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );

  const filters = {
    module: searchParams.get('module') || '',
    priority: searchParams.get('priority') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeFilters = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) activeFilters[k] = v; });
      const [proj, scripts, mods] = await Promise.all([
        getProject(projectId),
        getProjectTestScripts(projectId, activeFilters),
        getProjectTestScriptModules(projectId),
      ]);
      setProject(proj);
      setTestScripts(scripts);
      setModules(mods);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, searchParams.toString()]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilter('search', search);
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
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test script?')) return;
    try {
      await deleteProjectTestScript(projectId, id);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Link to={`/projects/${projectId}`} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Project
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Test Scripts {project ? `\u2014 ${project.name}` : ''}
        </h2>
        <div className="flex gap-2">
          <label className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer ${uploading ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {uploading ? 'Uploading...' : 'Upload Excel'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <Link
            to={`/projects/${projectId}/test-scripts/new`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            New Test Script
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {uploadResult && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
          <p className="font-medium text-green-800">
            Imported {uploadResult.imported} of {uploadResult.total_rows} test scripts.
          </p>
          {uploadResult.errors.length > 0 && (
            <ul className="mt-1 text-green-700">
              {uploadResult.errors.map((e, i) => (
                <li key={i}>Row {e.row}: {e.error}</li>
              ))}
            </ul>
          )}
          <button onClick={() => setUploadResult(null)} className="mt-1 text-xs text-green-600 underline">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
          <button type="submit" className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">
            Search
          </button>
        </form>

        <FuzzyFilter
          options={modules.map(m => ({ value: m, label: m }))}
          value={filters.module}
          onChange={(v) => updateFilter('module', v)}
          placeholder="All Modules"
        />

        <FuzzyFilter
          options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
          value={filters.priority}
          onChange={(v) => updateFilter('priority', v)}
          placeholder="All Priorities"
        />

        <FuzzyFilter
          options={STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          value={filters.status}
          onChange={(v) => updateFilter('status', v)}
          placeholder="All Statuses"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : testScripts.length === 0 ? (
        <p className="text-gray-500">No test scripts found. Create one to get started.</p>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {SORTABLE_COLUMNS.map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                    >
                      {label}<SortIcon active={sortKey === key} dir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedScripts.map((ts) => (
                  <tr key={ts.id} className="hover:bg-gray-50">
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
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[ts.status] || ''}`}>
                        {ts.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{ts.created_by_name || '\u2014'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link to={`/projects/${projectId}/test-scripts/${ts.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(ts.id)} className="text-sm text-red-600 hover:text-red-800">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Showing {testScripts.length} test script{testScripts.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  );
}
