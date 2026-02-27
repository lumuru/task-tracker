const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function getTestRuns() {
  const res = await fetch(`${BASE_URL}/api/test-runs`);
  if (!res.ok) throw new Error('Failed to fetch test runs');
  return res.json();
}

export async function getTestRun(id) {
  const res = await fetch(`${BASE_URL}/api/test-runs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch test run');
  return res.json();
}

export async function createTestRun(data) {
  const res = await fetch(`${BASE_URL}/api/test-runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create test run');
  }
  return res.json();
}

export async function updateTestRunResults(id, data) {
  const res = await fetch(`${BASE_URL}/api/test-runs/${id}/results`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to save results');
  }
  return res.json();
}

export async function getTestRunSummary(id) {
  const res = await fetch(`${BASE_URL}/api/test-runs/${id}/summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}
