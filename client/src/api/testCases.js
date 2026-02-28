const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getTestCases(filters = {}) {
  const params = new URLSearchParams();
  if (filters.module) params.set('module', filters.module);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.project_id) params.set('project_id', filters.project_id);

  const query = params.toString();
  const res = await fetch(`${BASE_URL}/api/test-cases${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error('Failed to fetch test cases');
  return res.json();
}

export async function getTestCase(id) {
  const res = await fetch(`${BASE_URL}/api/test-cases/${id}`);
  if (!res.ok) throw new Error('Failed to fetch test case');
  return res.json();
}

export async function getModules() {
  const res = await fetch(`${BASE_URL}/api/test-cases/modules`);
  if (!res.ok) throw new Error('Failed to fetch modules');
  return res.json();
}

export async function createTestCase(data) {
  const res = await fetch(`${BASE_URL}/api/test-cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create test case');
  }
  return res.json();
}

export async function updateTestCase(id, data) {
  const res = await fetch(`${BASE_URL}/api/test-cases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update test case');
  }
  return res.json();
}

export async function uploadTestCases(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/api/test-cases/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to upload file');
  return data;
}

export async function deleteTestCase(id) {
  const res = await fetch(`${BASE_URL}/api/test-cases/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete test case');
  }
}
