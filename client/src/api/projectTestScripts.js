const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getProjectTestScripts(projectId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.module) params.set('module', filters.module);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  const query = params.toString();
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts${query ? '?' + query : ''}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch test scripts');
  }
  return res.json();
}

export async function getProjectTestScript(projectId, id) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch test script');
  }
  return res.json();
}

export async function getProjectTestScriptModules(projectId) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts/modules`);
  if (!res.ok) throw new Error('Failed to fetch modules');
  return res.json();
}

export async function createProjectTestScript(projectId, data) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create test script');
  }
  return res.json();
}

export async function updateProjectTestScript(projectId, id, data) {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts/${id}${params}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete test script');
  }
}

export function exportProjectTestScriptsUrl(projectId) {
  return `${BASE_URL}/api/projects/${projectId}/test-scripts/export`;
}

export async function uploadProjectTestScripts(projectId, file, createdBy) {
  const formData = new FormData();
  formData.append('file', file);
  if (createdBy) formData.append('created_by', createdBy);

  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/test-scripts/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload file');
  return data;
}
