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
    const text = await res.text();
    let msg = 'Failed to fetch test scripts';
    try { msg = JSON.parse(text).error || msg; } catch (_) {}
    throw new Error(msg);
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

export async function exportProjectTestScripts(projectId) {
  const res = await authFetch(`/api/projects/${projectId}/test-scripts/export`);
  if (!res.ok) {
    const text = await res.text();
    let msg = 'Failed to export test scripts';
    try { msg = JSON.parse(text).error || msg; } catch (_) {}
    throw new Error(msg);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : `Test Scripts.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
