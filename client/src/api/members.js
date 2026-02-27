const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getMembers() {
  const res = await fetch(`${BASE_URL}/api/members`);
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export async function createMember(data) {
  const res = await fetch(`${BASE_URL}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create member');
  }
  return res.json();
}

export async function updateMember(id, data) {
  const res = await fetch(`${BASE_URL}/api/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update member');
  }
  return res.json();
}

export async function deleteMember(id) {
  const res = await fetch(`${BASE_URL}/api/members/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete member');
  }
}
