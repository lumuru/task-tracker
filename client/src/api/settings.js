import { authFetch } from './base';

export async function getSettings() {
  const res = await authFetch('/api/settings');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to fetch settings');
  }
  return res.json();
}

export async function updateSettings(data) {
  const res = await authFetch('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to update settings');
  }
  return res.json();
}
