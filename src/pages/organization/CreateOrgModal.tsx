import { useState } from 'react';
import Modal from '../../components/Modal';

type Props = {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
};

export default function CreateOrgModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Modal
      title="Create New Organization"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => { onCreate(name.trim(), description.trim()); onClose(); }}
          >
            Create Organization
          </button>
        </>
      }
    >
      <div className="modal-field">
        <label className="modal-label">Organization Name</label>
        <input
          className="modal-input"
          placeholder="e.g. Acme Inc."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="modal-field">
        <label className="modal-label">Description (optional)</label>
        <textarea
          className="modal-textarea"
          placeholder="What does your team do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
}
