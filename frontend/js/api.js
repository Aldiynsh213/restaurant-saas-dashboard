const API_BASE = window.DYN_SH_API_BASE || localStorage.getItem('DYN_SH_API_BASE') || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (_err) {
    throw new Error('API tidak tersambung. Pastikan backend sudah jalan di http://localhost:5000.');
  }

  let data = {};
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  if (response.status === 401 && !path.includes('/auth/login')) {
    clearSession();
    window.location.href = './index.html';
    return null;
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request gagal diproses.');
  }

  return data;
}
