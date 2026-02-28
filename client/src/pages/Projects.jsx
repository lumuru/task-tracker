import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProjects, deleteProject } from '../api/projects';
import FuzzyFilter from '../components/FuzzyFilter';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

const statusLabels = {
  active: 'Active',
  archived: 'Archived',
};

function OverflowMenu({ onDelete, hasTestScripts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        title="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
          {hasTestScripts ? (
            <div className="px-4 py-2 text-sm text-gray-400 cursor-not-allowed" title="Cannot delete: has test scripts">
              Delete
              <span className="block text-xs text-gray-400">Has test scripts</span>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects(statusFilter ? { status: statusFilter } : {});
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <Link
          to="/projects/new"
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
        />
        <FuzzyFilter
          options={[{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Statuses"
        />
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Card Grid */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col"
            >
              {/* Status badge + overflow */}
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[project.status] || ''}`}>
                  {statusLabels[project.status] || project.status}
                </span>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/projects/${project.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit project"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </Link>
                  <OverflowMenu
                    onDelete={() => handleDelete(project.id)}
                    hasTestScripts={project.test_script_count > 0}
                  />
                </div>
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-800 mb-1 leading-tight">{project.name}</h3>

              {/* Description preview */}
              {project.description ? (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
              ) : (
                <p className="text-sm text-gray-300 italic mb-4">No description</p>
              )}

              {/* Stats */}
              <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5" title="Members">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.053M18 8.25a3 3 0 11-6 0 3 3 0 016 0zm-2.25 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  {project.member_count}
                </span>
                <span className="flex items-center gap-1.5" title="Test Scripts">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {project.test_script_count}
                </span>
              </div>

              {/* Created by */}
              {project.created_by_name && (
                <p className="text-xs text-gray-400 mt-2">Created by {project.created_by_name}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Showing {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
