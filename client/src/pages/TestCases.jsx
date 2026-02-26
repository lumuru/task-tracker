import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTestCases, getModules, deleteTestCase, uploadTestCases } from '../api/testCases';

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
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadTestCases(file);
      setUploadResult(result);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test case?')) return;
    try {
      await deleteTestCase(id);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Cases</h2>
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
            to="/test-cases/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            New Test Case
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {uploadResult && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
          <p className="font-medium text-green-800">
            Imported {uploadResult.imported} of {uploadResult.total_rows} test cases.
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {testCases.map((tc) => (
                <tr key={tc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/test-cases/${tc.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      {tc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{tc.module || '—'}</td>
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
                  <td className="px-4 py-3 text-sm text-gray-500">{tc.created_by_name || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link to={`/test-cases/${tc.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(tc.id)} className="text-sm text-red-600 hover:text-red-800">
                      Delete
                    </button>
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
