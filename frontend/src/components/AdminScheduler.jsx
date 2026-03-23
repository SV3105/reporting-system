// src/components/AdminScheduler.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AdminScheduler() {
  const [views, setViews] = useState([]);
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedView, setSelectedView] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [scheduleTime, setScheduleTime] = useState('09:00');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, uRes, sRes] = await Promise.all([
        api.getAdminViews(),
        api.getUsers(),
        api.apiFetch('/api/admin/schedules')
      ]);
      setViews(vRes.views || []);
      setUsers(uRes.users || []);
      setSchedules(sRes.schedules || []);
    } catch (err) {
      console.error('Failed to load scheduler data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSchedule = async () => {
    if (!selectedView || selectedUsers.length === 0 || !scheduleTime) {
      alert('Please select a view, at least one user, and a time.');
      return;
    }

    setSaving(true);
    try {
      await api.apiFetch('/api/admin/schedules/bulk', {
        view_id: selectedView,
        user_ids: selectedUsers,
        time: scheduleTime
      }, { method: 'POST' });

      setSelectedUsers([]);
      await loadData(); // Refresh list
      alert('Schedules created successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this schedule?')) return;
    try {
      await api.apiFetch(`/api/admin/schedules/${id}`, {}, { method: 'DELETE' });
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading Scheduler...</div>;

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '24px' }}>Global Schedule Manager</h2>

      {/* ── Create Form ── */}
      <div style={{ 
        background: 'var(--bg-surface)', 
        padding: '24px', 
        borderRadius: '16px', 
        border: '1px solid var(--border-light)',
        marginBottom: '40px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '20px' }}>Schedule New Report Delivery</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Select Report (View)</label>
            <select 
              className="fp-select" 
              style={{ width: '100%', padding: '10px' }}
              value={selectedView}
              onChange={e => setSelectedView(e.target.value)}
            >
              <option value="">— Choose a view —</option>
              {views.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.created_by})</option>
              ))}
            </select>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginTop: '20px', marginBottom: '8px' }}>Delivery Time (IST)</label>
            <input 
              type="time" 
              className="fp-input" 
              style={{ width: '100%', padding: '10px' }}
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Recipients</label>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid var(--border-light)', 
              borderRadius: '8px',
              padding: '12px',
              background: 'var(--bg-canvas)'
            }}>
              {users.map(u => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', cursor: 'pointer', fontSize: '14px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                  />
                  <span>{u.username} <small style={{ color: 'var(--text-muted)' }}>({u.email})</small></span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ marginTop: '24px', width: '100%', padding: '12px', fontWeight: 700 }}
          onClick={handleBulkSchedule}
          disabled={saving}
        >
          {saving ? 'Creating Schedules...' : '+ Create Schedules'}
        </button>
      </div>

      {/* ── Schedule List ── */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface-2)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
              <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REPORT</th>
              <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RECIPIENT</th>
              <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIME</th>
              <th style={{ padding: '16px 20px', fontSize: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>No active schedules.</td>
              </tr>
            )}
            {schedules.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--bg-surface-2)', transition: 'background 0.2s' }} className="report-row">
                <td style={{ padding: '18px 20px', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{s.view_name}</td>
                <td style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.recipient_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.recipient_email}</div>
                </td>
                <td style={{ padding: '18px 20px' }}>
                   <span style={{ 
                     background: 'var(--primary-light)', 
                     color: 'var(--primary)', 
                     padding: '4px 10px', 
                     borderRadius: '8px', 
                     fontWeight: 800, 
                     fontSize: '14px',
                     border: '1px solid var(--primary-mid)'
                   }}>
                    {s.schedule_time.substring(0, 5)}
                   </span>
                </td>
                <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleDelete(s.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }}
                    className="delete-btn-hover"
                    title="Delete"
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
      <style>{`
        .report-row:hover { background-color: var(--primary-light) !important; }
        .delete-btn-hover:hover { background-color: #fee2e2 !important; }
      `}</style>
    </div>
  );
}
