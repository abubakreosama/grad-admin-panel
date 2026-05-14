import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import './organization/Organization.css';

type Invite = {
  id: string;
  organization_id: string;
  organization_name: string;
  user_id: string;
  user_name: string;
  invited_by_user_name: string;
  status: 'pending' | 'accepted' | 'declined';
  expire_date: string;
  created_at: string;
};

const AVATAR_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(s: string) {
  return s.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function Invites() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Invite[]>('/users/invites');
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  async function accept(id: string) {
    setBusyId(id);
    try {
      await api<void>(`/users/invites/${id}/accept`, { method: 'POST' });
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept');
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    try {
      await api<void>(`/users/invites/${id}/decline`, { method: 'POST' });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline');
    } finally {
      setBusyId(null);
    }
  }

  const pending = invites.filter((i) => i.status === 'pending');

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Invitations</h1>
          <p>Organizations that have invited you to join their workspace.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Invited By</th>
              <th>Status</th>
              <th>Date Received</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>Loading…</td></tr>
            ) : invites.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>No invitations yet</td></tr>
            ) : invites.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div className="org-row">
                    <span className="org-avatar" style={{ background: colorFor(inv.organization_name) }}>
                      {initials(inv.organization_name)}
                    </span>
                    <span className="user-name">{inv.organization_name}</span>
                  </div>
                </td>
                <td className="muted-text">{inv.invited_by_user_name}</td>
                <td><span className={`status-pill ${inv.status}`}>{inv.status}</span></td>
                <td className="muted-text">{formatDate(inv.created_at)}</td>
                <td>
                  {inv.status === 'pending' ? (
                    <div className="row-actions">
                      <button className="icon-btn danger" title="Decline" disabled={busyId === inv.id} onClick={() => decline(inv.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                      <button className="icon-btn success" title="Accept" disabled={busyId === inv.id} onClick={() => accept(inv.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    </div>
                  ) : <span className="muted-text">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: '#6a6a8a', marginTop: 12 }}>
        Total: {invites.length} · Pending: {pending.length}
      </p>
    </>
  );
}
