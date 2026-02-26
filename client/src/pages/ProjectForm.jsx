import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProject, createProject, updateProject, addProjectMembers, removeProjectMember } from '../api/projects';
import { getMembers } from '../api/members';

const STATUSES = ['active', 'archived'];
const STATUS_LABELS = { active: 'Active', archived: 'Archived' };

export default function ProjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
    created_by: '',
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [existingMemberIds, setExistingMemberIds] = useState([]);

  useEffect(() => {
    getMembers().then(setMembers);

    if (isEditing) {
      getProject(id)
        .then((project) => {
          setForm({
            name: project.name || '',
            description: project.description || '',
            status: project.status || 'active',
            created_by: project.created_by || '',
          });
          const memberIds = project.members.map((m) => m.id);
          setSelectedMemberIds(memberIds);
          setExistingMemberIds(memberIds);
          setLoading(false);
        })
        .catch((err) => { setError(err.message); setLoading(false); });
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }

    try {
      if (isEditing) {
        await updateProject(id, {
          name: form.name,
          description: form.description,
          status: form.status,
        });

        // Determine members to add and remove
        const toAdd = selectedMemberIds.filter((mid) => !existingMemberIds.includes(mid));
        const toRemove = existingMemberIds.filter((mid) => !selectedMemberIds.includes(mid));

        if (toAdd.length > 0) {
          await addProjectMembers(id, toAdd);
        }
        for (const mid of toRemove) {
          await removeProjectMember(id, mid);
        }
      } else {
        await createProject({
          ...form,
          created_by: form.created_by || null,
          member_ids: selectedMemberIds,
        });
      }
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {isEditing ? 'Edit Project' : 'New Project'}
      </h2>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
              <select name="created_by" value={form.created_by} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">— Select —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Member assignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Assign Members</label>
          {members.length === 0 ? (
            <p className="text-sm text-gray-400">No team members available.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800">{member.name}</span>
                  <span className="text-xs text-gray-400">({member.role})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            {isEditing ? 'Update' : 'Create Project'}
          </button>
          <button type="button" onClick={() => navigate('/projects')} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
