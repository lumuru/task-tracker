import { authFetch } from './base';

export async function getProjectTestScripts(projectId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.module) params.set('module', filters.module);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  const query = params.toString();
  const res = await authFetch(`/api/projects/${projectId}/test-scripts${query ? '?' + query : ''}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch test scripts');
  }
  return res.json();
}

export async function getProjectTestScript(projectId, id) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch test script');
  }
  return res.json();
}

export async function getProjectTestScriptModules(projectId) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/modules`);
  if (!res.ok) throw new Error('Failed to fetch modules');
  return res.json();
}

export async function createProjectTestScript(projectId, data) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create test script');
  }
  return res.json();
}

export async function updateProjectTestScript(projectId, id, data) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update test script');
  }
  return res.json();
}

export async function deleteProjectTestScript(projectId, id, memberId) {
  const params = memberId ? `?member_id=${memberId}` : '';
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/${id}${params}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete test script');
  }
}

export async function bulkUpdateTestScriptStatus(projectId, ids, status) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/bulk-status`, {
    method: 'PATCH',
    body: JSON.stringify({ ids, status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update status');
  }
  return res.json();
}

export function exportProjectTestScriptsUrl(projectId) {
  const BASE_URL = import.meta.env.VITE_API_URL || '';
  return `${BASE_URL}/api/projects/${projectId}/test-scripts/export`;
}

export async function uploadProjectTestScripts(projectId, file, createdBy) {
  const formData = new FormData();
  formData.append('file', file);
  if (createdBy) formData.append('created_by', createdBy);

  const res = await authFetch(`/api/projects/${projectId}/test-scripts/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload file');
  return data;
}
