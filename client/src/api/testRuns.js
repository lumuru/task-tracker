import { authFetch } from './base';

export async function getTestRuns() {
  const res = await authFetch('/api/test-runs');
  if (!res.ok) throw new Error('Failed to fetch test runs');
  return res.json();
}

export async function getTestRun(id) {
  const res = await authFetch(`/api/test-runs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch test run');
  return res.json();
}

export async function createTestRun(data) {
  const res = await authFetch('/api/test-runs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create test run');
  }
  return res.json();
}

export async function updateTestRunResults(id, data) {
  const res = await authFetch(`/api/test-runs/${id}/results`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save results');
  }
  return res.json();
}

export async function deleteTestRun(id) {
  const res = await authFetch(`/api/test-runs/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete test run');
  }
  return res.json();
}

export async function exportTestRun(id) {
  const res = await authFetch(`/api/test-runs/${id}/export`);
  if (!res.ok) throw new Error('Failed to export test run');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : `Test Run ${id}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function getTestRunSummary(id) {
  const res = await authFetch(`/api/test-runs/${id}/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}
