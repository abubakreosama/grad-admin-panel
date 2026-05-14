import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type UserResponse } from '../lib/api';
import './auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api<UserResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Register</h1>
        <p className="auth-subtitle">Create your Platform account</p>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label" htmlFor="name">Full Name</label>
          <div className="auth-input-wrap">
            <input
              id="name"
              type="text"
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        </div>

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

        <div className="auth-field-row">
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
            <div className="auth-input-wrap">
              <input
                id="confirmPassword"
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>


        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <div className="auth-footer" style={{ marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in here</Link>
        </div>
      </form>
    </div>
  );
}
