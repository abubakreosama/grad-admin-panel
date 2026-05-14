import { useState, useEffect, useMemo } from 'react';
import Modal from '../../components/Modal';
import type { PermissionRecord, OrgRole } from '../../lib/auth';
import { RESOURCE_LABELS, ACTION_LABELS } from './permissions';

type AssignableRole = Exclude<OrgRole, 'owner'>;

export type MemberPermissionState = {
  role: AssignableRole;
  permissionIds: string[];
};

type Props = {
  member: { id: string; user_id: string; name: string; role: OrgRole };
  catalog: PermissionRecord[];
  currentPermissionIds: string[];
  onClose: () => void;
  onSave: (s: MemberPermissionState) => Promise<void> | void;
};

export default function PermissionsModal({ member, catalog, currentPermissionIds, onClose, onSave }: Props) {
  const isOwner = member.role === 'owner';
  const [role, setRole] = useState<AssignableRole>(isOwner ? 'admin' : (member.role as AssignableRole));
  const [permissionIds, setPermissionIds] = useState<string[]>(currentPermissionIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRole(isOwner ? 'admin' : (member.role as AssignableRole));
    setPermissionIds(currentPermissionIds);
    setError(null);
  }, [member, currentPermissionIds, isOwner]);

  const grouped = useMemo(() => {
    const map: Record<string, PermissionRecord[]> = {};
    for (const p of catalog) {
      (map[p.resource] = map[p.resource] ?? []).push(p);
    }
    return map;
  }, [catalog]);

  function togglePerm(id: string) {
    setPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await onSave({ role, permissionIds });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit Member Permissions"
      subtitle={`USER: ${member.name.toUpperCase()}  ·  ID: ${member.user_id.slice(0, 8)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={busy || isOwner}>
            {busy ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      {isOwner && (
        <div className="info-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>The owner's role and permissions cannot be edited. Transfer ownership first to change.</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      <div className="modal-field">
        <label className="modal-label">Role</label>
        <select
          className="modal-select"
          value={role}
          onChange={(e) => setRole(e.target.value as AssignableRole)}
          disabled={isOwner}
        >
          <option value="admin">Admin — full access</option>
          <option value="member">Member — only granted permissions</option>
        </select>
        <p className="role-helper">
          {role === 'admin'
            ? 'Admins can manage agents, members, and invites. They bypass granular permission checks.'
            : 'Members have only the resource permissions checked below.'}
        </p>
      </div>

      <div>
        <p className="section-divider">Granular Permissions</p>
        {catalog.length === 0 ? (
          <p style={{ color: '#6a6a8a', fontSize: 12 }}>Loading permissions catalog…</p>
        ) : (
          Object.entries(grouped).map(([resource, perms]) => (
            <div key={resource} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {RESOURCE_LABELS[resource] ?? resource}
              </div>
              <div className="perm-modal-grid">
                {perms.map((p) => (
                  <label key={p.id} className="perm-modal-item">
                    <input
                      type="checkbox"
                      checked={permissionIds.includes(p.id)}
                      onChange={() => togglePerm(p.id)}
                      disabled={isOwner || role === 'admin'}
                    />
                    <div>
                      <div className="permission-name">{ACTION_LABELS[p.action] ?? p.action}</div>
                      <div className="permission-desc">{p.resource}:{p.action}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
        {role === 'admin' && !isOwner && (
          <p className="role-helper" style={{ marginTop: 8 }}>
            Granular permissions are disabled for admins — they have full access.
          </p>
        )}
      </div>
    </Modal>
  );
}
