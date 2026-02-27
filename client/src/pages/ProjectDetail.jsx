import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProject, deleteProject, addProjectMembers, removeProjectMember } from '../api/projects';
import { getMembers } from '../api/members';
import { getProjectTestScripts } from '../api/projectTestScripts';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

const statusLabels = {
  active: 'Active',
  archived: 'Archived',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [testScripts, setTestScripts] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [projectData, membersData, scriptsData] = await Promise.all([
        getProject(id),
        getMembers(),
        getProjectTestScripts(id),
      ]);
      setProject(projectData);
      setAllMembers(membersData);
      setTestScripts(scriptsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    try {
      await addProjectMembers(id, [Number(selectedMember)]);
      setSelectedMember('');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await removeProjectMember(id, memberId);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !project) return <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>;
  if (!project) return <p className="text-gray-500">Loading...</p>;

  const assignedIds = new Set(project.members.map((m) => m.id));
  const availableMembers = allMembers.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-800 mb-1 inline-block">&larr; Back to Projects</Link>
          <h2 className="text-2xl font-bold text-gray-800">{project.name}</h2>
        </div>
        <div className="flex gap-2">
          <Link to={`/projects/${id}/edit`} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">Edit</Link>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">Delete</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        {/* Status */}
        <div className="flex gap-3 items-center">
          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[project.status] || ''}`}>
            {statusLabels[project.status] || project.status}
          </span>
          {project.created_by_name && (
            <span className="text-sm text-gray-500">Created by {project.created_by_name}</span>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}

        {/* Members */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Members ({project.members.length})</h3>
          {project.members.length === 0 ? (
            <p className="text-sm text-gray-400">No members assigned.</p>
          ) : (
            <ul className="space-y-1 mb-3">
              {project.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-md">
                  <span className="text-sm text-gray-800">
                    {member.name} <span className="text-gray-400">({member.role})</span>
                  </span>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {availableMembers.length > 0 && (
            <div className="flex gap-2">
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
              >
                <option value="">— Select member to add —</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Test Scripts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Test Scripts ({testScripts.length})</h3>
            <div className="flex gap-2">
              <Link to={`/projects/${id}/test-scripts`} className="text-xs text-blue-600 hover:text-blue-800">View All</Link>
              <Link to={`/projects/${id}/test-scripts/new`} className="text-xs text-blue-600 hover:text-blue-800">+ New</Link>
            </div>
          </div>
          {testScripts.length === 0 ? (
            <p className="text-sm text-gray-400">No test scripts yet.</p>
          ) : (
            <div className="space-y-1">
              {testScripts.slice(0, 5).map((ts) => (
                <Link key={ts.id} to={`/projects/${id}/test-scripts/${ts.id}`} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-md hover:bg-gray-100">
                  <span className="text-sm text-gray-800 truncate mr-3">{ts.title}</span>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-green-100 text-green-800' }[ts.priority] || ''
                    }`}>{ts.priority}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      { draft: 'bg-gray-100 text-gray-800', ready: 'bg-blue-100 text-blue-800', deprecated: 'bg-red-50 text-red-600' }[ts.status] || ''
                    }`}>{ts.status}</span>
                  </div>
                </Link>
              ))}
              {testScripts.length > 5 && (
                <Link to={`/projects/${id}/test-scripts`} className="block text-center text-sm text-blue-600 hover:text-blue-800 py-1">
                  View all {testScripts.length} test scripts
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 space-y-1">
          <p>Created: {project.created_at}</p>
          <p>Updated: {project.updated_at}</p>
        </div>
      </div>
    </div>
  );
}
