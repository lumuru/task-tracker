const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getBugs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
  if (filters.module) params.set('module', filters.module);
  if (filters.search) params.set('search', filters.search);

  const query = params.toString();
  const res = await fetch(`${BASE_URL}/api/bugs${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error('Failed to fetch bugs');
  return res.json();
}

export async function getBug(id) {
  const res = await fetch(`${BASE_URL}/api/bugs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch bug');
  return res.json();
}

export async function getBugModules() {
  const res = await fetch(`${BASE_URL}/api/bugs/modules`);
  if (!res.ok) throw new Error('Failed to fetch modules');
  return res.json();
}

export async function createBug(data) {
  const res = await fetch(`${BASE_URL}/api/bugs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create bug');
  }
  return res.json();
}

export async function updateBug(id, data) {
  const res = await fetch(`${BASE_URL}/api/bugs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update bug');
  }
  return res.json();
}

export async function deleteBug(id) {
  const res = await fetch(`${BASE_URL}/api/bugs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete bug');
  }
}
