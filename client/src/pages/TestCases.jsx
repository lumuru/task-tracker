import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTestCases, getModules } from '../api/testCases';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['draft', 'ready', 'deprecated'];

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

export default function TestCases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [testCases, setTestCases] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');

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
      const [cases, mods] = await Promise.all([
        getTestCases(activeFilters),
        getModules(),
      ]);
      setTestCases(cases);
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
  }, [searchParams.toString()]);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Test Cases</h2>
          <p className="text-sm text-gray-500 mt-1">Read-only view across all projects. Manage test scripts from within a project.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
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

        <select
          value={filters.module}
          onChange={(e) => updateFilter('module', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => updateFilter('priority', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : testCases.length === 0 ? (
        <p className="text-gray-500">No test cases found. Create one to get started.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {testCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {tc.project_id ? (
                      <Link to={`/projects/${tc.project_id}/test-scripts/${tc.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        {tc.title}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-800 font-medium">{tc.title}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tc.project_id ? (
                      <Link to={`/projects/${tc.project_id}`} className="text-sm text-blue-600 hover:text-blue-800">
                        {tc.project_name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tc.module || '\u2014'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityColors[tc.priority] || ''}`}>
                      {tc.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[tc.status] || ''}`}>
                      {tc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tc.created_by_name || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
