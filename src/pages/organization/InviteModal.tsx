import { useState } from 'react';
import Modal from '../../components/Modal';

type Props = {
  onClose: () => void;
  onSend: (userId: string) => Promise<void> | void;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function InviteModal({ onClose, onSend }: Props) {
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    if (!UUID_RE.test(userId.trim())) {
      setError('Enter a valid UUID (8-4-4-4-12 format).');
      return;
    }
    setBusy(true);
    try {
      await onSend(userId.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Invite New Member"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={busy || !userId.trim()}
            onClick={handleSend}
          >
            {busy ? 'Sending…' : 'Send Invitation'}
          </button>
        </>
      }
    >
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      <div className="modal-field">
        <label className="modal-label">User ID (UUID)</label>
        <input
          type="text"
          className="modal-input"
          placeholder="e.g. 3f6b4f5a-2a1d-4f5b-9c8e-1b2a3c4d5e6f"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          spellCheck={false}
          style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5 }}
        />
      </div>

      <div className="info-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          The invitee must share their user ID with you — there is no email lookup yet.
          They can find it in their account profile.
          You will assign their role and permissions after they accept.
        </span>
      </div>
    </Modal>
  );
}
