import { useState, useEffect } from 'react';
import Modal from './Modal';

export type KbStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type KB = {
  id: string;
  name: string;
  description: string | null;
  filepath: string;
  status: KbStatus;
  agent_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  kb: KB | null;
  onClose: () => void;
  onCreate: (name: string, description: string, file: File) => Promise<void> | void;
  onDelete?: (kb: KB) => Promise<void> | void;
};

export default function KbModal({ kb, onClose, onCreate, onDelete }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kb) {
      setName(kb.name);
      setDescription(kb.description ?? '');
    } else {
      setName('');
      setDescription('');
      setFile(null);
    }
    setError(null);
  }, [kb]);

  const isEdit = kb !== null;

  async function handleCreate() {
    if (!name.trim() || !file) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate(name.trim(), description.trim(), file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!kb || !onDelete) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(kb);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Knowledge Base Details' : 'Add Knowledge Base'}
      subtitle={isEdit ? `STATUS: ${kb!.status.toUpperCase()}` : undefined}
      onClose={onClose}
      footer={
        isEdit ? (
          <>
            <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Close</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={busy || !name.trim() || !file}
            >
              {busy ? 'Processing PDF…' : 'Upload'}
            </button>
          </>
        )
      }
    >
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
          {error}
        </div>
      )}

      <div className="modal-field">
        <label className="modal-label">Name</label>
        <input
          className="modal-input"
          placeholder="e.g. Product Catalog 2024"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isEdit || busy}
        />
      </div>

      <div className="modal-field">
        <label className="modal-label">Description</label>
        <textarea
          className="modal-textarea"
          placeholder="Describe what this knowledge base contains…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isEdit || busy}
        />
      </div>

      {isEdit ? (
        <div className="modal-field">
          <label className="modal-label">File</label>
          <div className="file-selected">
            <PdfIcon />
            <span className="file-selected-name">{kb!.filepath?.split(/[\\/]/).pop() ?? kb!.filepath}</span>
          </div>
          <p style={{ fontSize: 11, color: '#6a6a8a', margin: '8px 0 0' }}>
            Knowledge bases are immutable. To change contents, delete and re-upload.
          </p>
        </div>
      ) : (
        <div className="modal-field">
          <label className="modal-label">PDF File</label>
          {file ? (
            <div className="file-selected">
              <PdfIcon />
              <span className="file-selected-name">{file.name}</span>
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => setFile(null)}
                disabled={busy}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="file-upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              <p className="file-upload-text">Click to upload or drag and drop</p>
              <p className="file-upload-hint">PDF only · processing may take a few seconds</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );
}
