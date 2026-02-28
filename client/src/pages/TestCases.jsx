import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTestCases, getModules } from '../api/testCases';
import { getProjects } from '../api/projects';
import FuzzyFilter from '../components/FuzzyFilter';

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

const execStatusConfig = {
  pass: { icon: '✓', color: 'text-green-600 bg-green-50', label: 'Pass' },
  fail: { icon: '✗', color: 'text-red-600 bg-red-50', label: 'Fail' },
  blocked: { icon: '⊘', color: 'text-yellow-600 bg-yellow-50', label: 'Blocked' },
  skipped: { icon: '—', color: 'text-gray-500 bg-gray-50', label: 'Skipped' },
  pending: { icon: '○', color: 'text-gray-400 bg-gray-50', label: 'Pending' },
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export default function TestCases() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [testCases, setTestCases] = useState([]);
  const [modules, setModules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortColumn, setSortColumn] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');

  const filters = {
    module: searchParams.get('module') || '',
    priority: searchParams.get('priority') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || '',
    project: searchParams.get('project') || '',
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeFilters = {};
      Object.entries(filters).forEach(([k, v]) => { if (v && k !== 'project') activeFilters[k] = v; });
      const [cases, mods, projs] = await Promise.all([
        getTestCases(activeFilters),
        getModules(),
        getProjects(),
      ]);
      setTestCases(cases);
      setModules(mods);
      setProjects(projs);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTestCases = filters.project
    ? testCases.filter(tc => {
        if (filters.project === 'unassigned') return !tc.project_id;
        return String(tc.project_id) === filters.project;
      })
    : testCases;

  // Client-side sorting
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const sortedTestCases = [...filteredTestCases].sort((a, b) => {
    let aVal, bVal;
    switch (sortColumn) {
      case 'title':
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
        break;
      case 'project':
        aVal = (a.project_name || '').toLowerCase();
        bVal = (b.project_name || '').toLowerCase();
        break;
      case 'module':
        aVal = (a.module || '').toLowerCase();
        bVal = (b.module || '').toLowerCase();
        break;
      case 'priority':
        aVal = priorityOrder[a.priority] ?? 99;
        bVal = priorityOrder[b.priority] ?? 99;
        break;
      case 'status':
        aVal = (a.status || '').toLowerCase();
        bVal = (b.status || '').toLowerCase();
        break;
      case 'last_result':
        aVal = a.last_exec_status || '';
        bVal = b.last_exec_status || '';
        break;
      case 'bugs':
        aVal = a.bug_count || 0;
        bVal = b.bug_count || 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
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

  // Stats
  const statusCounts = filteredTestCases.reduce((acc, tc) => {
    acc[tc.status] = (acc[tc.status] || 0) + 1;
    return acc;
  }, {});

  const SortHeader = ({ column, children }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <span className="text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  );

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

      {/* Summary Stats Bar */}
      {!loading && (
        <div className="mb-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-medium text-gray-700">{filteredTestCases.length} total</span>
          {STATUSES.map(s => {
            const count = statusCounts[s] || 0;
            if (count === 0) return null;
            return (
              <span key={s} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${statusColors[s]}`}>
                {capitalize(s)}: {count}
              </span>
            );
          })}
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
          options={[...projects.map(p => ({ value: String(p.id), label: p.name })), { value: 'unassigned', label: 'Unassigned' }]}
          value={filters.project}
          onChange={(v) => updateFilter('project', v)}
          placeholder="All Projects"
        />

        <FuzzyFilter
          options={modules.map(m => ({ value: m, label: m }))}
          value={filters.module}
          onChange={(v) => updateFilter('module', v)}
          placeholder="All Modules"
        />

        <FuzzyFilter
          options={PRIORITIES.map(p => ({ value: p, label: capitalize(p) }))}
          value={filters.priority}
          onChange={(v) => updateFilter('priority', v)}
          placeholder="All Priorities"
        />

        <FuzzyFilter
          options={STATUSES.map(s => ({ value: s, label: capitalize(s) }))}
          value={filters.status}
          onChange={(v) => updateFilter('status', v)}
          placeholder="All Statuses"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filteredTestCases.length === 0 ? (
        <p className="text-gray-500">No test cases found. Create one to get started.</p>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader column="title">Title</SortHeader>
                  <SortHeader column="project">Project</SortHeader>
                  <SortHeader column="module">Module</SortHeader>
                  <SortHeader column="priority">Priority</SortHeader>
                  <SortHeader column="status">Status</SortHeader>
                  <SortHeader column="last_result">Last Result</SortHeader>
                  <SortHeader column="bugs">Bugs</SortHeader>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedTestCases.map((tc) => {
                  const execCfg = tc.last_exec_status ? execStatusConfig[tc.last_exec_status] : null;
                  return (
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
                      <td className="px-4 py-3 text-sm text-gray-500">{tc.module || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${priorityColors[tc.priority] || ''}`}>
                          {capitalize(tc.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[tc.status] || ''}`}>
                          {capitalize(tc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {execCfg ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${execCfg.color}`}>
                            {execCfg.icon} {execCfg.label}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tc.bug_count > 0 ? (
                          <Link to={`/bugs?test_case_id=${tc.id}`} className="inline-block px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800 hover:bg-orange-200">
                            {tc.bug_count}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tc.created_by_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Showing {sortedTestCases.length} of {testCases.length} test cases
          </p>
        </>
      )}
    </div>
  );
}
