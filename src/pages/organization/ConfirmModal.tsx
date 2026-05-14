import type { ReactNode } from 'react';
import Modal from '../../components/Modal';

type Props = {
  title: string;
  message: ReactNode;
  warning?: ReactNode;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  title,
  message,
  warning,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 14, color: '#c0c0d8', lineHeight: 1.6 }}>{message}</p>
      {warning && (
        <div className="warning-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{warning}</span>
        </div>
      )}
    </Modal>
  );
}
