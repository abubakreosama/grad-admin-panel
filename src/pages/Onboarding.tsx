import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth, type Organization } from '../lib/auth';
import CreateOrgModal from './organization/CreateOrgModal';
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

export default function Onboarding() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  async function loadInvites() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Invite[]>('/users/invites');
      setInvites(data.filter((i) => i.status === 'pending'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(name: string) {
    try {
      await api<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    }
  }

  async function accept(id: string) {
    setBusyId(id);
    try {
      await api<void>(`/users/invites/${id}/accept`, { method: 'POST' });
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setBusyId(null);
    }
  }

  async function decline(id: string) {
    setBusyId(id);
    try {
      await api<void>(`/users/invites/${id}/decline`, { method: 'POST' });
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invite');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Get Started</h1>
          <p>Create your own organization or accept a pending invitation.</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="no-org-grid">
        <div className="create-org-card">
          <div className="create-org-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M8 20h8M12 18v2" />
            </svg>
          </div>
          <h2>Create New Organization</h2>
          <p>Establish a new digital headquarters. Set up custom workflows, manage your team members, and start building.</p>
          <button className="get-started-btn" onClick={() => setCreateOpen(true)}>Get Started</button>
        </div>

        <div>
          <div className="invites-header">
            <div className="invites-title">
              <h2>Incoming Invitations</h2>
              <p>{loading ? 'Loading…' : `You have ${invites.length} pending request${invites.length === 1 ? '' : 's'} to join organizations`}</p>
            </div>
            {invites.length > 0 && <span className="status-pill pending">Pending</span>}
          </div>

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Invited By</th>
                  <th>Date Received</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>Loading invites…</td></tr>
                ) : invites.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>No pending invitations</td></tr>
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
                    <td className="muted-text">{formatDate(inv.created_at)}</td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateOrgModal
          onClose={() => setCreateOpen(false)}
          onCreate={(name) => handleCreate(name)}
        />
      )}
    </>
  );
}
