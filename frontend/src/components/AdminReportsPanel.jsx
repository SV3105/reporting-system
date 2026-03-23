// src/components/AdminReportsPanel.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const filterSummary = (filters) => {
  if (!filters) return 'No filters';
  let obj = filters;
  if (typeof filters === 'string') {
    try { obj = JSON.parse(filters); } catch (e) { return 'No filters'; }
  }
  if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return 'No filters';

  let items = [];
  
  // 1. Handle Advanced Logic (can be string or array)
  let logic = obj._logic || obj.filter_logic;
  if (typeof logic === 'string' && (logic.startsWith('[') || logic.startsWith('{'))) {
    try { logic = JSON.parse(logic); } catch (e) {}
  }

  if (Array.isArray(logic)) {
    logic.forEach(row => {
      const col = row.column;
      const val = row.search || (row.min !== undefined && row.min !== '' ? `${row.min} to ${row.max}` : '');
      if (col) {
        const label = col.replace(/_[a-z]+$/, '').replace(/_/g, ' ');
        items.push(val ? `${label}: ${val}` : label);
      }
    });
  } else {
    // 2. Handle Simple Filters
    Object.entries(obj).forEach(([k, v]) => {
      if (k === '_logic' || k === 'filter_logic' || v === '' || v === null) return;
      const label = k.replace(/_[a-z]+$/, '').replace(/_/g, ' ');
      const val = Array.isArray(v) ? v.join(', ') : String(v);
      if (val) items.push(`${label}: ${val}`);
    });
  }

  if (items.length === 0) return 'No filters';
  
  const summary = items.join(' | ');
  return summary.length > 60 ? summary.substring(0, 57) + '...' : summary;
};

// Refined Input Style using Theme Tokens
const inputStyle = {
  padding: '10px 16px',
  background: 'var(--bg-surface)',
  border: '2px solid var(--border-light)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
};

export default function AdminReportsPanel() {
  const [views, setViews] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [byUser, setByUser] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const resViews = await api.getAdminViews();
      if (resViews.success) setViews(resViews.views);
      else setError(resViews.error || 'Failed to load');
    } catch (e) {
      setError(e.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this report? This cannot be undone.')) return;
    try {
      await api.apiFetch(`/api/views/${id}`, {}, { method: 'DELETE' });
      setViews(v => v.filter(x => x.id !== id));
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  const allUsers = [...new Set(views.map(v => v.created_by).filter(Boolean))].sort();

  const filtered = views.filter(v => {
    const matchUser = byUser === 'all' || v.created_by === byUser;
    const matchSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.created_by || '').toLowerCase().includes(search.toLowerCase());
    return matchUser && matchSearch;
  });

  const grouped = filtered.reduce((acc, v) => {
    const key = v.created_by || 'Unknown User';
    (acc[key] ??= []).push(v);
    return acc;
  }, {});

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg-canvas)' }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Admin Report Center
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px', fontWeight: 500 }}>
          Manage and monitor all saved views across the organization.
        </p>
      </div>

      {/* ── Filters row ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search reports or users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <select
          value={byUser}
          onChange={e => setByUser(e.target.value)}
          style={{ ...inputStyle, minWidth: '180px', cursor: 'pointer' }}
        >
          <option value="all">Filter by User: All</option>
          {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        
        <div style={{
          padding: '10px 16px',
          background: 'var(--primary-light)',
          borderRadius: '12px',
          color: 'var(--primary)',
          fontWeight: 700,
          fontSize: '13px',
          border: '1px solid var(--primary-mid)',
        }}>
          {filtered.length} Total Reports
        </div>
      </div>

      {/* ── Status Messages ───────────────────────────────────── */}
      {successMsg && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>✓</span> {successMsg}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--primary)' }}>
           <div className="spinner" style={{ marginBottom: '12px' }}>⌛</div>
           <p style={{ fontWeight: 600 }}>Fetching latest reports...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{ color: '#dc2626', background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: 'center', padding: '100px 0', background: 'var(--bg-surface)', borderRadius: '24px', border: '2px dashed var(--border-medium)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
          <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>No reports found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters.</p>
        </div>
      )}

      {/* ── Grouped Sections ───────────────────────────────────── */}
      {!loading && !error && Object.entries(grouped).map(([username, userViews]) => (
        <div key={username} style={{ marginBottom: '40px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '14px', color: 'var(--text-inverse)',
            }}>
              {username[0]?.toUpperCase()}
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700 }}>{username}</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>• {userViews.length} views</span>
          </div>

          <div style={{ 
            background: 'var(--bg-surface)', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: '1px solid var(--border-light)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                  {['Report Name', 'Filters', 'Created', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontSize: '11px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userViews.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--bg-surface-2)', transition: 'background 0.2s' }} className="report-row">
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{v.name}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '6px',
                        background: 'var(--bg-surface-3)', border: '1px solid var(--border-medium)',
                        color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
                      }}>
                        {filterSummary(v.filters)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {fmt(v.created_at)}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(v.id)}
                        style={{ 
                          border: 'none', background: 'transparent', cursor: 'pointer', 
                          color: '#ef4444', padding: '6px', borderRadius: '8px',
                          display: 'flex', alignItems: 'center'
                        }}
                        title="Delete Report"
                      >
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Extra CSS for hover effects */}
      <style>{`
        .report-row:hover { background-color: var(--primary-light) !important; }
        .report-row button:hover { background-color: #fee2e2 !important; }
        select:focus, input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--primary-dim) !important; }
      `}</style>
    </div>
  );
}