const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getProjects(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  const res = await fetch(`${BASE_URL}/api/projects${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function getProject(id) {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function createProject(data) {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create project');
  }
  return res.json();
}

export async function updateProject(id, data) {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update project');
  }
  return res.json();
}

export async function deleteProject(id) {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete project');
  }
}

export async function getProjectMembers(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`);
  if (!res.ok) throw new Error('Failed to fetch project members');
  return res.json();
}

export async function addProjectMembers(projectId, memberIds) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member_ids: memberIds }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add members');
  }
  return res.json();
}

export async function removeProjectMember(projectId, memberId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${memberId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to remove member');
  }
}

export async function getProjectActivity(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/activity`);
  if (!res.ok) throw new Error('Failed to fetch project activity');
  return res.json();
}
