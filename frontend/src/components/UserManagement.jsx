// src/components/UserManagement.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

// Reusable themed input style
const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--bg-surface)',
  border: '2px solid var(--border-light)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.2s ease',
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', email: '', role: 'user' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      if (res.success) {
        setUsers(res.users);
      } else {
        setError(res.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createUser(formData);
      if (res.success) {
        setUsers([...users, res.user]);
        setShowAddForm(false);
        setFormData({ username: '', password: '', email: '', role: 'user' });
      } else {
        alert(`Failed to create user: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error creating user: ${err.message || 'Connection error'}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to revoke access for this user?')) return;
    try {
      const res = await api.deleteUser(id);
      if (res.success) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        alert(`Failed to delete user: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error deleting user: ${err.message || 'Connection error'}`);
    }
  };

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto', background: 'var(--bg-canvas)', minHeight: '100vh' }}>
      
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            System Users
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px', fontWeight: 500 }}>
            Manage global workspace access and security permissions.
          </p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          style={{ 
            padding: '12px 24px', background: 'var(--primary)', color: 'var(--text-inverse)', 
            border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'var(--primary-glow)' 
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Enroll New User
        </button>
      </div>

      {/* ── Loading State ─────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="spinner" style={{ color: 'var(--primary)', fontSize: '24px' }}>⌛</div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginTop: '12px' }}>Loading registry...</p>
        </div>
      )}

      {/* ── Main Table Card ───────────────────────────────────── */}
      {!loading && (
        <div style={{ 
          background: 'var(--bg-surface)', border: '1px solid var(--border-light)', 
          borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-2)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '18px 24px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registry ID</th>
                <th style={{ padding: '18px 24px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Identity</th>
                <th style={{ padding: '18px 24px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Level</th>
                <th style={{ padding: '18px 24px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined Date</th>
                <th style={{ padding: '18px 24px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Control</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="user-row" style={{ borderBottom: '1px solid var(--bg-surface-2)', transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'monospace' }}>#{u.id}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>{u.username}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.email || 'internal-account'}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, 
                      textTransform: 'uppercase',
                      background: u.role === 'admin' ? 'var(--primary-light)' : 'var(--bg-surface-3)',
                      color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
                      border: `1px solid ${u.role === 'admin' ? 'var(--primary-mid)' : 'var(--border-medium)'}`
                    }}>
                      {u.role === 'admin' ? 'Administrator' : 'Standard'}
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDelete(u.id)} 
                      style={{ 
                        border: 'none', background: 'transparent', color: '#ef4444', 
                        cursor: 'pointer', padding: '8px', borderRadius: '10px', transition: 'all 0.2s' 
                      }}
                      className="delete-btn"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !loading && (
             <div style={{ padding: '80px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>👥</div>
                <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>No users found</h4>
                <p style={{ color: 'var(--text-muted)' }}>Enroll a user to get started.</p>
             </div>
          )}
        </div>
      )}

      {/* ── Enrollment Modal ──────────────────────────────────── */}
      {showAddForm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 38, 68, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }} onClick={() => setShowAddForm(false)} />
          <div style={{ 
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
            zIndex: 1001, width: '100%', maxWidth: '420px', background: 'var(--bg-surface)', 
            borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', overflow: 'hidden'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>Enroll New User</span>
              <button onClick={() => setShowAddForm(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Username</label>
                <input type="text" style={inputStyle} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Password</label>
                <input type="password" style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Email (Optional)</label>
                <input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Access Role</label>
                <select style={inputStyle} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="user">Standard User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <button type="submit" style={{ 
                width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', 
                border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' 
              }}>
                Create Account
              </button>
            </form>
          </div>
        </>
      )}

      <style>{`
        .user-row:hover { background-color: var(--primary-light) !important; }
        .delete-btn:hover { background-color: #fee2e2 !important; transform: scale(1.1); }
        input:focus, select:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 4px var(--primary-dim); }
      `}</style>
    </div>
  );
}