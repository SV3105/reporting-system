// src/components/Login.jsx — High-End Sky Blue Login
import { useState } from 'react';
import { api } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'var(--bg-canvas)', fontFamily: 'Inter, system-ui, sans-serif' 
    }}>
      <div style={{ 
        width: '100%', maxWidth: '420px', padding: '48px', background: 'var(--bg-surface)', 
        borderRadius: '32px', boxShadow: '0 20px 60px -10px rgba(15, 38, 68, 0.1)',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            width: '64px', height: '64px', background: 'var(--primary)', borderRadius: '16px', 
            margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', color: 'white', boxShadow: 'var(--primary-glow)'
          }}>◈</div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-1px' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>
            Secure access to ReportSystem analytics
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Username</label>
            <input
              type="text"
              style={{ width: '100%', padding: '14px 18px', borderRadius: '12px', border: '2px solid var(--border-light)', outline: 'none', background: 'var(--bg-surface-2)', fontSize: '15px', transition: 'all 0.2s' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin_pro"
              required
            />
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Password</label>
            <input
              type="password"
              style={{ width: '100%', padding: '14px 18px', borderRadius: '12px', border: '2px solid var(--border-light)', outline: 'none', background: 'var(--bg-surface-2)', fontSize: '15px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{ padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '10px', fontSize: '13px', fontWeight: 600, marginBottom: '20px', border: '1px solid #fecaca' }}>
              ⚠ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '16px', background: 'var(--primary)', color: 'white', 
              border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '16px', cursor: 'pointer',
              boxShadow: 'var(--primary-glow)', transition: 'transform 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: 'var(--text-placeholder)' }}>
          © 2026 Antigravity Systems. Enterprise Grade Security.
        </p>
      </div>
    </div>
  );
}