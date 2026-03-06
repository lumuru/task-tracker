import { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTestRun, updateTestRunResults, getTestRunSummary, exportTestRun } from '../api/testRuns';
import { getMembers } from '../api/members';
import { createBug } from '../api/bugs';
import { getProject } from '../api/projects';

const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const BUG_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

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
  const [expandedId, setExpandedId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [bugModal, setBugModal] = useState(null);
  const [bugForm, setBugForm] = useState({});
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugSuccess, setBugSuccess] = useState(false);
  const [bugError, setBugError] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [filedBugs, setFiledBugs] = useState(new Set());
  const [confirmBug, setConfirmBug] = useState(null);
  const pendingHref = useRef(null);
  const navigate = useNavigate();
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

  // Block browser tab close / refresh
  useEffect(() => {
    const handler = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Intercept all in-app link clicks when dirty
  useEffect(() => {
    const handler = (e) => {
      if (!dirtyRef.current) return;
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('blob:')) return;
      e.preventDefault();
      pendingHref.current = href;
      setShowSavePrompt(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  const handleDiscardNav = () => {
    setShowSavePrompt(false);
    setIsDirty(false);
    if (pendingHref.current) {
      navigate(pendingHref.current);
      pendingHref.current = null;
    }
  };

  const handleSaveAndNav = async () => {
    setShowSavePrompt(false);
    await handleSave();
    setIsDirty(false);
    if (pendingHref.current) {
      navigate(pendingHref.current);
      pendingHref.current = null;
    }
  };

  const handleCancelNav = () => {
    setShowSavePrompt(false);
    pendingHref.current = null;
  };

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
        steps: r.steps || '',
        preconditions: r.preconditions || '',
        expected_result: r.expected_result || '',
        description: r.description || '',
      })));
      const savedExecutor = runData.results.find((r) => r.executed_by)?.executed_by;
      if (savedExecutor) setExecutedBy(String(savedExecutor));
      setMembers(mems);
      setSummary(summ);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // Fetch project name for bug modal display
  useEffect(() => {
    if (run?.project_id) {
      getProject(run.project_id).then(p => setProjectName(p.name)).catch(() => {});
    }
  }, [run?.project_id]);

  const openBugModal = (r, skipConfirm) => {
    if (!skipConfirm && filedBugs.has(r.test_case_id)) {
      setConfirmBug(r);
      return;
    }
    setConfirmBug(null);
    setBugModal(r);
    setBugForm({
      title: `Bug: ${r.title}`,
      description: r.notes || '',
      steps_to_reproduce: r.steps || '',
      severity: 'major',
      priority: 'P2',
    });
    setBugSuccess(false);
    setBugError(null);
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugForm.title.trim()) { setBugError('Title is required'); return; }
    setBugSubmitting(true);
    setBugError(null);
    try {
      await createBug({
        title: bugForm.title,
        description: bugForm.description,
        steps_to_reproduce: bugForm.steps_to_reproduce,
        severity: bugForm.severity,
        priority: bugForm.priority,
        status: 'new',
        module: bugModal.module || '',
        project_id: run.project_id || null,
        test_case_id: bugModal.test_case_id || null,
        reported_by: executedBy || null,
        assigned_to: null,
      });
      setFiledBugs(prev => new Set(prev).add(bugModal.test_case_id));
      setBugSuccess(true);
      setTimeout(() => { setBugModal(null); setBugSuccess(false); }, 1500);
    } catch (err) {
      setBugError(err.message);
    } finally {
      setBugSubmitting(false);
    }
  };

  const updateResult = (index, field, value) => {
    setResults((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setSaved(false);
    setIsDirty(true);
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
      setIsDirty(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportTestRun(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
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
            onChange={(e) => { setExecutedBy(e.target.value); setIsDirty(true); }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Executed by...</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {!liveCounts.pending && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`px-4 py-2 text-sm font-medium rounded-md text-white ${exporting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {exporting ? 'Exporting...' : 'Download Report'}
            </button>
          )}
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
            {results.map((r, i) => {
              const isExpanded = expandedId === r.test_case_id;
              const hasDetails = r.steps || r.preconditions || r.expected_result || r.description;
              return (
                <Fragment key={r.test_case_id}>
                  <tr className={`hover:bg-gray-50 ${isExpanded ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.test_case_id)}
                          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          title={isExpanded ? 'Collapse' : 'Show test steps'}
                        >
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.test_case_id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium text-left"
                        >
                          {r.title}
                        </button>
                      </div>
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
                        <div className="flex items-center justify-end gap-2">
                          {filedBugs.has(r.test_case_id) && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Bug Filed
                            </span>
                          )}
                          <button
                            onClick={() => openBugModal(r)}
                            className="text-xs text-orange-600 hover:text-orange-800 font-medium whitespace-nowrap"
                          >
                            {filedBugs.has(r.test_case_id) ? 'File Another' : 'File Bug'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-0 py-0">
                        <div className="px-6 py-4 bg-blue-50/70 border-t border-b border-blue-100">
                          {!hasDetails ? (
                            <p className="text-sm text-gray-400 italic">No steps defined for this test case.</p>
                          ) : (
                            <div className="grid gap-3 text-sm">
                              {r.preconditions && (
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-1">Preconditions</h4>
                                  <p className="text-gray-600 whitespace-pre-line">{r.preconditions}</p>
                                </div>
                              )}
                              {r.steps && (
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-1">Steps</h4>
                                  {r.steps.includes('\n') ? (
                                    <ol className="list-decimal list-inside text-gray-600 space-y-1">
                                      {r.steps.split('\n').filter(Boolean).map((step, si) => (
                                        <li key={si}>{step.replace(/^\d+[\.\)]\s*/, '')}</li>
                                      ))}
                                    </ol>
                                  ) : (
                                    <p className="text-gray-600">{r.steps}</p>
                                  )}
                                </div>
                              )}
                              {r.expected_result && (
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-1">Expected Result</h4>
                                  <p className="text-gray-600 whitespace-pre-line">{r.expected_result}</p>
                                </div>
                              )}
                              {!r.steps && r.description && (
                                <div>
                                  <h4 className="font-semibold text-gray-700 mb-1">Description</h4>
                                  <p className="text-gray-600 whitespace-pre-line">{r.description}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm filing another bug */}
      {confirmBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Bug Already Filed</h3>
            <p className="text-sm text-gray-600 mb-5">
              You already filed a bug for <span className="font-medium">"{confirmBug.title}"</span>. Do you want to file another?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmBug(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => openBugModal(confirmBug, true)}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
              >
                File Another Bug
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug filing modal */}
      {bugModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">File Bug</h3>
                <button onClick={() => setBugModal(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {bugSuccess ? (
                <div className="p-4 bg-green-50 text-green-700 rounded-md text-sm">Bug filed successfully!</div>
              ) : (
                <form onSubmit={handleBugSubmit} className="space-y-4">
                  {bugError && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{bugError}</div>}

                  {/* Read-only context */}
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Project</span>
                      <span className="text-gray-700">{projectName || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Module</span>
                      <span className="text-gray-700">{bugModal.module || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-gray-500 mb-1">Test Case</span>
                      <span className="text-gray-700 truncate block" title={bugModal.title}>{bugModal.title}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={bugForm.title}
                      onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={bugForm.description}
                      onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Steps to Reproduce</label>
                    <textarea
                      value={bugForm.steps_to_reproduce}
                      onChange={(e) => setBugForm({ ...bugForm, steps_to_reproduce: e.target.value })}
                      rows={3}
                      placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                      <select
                        value={bugForm.severity}
                        onChange={(e) => setBugForm({ ...bugForm, severity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={bugForm.priority}
                        onChange={(e) => setBugForm({ ...bugForm, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {BUG_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Reported by: {members.find(m => String(m.id) === String(executedBy))?.name || 'Not selected'}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBugModal(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bugSubmitting}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md ${bugSubmitting ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'}`}
                    >
                      {bugSubmitting ? 'Filing...' : 'File Bug'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes prompt */}
      {showSavePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 mb-5">
              You have unsaved test results. Would you like to save before leaving?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDiscardNav}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Discard
              </button>
              <button
                onClick={handleCancelNav}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndNav}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
