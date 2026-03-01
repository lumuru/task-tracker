import { useState, useEffect } from 'react';
import { getMembers, createMember, updateMember, deleteMember } from '../api/members';
import { getSettings, updateSettings, getGenerationLogs } from '../api/settings';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const roleColors = {
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-gray-100 text-gray-600',
};

export default function Settings() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI settings state
  const [aiModel, setAiModel] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg, setAiMsg] = useState(null);

  // Generation logs state
  const [genLogs, setGenLogs] = useState([]);
  const [genLogsTotal, setGenLogsTotal] = useState(0);
  const [genLogsPage, setGenLogsPage] = useState(1);
  const [genLogsLoading, setGenLogsLoading] = useState(true);
  const genLogsLimit = 20;

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState(null);

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  const fetchMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setAiModel(s.ai_model || '');
        setAiThinking(s.ai_thinking_enabled === 'true');
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  const fetchGenLogs = (page) => {
    setGenLogsLoading(true);
    getGenerationLogs(page, genLogsLimit)
      .then((data) => {
        setGenLogs(data.logs);
        setGenLogsTotal(data.total);
        setGenLogsPage(data.page);
      })
      .catch(() => {})
      .finally(() => setGenLogsLoading(false));
  };

  useEffect(() => { fetchGenLogs(1); }, []);

  const handleAiSave = async () => {
    setAiSaving(true);
    setAiMsg(null);
    try {
      await updateSettings({
        ai_model: aiModel,
        ai_thinking_enabled: aiThinking ? 'true' : 'false',
      });
      setAiMsg({ type: 'success', text: 'AI settings saved' });
    } catch (err) {
      setAiMsg({ type: 'error', text: err.message });
    } finally {
      setAiSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('member');
    setPassword('');
    setIsActive(true);
    setFormError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setFormError('Name is required'); return; }
    if (!email.trim()) { setFormError('Email is required'); return; }
    if (!editingId && (!password || password.length < 6)) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      if (editingId) {
        const data = { name, email, role, is_active: isActive };
        if (password) data.password = password;
        await updateMember(editingId, data);
      } else {
        await createMember({ name, email, role, password });
      }
      resetForm();
      fetchMembers();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleEdit = (member) => {
    setEditingId(member.id);
    setName(member.name);
    setEmail(member.email || '');
    setRole(member.role);
    setPassword('');
    setIsActive(member.is_active);
    setShowForm(true);
    setFormError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await deleteMember(id);
      fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isAdmin) return null;

  return (
    <div>
      {/* AI Configuration */}
      <div className="mb-8 p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Configuration</h2>
        {aiLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            {aiMsg && (
              <div className={`mb-3 p-2 rounded text-sm ${aiMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {aiMsg.text}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. openai/gpt-4o"
                />
                <p className="mt-1 text-xs text-gray-500">OpenRouter model identifier</p>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiThinking}
                    onChange={(e) => setAiThinking(e.target.checked)}
                    className="rounded border-gray-300 h-4 w-4"
                  />
                  <div>
                    <span className="text-gray-700 font-medium">Thinking Mode</span>
                    <p className="text-xs text-gray-500">Enable for reasoning models (disables JSON response format)</p>
                  </div>
                </label>
              </div>
            </div>
            <button
              onClick={handleAiSave}
              disabled={aiSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {aiSaving ? 'Saving...' : 'Save AI Settings'}
            </button>
          </>
        )}
      </div>

      {/* AI Generation Log */}
      <div className="mb-8 p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Generation Log</h2>
        {genLogsLoading && genLogs.length === 0 ? (
          <p className="text-gray-500">Loading...</p>
        ) : genLogs.length === 0 ? (
          <p className="text-gray-500">No AI generations recorded yet.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-800">{genLogsTotal}</p>
                <p className="text-xs text-gray-500">Total Generations</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-800">
                  {genLogs.reduce((sum, l) => sum + (l.total_tokens || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Tokens (this page)</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-800">
                  ${genLogs.reduce((sum, l) => sum + (l.cost_estimate || 0), 0).toFixed(4)}
                </p>
                <p className="text-xs text-gray-500">Est. Cost (this page)</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prompt</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Completion</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Scripts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {genLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-2">
                        {log.project_id ? (
                          <Link to={`/projects/${log.project_id}`} className="text-blue-600 hover:text-blue-800">
                            {log.project_name || `Project #${log.project_id}`}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{log.user_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 font-mono text-xs">{log.model}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{(log.prompt_tokens || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{(log.completion_tokens || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-800 font-medium">{(log.total_tokens || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-600">${(log.cost_estimate || 0).toFixed(4)}</td>
                      <td className="px-3 py-2 text-right text-gray-800 font-medium">{log.scripts_generated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {genLogsTotal > genLogsLimit && (
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => fetchGenLogs(genLogsPage - 1)}
                  disabled={genLogsPage <= 1}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {genLogsPage} of {Math.ceil(genLogsTotal / genLogsLimit)}
                </span>
                <button
                  onClick={() => fetchGenLogs(genLogsPage + 1)}
                  disabled={genLogsPage >= Math.ceil(genLogsTotal / genLogsLimit)}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Add User
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            {editingId ? 'Edit User' : 'New User'}
          </h3>
          {formError && (
            <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingId ? 'New Password (leave blank to keep)' : 'Password *'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={editingId ? 'Leave blank to keep current' : 'Minimum 6 characters'}
              />
            </div>
          </div>

          {editingId && (
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700">Account active</span>
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : members.length === 0 ? (
        <p className="text-gray-500">No users yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className={!member.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{member.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.email || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${roleColors[member.role] || 'bg-gray-100 text-gray-600'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {member.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
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
