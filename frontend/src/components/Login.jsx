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
    <div className="login-container">
      <div className="login-glass">
        <div className="login-header">
          <div className="login-logo">◈</div>
          <h1>Report<span>System</span></h1>
          <p>Advanced Analytics Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="fp-group">
            <label className="fp-label">Username</label>
            <input
              type="text"
              className="fp-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="fp-group">
            <label className="fp-label">Password</label>
            <input
              type="password"
              className="fp-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="login-error">⚠ {error}</div>}

          <button type="submit" className="btn btn-primary btn-wide" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          © 2026 Antigravity Systems. All rights reserved.
        </div>
      </div>

      <style>{`
        .login-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, #1e293b, #0f172a);
          color: #f8fafc;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .login-glass {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-logo {
          font-size: 40px;
          margin-bottom: 12px;
          color: #6366f1;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
        }

        .login-header h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .login-header h1 span {
          color: #6366f1;
        }

        .login-header p {
          color: #94a3b8;
          font-size: 14px;
          margin: 8px 0 0;
        }

        .login-form .fp-group {
          margin-bottom: 20px;
        }

        .login-form .fp-label {
          color: #cbd5e1;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .login-form .fp-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          padding: 12px 16px;
          font-size: 15px;
          transition: all 0.2s;
        }

        .login-form .fp-input:focus {
          border-color: #6366f1;
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .login-error {
          background: rgba(239, 68, 68, 0.1);
          border-left: 3px solid #ef4444;
          color: #fca5a5;
          padding: 12px;
          font-size: 13px;
          margin-bottom: 20px;
          border-radius: 4px;
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
