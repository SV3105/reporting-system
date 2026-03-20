// src/services/api.js
// Vite uses import.meta.env instead of process.env

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiFetch(endpoint, data = {}, options = {}) {
  const isPost = options.method === 'POST';
  const query = isPost ? '' : new URLSearchParams(data).toString();
  const url   = `${BASE_URL}${endpoint}${query ? '?' + query : ''}`;

  const fetchOptions = {
    headers: { 'Accept': 'application/json' },
    ...options
  };

  if (isPost && Object.keys(data).length > 0) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(data);
  }

  const res  = await fetch(url, fetchOptions);
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json;
}

export const api = {
  login      : (username, password) => apiFetch('/api/login', { username, password }, { method: 'POST' }),
  logout     : () => apiFetch('/api/logout', {}, { method: 'POST' }),
  me         : () => apiFetch('/api/me'),

  getReports : (params, options) => apiFetch('/api/reports', params, options),
  getFields  : ()       => apiFetch('/api/reports/fields'),
  getFacets  : (fields) => apiFetch('/api/reports/facets', { fields: fields.join(',') }),
  getStats   : (field)  => apiFetch('/api/reports/stats',  { field }),
  healthCheck: ()       => apiFetch('/api/reports/health'),

  getUserConfig: (reportId) => apiFetch('/api/user-config', { report_id: reportId }),
  saveUserConfig: (reportId, config) => apiFetch('/api/user-config', { report_id: reportId, column_config: config }, { method: 'POST' })
};
