import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTestRuns, createTestRun } from '../api/testRuns';
import { getTestCases } from '../api/testCases';
import { getMembers } from '../api/members';

export default function TestRuns() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [testCases, setTestCases] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', environment: '', date: '', created_by: '' });
  const [selectedCases, setSelectedCases] = useState([]);
  const [formError, setFormError] = useState(null);

  const fetchRuns = async () => {
    try {
      const data = await getTestRuns();
      setRuns(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, []);

  const openForm = async () => {
    try {
      const [cases, mems] = await Promise.all([
        getTestCases({ status: 'ready' }),
        getMembers(),
      ]);
      setTestCases(cases);
      setMembers(mems);
      setForm({ name: '', environment: '', date: new Date().toISOString().slice(0, 10), created_by: '' });
      setSelectedCases([]);
      setFormError(null);
      setShowForm(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleCase = (id) => {
    setSelectedCases((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCases.length === testCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(testCases.map((tc) => tc.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (selectedCases.length === 0) { setFormError('Select at least one test case'); return; }

    try {
      await createTestRun({
        ...form,
        created_by: form.created_by || null,
        test_case_ids: selectedCases,
      });
      setShowForm(false);
      fetchRuns();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const passRate = (run) => {
    const executed = run.total - (run.total - run.passed - run.failed - run.blocked - run.skipped);
    if (executed === 0) return '—';
    return Math.round((run.passed / executed) * 100) + '%';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Runs</h2>
        {!showForm && (
          <button onClick={openForm} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            New Test Run
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Create Test Run</h3>
          {formError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{formError}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sprint 12 Regression"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <input
                type="text"
                value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value })}
                placeholder="e.g. Staging, Production"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
            <select
              value={form.created_by}
              onChange={(e) => setForm({ ...form, created_by: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">— Select —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Test Cases * ({selectedCases.length} selected)
              </label>
              <button type="button" onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800">
                {selectedCases.length === testCases.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            {testCases.length === 0 ? (
              <p className="text-sm text-gray-500">No test cases with "Ready" status. Mark test cases as Ready first.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {testCases.map((tc) => (
                  <label key={tc.id} className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(tc.id)}
                      onChange={() => toggleCase(tc.id)}
                      className="mr-2"
                    />
                    <span className="flex-1">{tc.title}</span>
                    {tc.module && <span className="text-xs text-gray-400 ml-2">{tc.module}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              Create Run
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : runs.length === 0 ? (
        <p className="text-gray-500">No test runs yet. Create one to get started.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Results</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/test-runs/${run.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      {run.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{run.date || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{run.environment || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 text-xs">
                      {run.passed > 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded">{run.passed}P</span>}
                      {run.failed > 0 && <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded">{run.failed}F</span>}
                      {run.blocked > 0 && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">{run.blocked}B</span>}
                      {run.skipped > 0 && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{run.skipped}S</span>}
                      {run.total === 0 && <span className="text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{passRate(run)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{run.created_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
