import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getBugs, getBugModules, deleteBug } from '../api/bugs';
import { getMembers } from '../api/members';
import { getProjects } from '../api/projects';
import FuzzyFilter from '../components/FuzzyFilter';

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const STATUSES = ['new', 'open', 'in_progress', 'fixed', 'verified', 'closed'];

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

const statusLabels = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  fixed: 'Fixed',
  verified: 'Verified',
  closed: 'Closed',
};

export default function Bugs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bugs, setBugs] = useState([]);
  const [modules, setModules] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const filters = {
    status: searchParams.get('status') || '',
    severity: searchParams.get('severity') || '',
    priority: searchParams.get('priority') || '',
    assigned_to: searchParams.get('assigned_to') || '',
    module: searchParams.get('module') || '',
    project_id: searchParams.get('project_id') || '',
    search: searchParams.get('search') || '',
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const activeFilters = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) activeFilters[k] = v; });
      const [bugsData, modsData, memsData, projsData] = await Promise.all([
        getBugs(activeFilters),
        getBugModules(),
        getMembers(),
        getProjects(),
      ]);
      setBugs(bugsData);
      setModules(modsData);
      setMembers(memsData);
      setProjects(projsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [searchParams.toString()]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilter('search', search);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bug?')) return;
    try {
      await deleteBug(id);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Bugs</h2>
        <Link to="/bugs/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          Report Bug
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          <button type="submit" className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">Search</button>
        </form>

        <FuzzyFilter
          options={projects.map(p => ({ value: String(p.id), label: p.name }))}
          value={filters.project_id}
          onChange={(v) => updateFilter('project_id', v)}
          placeholder="All Projects"
        />

        <FuzzyFilter
          options={STATUSES.map(s => ({ value: s, label: statusLabels[s] }))}
          value={filters.status}
          onChange={(v) => updateFilter('status', v)}
          placeholder="All Statuses"
        />

        <FuzzyFilter
          options={SEVERITIES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          value={filters.severity}
          onChange={(v) => updateFilter('severity', v)}
          placeholder="All Severities"
        />

        <FuzzyFilter
          options={PRIORITIES.map(p => ({ value: p, label: p }))}
          value={filters.priority}
          onChange={(v) => updateFilter('priority', v)}
          placeholder="All Priorities"
        />

        <FuzzyFilter
          options={members.map(m => ({ value: String(m.id), label: m.name }))}
          value={filters.assigned_to}
          onChange={(v) => updateFilter('assigned_to', v)}
          placeholder="All Assignees"
        />

        <FuzzyFilter
          options={modules.map(m => ({ value: m, label: m }))}
          value={filters.module}
          onChange={(v) => updateFilter('module', v)}
          placeholder="All Modules"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : bugs.length === 0 ? (
        <p className="text-gray-500">No bugs found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
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
                  <td className="px-4 py-3 text-sm">
                    {bug.project_id ? (
                      <Link to={`/projects/${bug.project_id}`} className="text-blue-600 hover:text-blue-800">{bug.project_name}</Link>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[bug.status] || ''}`}>
                      {statusLabels[bug.status] || bug.status}
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
                  <td className="px-4 py-3 text-sm text-gray-500">{bug.assigned_to_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{bug.module || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link to={`/bugs/${bug.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">Edit</Link>
                    <button onClick={() => handleDelete(bug.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
