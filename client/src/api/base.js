const BASE_URL = import.meta.env.VITE_API_URL || '';

export function getToken() {
  return localStorage.getItem('qa_tracker_token');
}

export function setToken(token) {
  localStorage.setItem('qa_tracker_token', token);
}

export function clearToken() {
  localStorage.removeItem('qa_tracker_token');
}

export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  return res;
}
