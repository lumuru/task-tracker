import { authFetch } from './base';

export async function getBugs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  if (filters.module) params.set('module', filters.module);
  if (filters.search) params.set('search', filters.search);
  if (filters.test_case_id) params.set('test_case_id', filters.test_case_id);
  if (filters.project_id) params.set('project_id', filters.project_id);

  const query = params.toString();
  const res = await authFetch(`/api/bugs${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error('Failed to fetch bugs');
  return res.json();
}

export async function getBug(id) {
  const res = await authFetch(`/api/bugs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch bug');
  return res.json();
}

export async function getBugModules() {
  const res = await authFetch('/api/bugs/modules');
  if (!res.ok) throw new Error('Failed to fetch modules');
  return res.json();
}

export async function createBug(data) {
  const res = await authFetch('/api/bugs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create bug');
  }
  return res.json();
}

export async function updateBug(id, data) {
  const res = await authFetch(`/api/bugs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update bug');
  }
  return res.json();
}

export async function deleteBug(id) {
  const res = await authFetch(`/api/bugs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete bug');
  }
}
