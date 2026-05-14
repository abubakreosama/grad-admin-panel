import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth, type OrgRole } from '../../lib/auth';
import ConfirmModal from './ConfirmModal';

const AVATAR_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(s: string) {
  return s.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const ROLE_BADGE_CLASS: Record<OrgRole, string> = {
  owner: 'role-owner',
  admin: 'role-admin',
  member: 'role-developer',
};

export default function MemberView() {
  const { org, role, refresh } = useAuth();
  const navigate = useNavigate();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setError(null);
    try {
      await api<void>('/organizations/leave', { method: 'POST' });
      await refresh();
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Leave failed');
    }
  }

  if (!org || !role) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Organization</h1>
          <p>Your role and access in this organization.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-danger" onClick={() => setLeaveOpen(true)}>
            Leave Organization
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="info-card" style={{ maxWidth: 580 }}>
        <p className="info-card-label">Your Organization</p>
        <div className="org-info-row">
          <span className="org-avatar" style={{ background: colorFor(org.name), width: 44, height: 44, fontSize: 14, borderRadius: 10 }}>
            {initials(org.name)}
          </span>
          <div>
            <div className="org-info-name">{org.name}</div>
            <div className="org-info-meta">Member since {new Date(org.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <p className="info-card-label" style={{ marginTop: 16 }}>Your Role</p>
        <span className={`role-badge ${ROLE_BADGE_CLASS[role]}`}>{role.toUpperCase()}</span>

        <div className="info-box" style={{ marginTop: 18 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Contact your organization administrator to review or change your specific resource permissions.
          </span>
        </div>
      </div>

      {leaveOpen && (
        <ConfirmModal
          title="Leave Organization"
          message={<>Are you sure you want to leave <strong style={{ color: '#fff' }}>{org.name}</strong>? You will lose access to all team resources.</>}
          warning="You will need a new invitation to rejoin."
          confirmLabel="Leave Organization"
          onConfirm={handleLeave}
          onClose={() => setLeaveOpen(false)}
        />
      )}
    </>
  );
}
