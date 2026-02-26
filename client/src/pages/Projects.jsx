import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, deleteProject } from '../api/projects';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

const statusLabels = {
  active: 'Active',
  archived: 'Archived',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(id);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <Link to="/projects/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          New Project
        </Link>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Scripts</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/projects/${project.id}`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[project.status] || ''}`}>
                      {statusLabels[project.status] || project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{project.member_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{project.test_script_count}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link to={`/projects/${project.id}/edit`} className="text-sm text-blue-600 hover:text-blue-800">Edit</Link>
                    <button onClick={() => handleDelete(project.id)} className="text-sm text-red-600 hover:text-red-800">Delete</button>
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
