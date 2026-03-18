// src/services/api.js
// Vite uses import.meta.env instead of process.env

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiFetch(endpoint, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url   = `${BASE_URL}${endpoint}${query ? '?' + query : ''}`;

  const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return data;
}

export const api = {
  getReports : (params) => apiFetch('/api/reports', params),
  getFields  : ()       => apiFetch('/api/reports/fields'),
  getFacets  : (fields) => apiFetch('/api/reports/facets', { fields: fields.join(',') }),
  getStats   : (field)  => apiFetch('/api/reports/stats',  { field }),
  healthCheck: ()       => apiFetch('/api/reports/health'),
};
