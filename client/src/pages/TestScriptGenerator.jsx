import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { generateTestScripts, batchImportScripts, deleteAiGeneratedScripts } from '../api/generate';
import { getProject } from '../api/projects';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function censorFileName(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot !== -1 ? name.slice(dot) : '';
  const base = dot !== -1 ? name.slice(0, dot) : name;
  if (base.length <= 4) return '****' + ext;
  return base.slice(0, 3) + '*'.repeat(Math.min(base.length - 3, 20)) + ext;
}

const priorityColors = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const PRIORITIES = ['critical', 'high', 'medium', 'low'];

function isValidFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext);
}

// ── Upload Step ─────────────────────────────────────────────
function UploadStep({ onFileSelected, error }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-lg font-medium text-gray-700 mb-1">Drop your requirements file here</p>
        <p className="text-sm text-gray-500 mb-3">or click to browse</p>
        <p className="text-xs text-gray-400">Supported: .pdf, .docx, .xlsx (max 10MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={(e) => { if (e.target.files[0]) onFileSelected(e.target.files[0]); }}
          className="hidden"
        />
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        File will be encrypted (AES-256-GCM) before transmission
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
}

// ── Processing Step ─────────────────────────────────────────
function ProcessingStep({ fileName, progress }) {
  const steps = [
    { key: 'encrypt', label: 'Encrypting file...' },
    { key: 'init', label: 'Starting secure session...' },
    { key: 'upload-1', label: 'Uploading part 1 of 3...' },
    { key: 'upload-2', label: 'Uploading part 2 of 3...' },
    { key: 'upload-3', label: 'Uploading part 3 of 3...' },
    { key: 'generate', label: 'Generating test scripts with AI...' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === progress.step);
  const isGenerating = progress.step === 'generate';

  // Elapsed timer during AI generation
  const [elapsed, setElapsed] = useState(0);
  const [animatedPercent, setAnimatedPercent] = useState(70);

  useEffect(() => {
    if (!isGenerating) {
      setElapsed(0);
      setAnimatedPercent(progress.percent || 0);
      return;
    }
    setAnimatedPercent(70);
    const start = Date.now();
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(secs);
      // Slowly creep progress from 70% toward 95% over ~5 minutes
      setAnimatedPercent(70 + Math.min(25, (secs / 300) * 25));
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const displayPercent = isGenerating ? animatedPercent : (progress.percent || 0);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">{censorFileName(fileName)}</span>
      </div>

      <div className="space-y-3 mb-6">
        {steps.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              {isDone ? (
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : isCurrent ? (
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                </div>
              )}
              <span className={`text-sm ${isDone ? 'text-green-700' : isCurrent ? 'text-blue-700 font-medium' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {isCurrent && step.key === 'generate' && elapsed > 0 && (
                <span className="text-xs text-gray-400">{formatTime(elapsed)}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${displayPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">{Math.round(displayPercent)}%</p>
        {isGenerating && (
          <p className="text-xs text-gray-400">This may take a few minutes with thinking models</p>
        )}
      </div>
    </div>
  );
}

// ── Review Step ─────────────────────────────────────────────
function ReviewStep({ scripts, onImport, importing, error }) {
  const [selected, setSelected] = useState(() => new Set(scripts.map((_, i) => i)));
  const [expanded, setExpanded] = useState(null);
  const [editData, setEditData] = useState(() => scripts.map((s) => ({ ...s })));

  const toggleSelect = (i) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === scripts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(scripts.map((_, i) => i)));
    }
  };

  const updateField = (i, field, value) => {
    setEditData((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  };

  const selectedScripts = editData.filter((_, i) => selected.has(i));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Generated Test Scripts ({scripts.length})
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {selected.size === scripts.length ? 'Deselect All' : 'Select All'}
          </button>
          <button
            onClick={() => onImport(selectedScripts)}
            disabled={selected.size === 0 || importing}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'Importing...' : `Import Selected (${selected.size})`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {editData.map((script, i) => (
              <tr key={i} className={`${selected.has(i) ? '' : 'opacity-50'}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={script.title}
                    onChange={(e) => updateField(i, 'title', e.target.value)}
                    className="text-sm font-medium text-gray-800 bg-transparent border-0 p-0 w-full focus:ring-0 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={script.module}
                    onChange={(e) => updateField(i, 'module', e.target.value)}
                    className="text-sm text-gray-500 bg-transparent border-0 p-0 w-full focus:ring-0 focus:outline-none"
                  />
                </td>
                <td className="px-4 py-3">
                  <select
                    value={script.priority}
                    onChange={(e) => updateField(i, 'priority', e.target.value)}
                    className={`text-xs font-medium rounded px-2 py-0.5 border-0 ${priorityColors[script.priority] || ''}`}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {expanded === i ? 'Close' : 'Details'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail */}
      {expanded !== null && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-700">{editData[expanded].title}</h4>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Steps</label>
            <textarea
              value={editData[expanded].steps}
              onChange={(e) => updateField(expanded, 'steps', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Expected Result</label>
            <textarea
              value={editData[expanded].expected_result}
              onChange={(e) => updateField(expanded, 'expected_result', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Preconditions</label>
            <textarea
              value={editData[expanded].preconditions}
              onChange={(e) => updateField(expanded, 'preconditions', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Click any field to edit inline. Click "Details" to view/edit steps, expected results, and preconditions.
      </p>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function TestScriptGenerator() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState('upload'); // upload | processing | review | done
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState({ step: '', detail: '', percent: 0 });
  const [scripts, setScripts] = useState([]);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [showRegenWarning, setShowRegenWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    getProject(projectId).then((project) => {
      if (project.generated_at) {
        setGeneratedAt(project.generated_at);
      }
    }).catch(() => {});
  }, [projectId]);

  const proceedWithGeneration = async (selectedFile) => {
    setShowRegenWarning(false);
    setPendingFile(null);
    setFile(selectedFile);
    setPhase('processing');

    try {
      const result = await generateTestScripts(selectedFile, setProgress);
      setScripts(result);
      setPhase('review');
    } catch (err) {
      setError(err.message);
      setPhase('upload');
      setFile(null);
    }
  };

  const handleFileSelected = async (selectedFile) => {
    setError(null);

    if (!isValidFile(selectedFile)) {
      setError('Unsupported file type. Please use PDF, DOCX, or XLSX.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    if (generatedAt) {
      setPendingFile(selectedFile);
      setShowRegenWarning(true);
      return;
    }

    proceedWithGeneration(selectedFile);
  };

  const handleImport = async (selectedScripts) => {
    setImporting(true);
    setError(null);
    try {
      // Delete old AI-generated scripts before importing new ones
      if (generatedAt) {
        await deleteAiGeneratedScripts(projectId);
      }
      const result = await batchImportScripts(projectId, selectedScripts, 'ai_generated');
      setPhase('done');
      setTimeout(() => {
        navigate(`/projects/${projectId}`, { state: { importedCount: result.imported } });
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/projects/${projectId}`}
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to Project
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Generate Test Scripts from Requirements</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload a requirements document and AI will generate test scripts for your project.
        </p>
      </div>

      {showRegenWarning && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                AI scripts were previously generated on {new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Regenerating will replace all AI-generated scripts. Manual and imported scripts are not affected.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => proceedWithGeneration(pendingFile)}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Replace & Regenerate
                </button>
                <button
                  onClick={() => { setShowRegenWarning(false); setPendingFile(null); }}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'upload' && (
        <UploadStep onFileSelected={handleFileSelected} error={error} />
      )}

      {phase === 'processing' && (
        <ProcessingStep fileName={file?.name} progress={progress} />
      )}

      {phase === 'review' && (
        <ReviewStep
          scripts={scripts}
          onImport={handleImport}
          importing={importing}
          error={error}
        />
      )}

      {phase === 'done' && (
        <div className="max-w-lg mx-auto text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Test Scripts Imported!</h3>
          <p className="text-sm text-gray-500">Redirecting to project...</p>
        </div>
      )}
    </div>
  );
}
