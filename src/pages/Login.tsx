import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveToken, saveEmail, type LoginResponse } from '../lib/api';
import { useAuth } from '../lib/auth';
import './auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveToken(res.token);
      saveEmail(email);
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Sign In</h1>
        <p className="auth-subtitle">Welcome back! Please enter your details</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email Address</label>
          <div className="auth-input-wrap">
            <input
              id="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label" htmlFor="password">Password</label>
          </div>
          <div className="auth-input-wrap">
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="auth-divider" />

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Sign up here</Link>
        </div>
      </form>
    </div>
  );
}
