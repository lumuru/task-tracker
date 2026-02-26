import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTestRun, updateTestRunResults, getTestRunSummary } from '../api/testRuns';
import { getMembers } from '../api/members';

const RESULT_OPTIONS = ['pending', 'pass', 'fail', 'blocked', 'skipped'];

const statusStyles = {
  pending: 'bg-gray-100 text-gray-600',
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  blocked: 'bg-yellow-100 text-yellow-800',
  skipped: 'bg-gray-200 text-gray-600',
};

const summaryColors = {
  passed: 'bg-green-500',
  failed: 'bg-red-500',
  blocked: 'bg-yellow-500',
  skipped: 'bg-gray-400',
  pending: 'bg-gray-200',
};

export default function TestRunExecution() {
  const { id } = useParams();
  const [run, setRun] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [executedBy, setExecutedBy] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = async () => {
    try {
      const [runData, mems, summ] = await Promise.all([
        getTestRun(id),
        getMembers(),
        getTestRunSummary(id),
      ]);
      setRun(runData);
      setResults(runData.results.map((r) => ({
        test_case_id: r.test_case_id,
        title: r.test_case_title,
        module: r.module,
        priority: r.priority,
        status: r.status,
        notes: r.notes || '',
      })));
      setMembers(mems);
      setSummary(summ);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const updateResult = (index, field, value) => {
    setResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTestRunResults(id, {
        executed_by: executedBy || null,
        results: results.map((r) => ({
          test_case_id: r.test_case_id,
          status: r.status,
          notes: r.notes,
        })),
      });
      const summ = await getTestRunSummary(id);
      setSummary(summ);
      setSaved(true);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !run) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!run) return <p className="text-gray-500">Loading...</p>;

  // Compute live summary from local state
  const liveCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const total = results.length;
  const executed = total - (liveCounts.pending || 0);
  const livePassRate = executed > 0 ? Math.round(((liveCounts.pass || 0) / executed) * 100) : 0;

  return (
    <div>
      <Link to="/test-runs" className="text-sm text-blue-600 hover:text-blue-800 mb-1 inline-block">&larr; Back to Test Runs</Link>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{run.name}</h2>
          <p className="text-sm text-gray-500">
            {run.date && <span>{run.date} &middot; </span>}
            {run.environment && <span>{run.environment} &middot; </span>}
            {total} test cases
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={executedBy}
            onChange={(e) => setExecutedBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Executed by...</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? 'Saving...' : 'Save Results'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
      {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">Results saved successfully.</div>}

      {/* Summary bar */}
      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-700">Progress: {executed}/{total} executed</span>
          <span className="font-medium text-gray-700">Pass rate: {livePassRate}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
          {['pass', 'fail', 'blocked', 'skipped'].map((status) => {
            const count = liveCounts[status] || 0;
            if (count === 0) return null;
            return (
              <div
                key={status}
                className={summaryColors[status === 'pass' ? 'passed' : status === 'fail' ? 'failed' : status]}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${status}: ${count}`}
              />
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Pass: {liveCounts.pass || 0}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Fail: {liveCounts.fail || 0}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Blocked: {liveCounts.blocked || 0}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> Skipped: {liveCounts.skipped || 0}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" /> Pending: {liveCounts.pending || 0}</span>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Case</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">Result</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {results.map((r, i) => (
              <tr key={r.test_case_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link to={`/test-cases/${r.test_case_id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{r.module || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    onChange={(e) => updateResult(i, 'status', e.target.value)}
                    className={`px-2 py-1 text-xs font-medium rounded border-0 ${statusStyles[r.status]}`}
                  >
                    {RESULT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={r.notes}
                    onChange={(e) => updateResult(i, 'notes', e.target.value)}
                    placeholder="Add notes..."
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'fail' && (
                    <Link
                      to={`/bugs/new?test_case_id=${r.test_case_id}`}
                      className="text-xs text-orange-600 hover:text-orange-800 font-medium whitespace-nowrap"
                    >
                      File Bug
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
