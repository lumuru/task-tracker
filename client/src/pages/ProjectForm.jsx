import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { getProject, getProjects, createProject, updateProject, addProjectMembers, removeProjectMember } from '../api/projects';
import { getMembers } from '../api/members';

const STATUSES = ['active', 'archived'];
const STATUS_LABELS = { active: 'Active', archived: 'Archived' };
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

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
    priority: 'medium',
    created_by: '',
  });
  const [createdByName, setCreatedByName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [existingMemberIds, setExistingMemberIds] = useState([]);
  const [addMemberValue, setAddMemberValue] = useState('');
  const [searchParams] = useSearchParams();
  const [projectType, setProjectType] = useState(searchParams.get('parent_id') ? 'sub' : 'main');
  const [parentId, setParentId] = useState(searchParams.get('parent_id') || '');
  const [mainProjects, setMainProjects] = useState([]);

  useEffect(() => {
    getMembers().then(setMembers);

    // Fetch main projects (projects with no parent) for the parent dropdown
    getProjects().then((all) => {
      const mains = all.filter(p => !p.parent_id);
      setMainProjects(mains);
    });

    if (isEditing) {
      getProject(id)
        .then((project) => {
          setForm({
            name: project.name || '',
            description: project.description || '',
            status: project.status || 'active',
            priority: project.priority || 'medium',
            created_by: project.created_by || '',
          });
          setCreatedByName(project.created_by_name || '');
          if (project.parent_id) {
            setProjectType('sub');
            setParentId(String(project.parent_id));
          }
          const memberIds = project.members.map((m) => m.id);
          setSelectedMemberIds(memberIds);
          setExistingMemberIds(memberIds);
          setLoading(false);
        })
        .catch((err) => { setError(err.message); setLoading(false); });
    }
  }, [id]);

  useEffect(() => {
    if (!isEditing && projectType === 'sub' && parentId) {
      getProject(parentId).then((parent) => {
        const parentMemberIds = parent.members.map(m => m.id);
        setSelectedMemberIds(parentMemberIds);
      }).catch(() => {});
    }
  }, [parentId, projectType, isEditing]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddMember = () => {
    if (!addMemberValue) return;
    const mid = Number(addMemberValue);
    if (!selectedMemberIds.includes(mid)) {
      setSelectedMemberIds([...selectedMemberIds, mid]);
    }
    setAddMemberValue('');
  };

  const handleRemoveMember = (mid) => {
    setSelectedMemberIds(selectedMemberIds.filter((id) => id !== mid));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && projectType === 'sub' && !parentId) {
      setError('Please select a parent project');
      return;
    }
    if (!form.name.trim()) { setError('Name is required'); return; }

    try {
      if (isEditing) {
        await updateProject(id, {
          name: form.name,
          description: form.description,
          status: form.status,
          priority: form.priority,
        });

        const toAdd = selectedMemberIds.filter((mid) => !existingMemberIds.includes(mid));
        const toRemove = existingMemberIds.filter((mid) => !selectedMemberIds.includes(mid));

        if (toAdd.length > 0) {
          await addProjectMembers(id, toAdd);
        }
        for (const mid of toRemove) {
          await removeProjectMember(id, mid);
        }

        navigate(`/projects/${id}`);
      } else {
        const created = await createProject({
          ...form,
          created_by: form.created_by || null,
          member_ids: selectedMemberIds,
          parent_id: projectType === 'sub' ? Number(parentId) : null,
        });
        navigate(`/projects/${created.id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;

  const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
  const availableMembers = members.filter((m) => !selectedMemberIds.includes(m.id));

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link to={isEditing ? `/projects/${id}` : '/projects'} className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
          &larr; {isEditing ? 'Back to Project' : 'Back to Projects'}
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Project' : 'New Project'}
        </h2>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project Type — only in create mode */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project Type</label>
            <div className="flex gap-3">
              <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${projectType === 'main' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <input type="radio" name="projectType" value="main" checked={projectType === 'main'} onChange={() => { setProjectType('main'); setParentId(''); setSelectedMemberIds([]); }} className="sr-only" />
                Main Project
              </label>
              <label className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${projectType === 'sub' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                <input type="radio" name="projectType" value="sub" checked={projectType === 'sub'} onChange={() => setProjectType('sub')} className="sr-only" />
                Sub-Project
              </label>
            </div>
          </div>
        )}

        {/* Parent Project — only when Sub-Project type selected in create mode */}
        {!isEditing && projectType === 'sub' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Project *</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select main project —</option>
              {mainProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Parent Project — read-only in edit mode */}
        {isEditing && projectType === 'sub' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Project</label>
            <p className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              <Link to={`/projects/${parentId}`} className="text-blue-600 hover:text-blue-800">
                {mainProjects.find(p => p.id === Number(parentId))?.name || 'Loading...'}
              </Link>
            </p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter project name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the project..."
          />
        </div>

        {/* Status + Priority + Created By */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          {isEditing ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
              <p className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                {createdByName || 'Unknown'}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
              <select
                name="created_by"
                value={form.created_by}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">— Select —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Member assignment with chips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Members ({selectedMemberIds.length})
          </label>

          {/* Selected members as chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 text-sm rounded-full border border-blue-200"
                >
                  <span className="font-medium">{member.name}</span>
                  <span className="text-blue-500 text-xs">({member.role})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.id)}
                    className="ml-1 text-blue-400 hover:text-red-600 hover:bg-red-50 rounded-full p-0.5 transition-colors"
                    title={`Remove ${member.name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add member dropdown */}
          {availableMembers.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={addMemberValue}
                onChange={(e) => setAddMemberValue(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm flex-1"
              >
                <option value="">— Select member to add —</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!addMemberValue}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {members.length === 0 ? 'No team members available.' : 'All members assigned.'}
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-3">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEditing ? 'Update Project' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => navigate(isEditing ? `/projects/${id}` : '/projects')}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
