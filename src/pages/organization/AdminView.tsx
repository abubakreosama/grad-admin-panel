import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth, type Member, type OrgRole } from '../../lib/auth';
import InviteModal from './InviteModal';
import PermissionsModal, { type MemberPermissionState } from './PermissionsModal';
import ConfirmModal from './ConfirmModal';

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

const ROLE_BADGE: Record<OrgRole, string> = {
  owner: 'role-owner',
  admin: 'role-admin',
  member: 'role-developer',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

type Props = { isOwner: boolean };

export default function AdminView({ isOwner }: Props) {
  const { org, permissions, refresh } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'users' | 'invites'>('users');
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [permsMember, setPermsMember] = useState<Member | null>(null);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [m, i] = await Promise.all([
        api<Member[]>('/organizations/members'),
        api<Invite[]>('/organizations/invites'),
      ]);
      setMembers(m);
      setInvites(i);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(userId: string) {
    await api<Invite>('/organizations/invites', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
    setInviteOpen(false);
    load();
  }

  async function handleSavePermissions(state: MemberPermissionState) {
    if (!permsMember) return;
    const uid = permsMember.user_id;
    if (state.role !== permsMember.role && permsMember.role !== 'owner') {
      await api<Member>(`/organizations/members/${uid}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: state.role }),
      });
    }
    await api<void>(`/organizations/members/${uid}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permission_ids: state.permissionIds }),
    });
    setPermsMember(null);
    load();
  }

  async function handleRemove() {
    if (!removeMember) return;
    try {
      await api<void>(`/organizations/members/${removeMember.user_id}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.user_id !== removeMember.user_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  async function handleLeave() {
    try {
      await api<void>('/organizations/leave', { method: 'POST' });
      await refresh();
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Leave failed');
    }
  }

  async function handleTransfer(newOwnerId: string) {
    try {
      await api<void>('/organizations/transfer', {
        method: 'POST',
        body: JSON.stringify({ new_owner_id: newOwnerId }),
      });
      await refresh();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    }
  }

  async function handleDeleteOrg() {
    try {
      await api<void>('/organizations', { method: 'DELETE' });
      await refresh();
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const uniqueRoles = new Set(members.map((m) => m.role));
  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const transferCandidates = members.filter((m) => m.role !== 'owner');

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{org?.name ?? 'Organization'}</h1>
          <p>Manage your team members, roles, and platform permissions.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setLeaveOpen(true)}>
            Leave Organization
          </button>
          {isOwner && (
            <>
              <button className="btn btn-secondary" onClick={() => setTransferOpen(true)}>
                Transfer Ownership
              </button>
              <button className="btn btn-danger" onClick={() => setDeleteOrgOpen(true)}>
                Delete Organization
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
            + Invite User
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-label">Total Users</p>
          <div className="stat-row">
            <span className="stat-value">{members.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Active Roles</p>
          <div className="stat-row">
            <span className="stat-value">{uniqueRoles.size}</span>
            <span className="stat-trend neutral">{Array.from(uniqueRoles).join(' · ')}</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pending Invites</p>
          <div className="stat-row">
            <span className="stat-value">{pendingInvites.length}</span>
            {pendingInvites.length > 0 && <span className="stat-trend warning">Expiring soon</span>}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'users' ? ' active' : ''}`} onClick={() => setTab('users')}>Users</button>
        <button className={`tab${tab === 'invites' ? ' active' : ''}`} onClick={() => setTab('invites')}>Invites</button>
      </div>

      {tab === 'users' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>Loading…</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>No members yet.</td></tr>
              ) : members.map((m) => (
                <tr key={m.id}>
                  <td className="user-name">{m.name}</td>
                  <td className="muted-text">{m.email}</td>
                  <td><span className={`role-badge ${ROLE_BADGE[m.role]}`}>{m.role}</span></td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Edit permissions"
                        onClick={() => setPermsMember(m)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <circle cx="12" cy="11" r="1.5" />
                        </svg>
                      </button>
                      {m.role !== 'owner' && (
                        <button
                          className="icon-btn danger"
                          title="Remove member"
                          onClick={() => setRemoveMember(m)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invites' && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invitee</th>
                <th>Status</th>
                <th>Date Sent</th>
                <th>Expires</th>
                <th>Invited By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>Loading…</td></tr>
              ) : invites.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>No invitations sent yet.</td></tr>
              ) : invites.map((inv) => (
                <tr key={inv.id}>
                  <td className="user-name">{inv.user_name}</td>
                  <td><span className={`status-pill ${inv.status}`}>{inv.status}</span></td>
                  <td className="muted-text">{formatDate(inv.created_at)}</td>
                  <td className="muted-text">{formatDate(inv.expire_date)}</td>
                  <td className="muted-text">{inv.invited_by_user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onSend={handleInvite}
        />
      )}

      {permsMember && (
        <PermissionsModal
          member={permsMember}
          catalog={permissions}
          currentPermissionIds={[]} /* spec has no endpoint to fetch current member permissions */
          onClose={() => setPermsMember(null)}
          onSave={handleSavePermissions}
        />
      )}

      {removeMember && (
        <ConfirmModal
          title="Remove Team Member"
          message={<>Are you sure you want to remove <strong style={{ color: '#fff' }}>{removeMember.name}</strong> from the organization?</>}
          warning="This action is permanent. The member will lose access to all team resources immediately."
          confirmLabel="Remove Member"
          onConfirm={handleRemove}
          onClose={() => setRemoveMember(null)}
        />
      )}

      {leaveOpen && (
        <ConfirmModal
          title="Leave Organization"
          message={<>Are you sure you want to leave <strong style={{ color: '#fff' }}>{org?.name}</strong>?</>}
          warning={isOwner ? 'As the owner you must transfer ownership before leaving.' : 'You will need a new invitation to rejoin.'}
          confirmLabel="Leave Organization"
          onConfirm={handleLeave}
          onClose={() => setLeaveOpen(false)}
        />
      )}

      {transferOpen && (
        <TransferOwnershipModal
          candidates={transferCandidates}
          onClose={() => setTransferOpen(false)}
          onTransfer={handleTransfer}
        />
      )}

      {deleteOrgOpen && (
        <ConfirmModal
          title="Delete Organization"
          message={<>Permanently delete <strong style={{ color: '#fff' }}>{org?.name}</strong>?</>}
          warning="All agents, knowledge bases, tools, and conversations will be deleted. This cannot be undone."
          confirmLabel="Delete Organization"
          onConfirm={handleDeleteOrg}
          onClose={() => setDeleteOrgOpen(false)}
        />
      )}
    </>
  );
}

function TransferOwnershipModal({
  candidates,
  onClose,
  onTransfer,
}: {
  candidates: Member[];
  onClose: () => void;
  onTransfer: (newOwnerId: string) => Promise<void> | void;
}) {
  const [selectedId, setSelectedId] = useState(candidates[0]?.user_id ?? '');
  const selected = candidates.find((m) => m.user_id === selectedId);

  return (
    <ConfirmModal
      title="Transfer Ownership"
      message={
        <>
          <p style={{ margin: '0 0 14px' }}>
            Select a member to transfer ownership to. They will gain full control of the organization,
            and your role will become <strong style={{ color: '#fff' }}>Admin</strong>.
          </p>
          <select
            className="modal-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ width: '100%' }}
          >
            {candidates.length === 0 ? (
              <option value="">No eligible members</option>
            ) : (
              candidates.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name} — {m.email}</option>
              ))
            )}
          </select>
        </>
      }
      warning={selected
        ? `${selected.name} will become the new owner. This action is irreversible without their cooperation.`
        : 'Invite a member first before transferring ownership.'}
      confirmLabel="Transfer Ownership"
      onConfirm={() => selected && onTransfer(selected.user_id)}
      onClose={onClose}
    />
  );
}
