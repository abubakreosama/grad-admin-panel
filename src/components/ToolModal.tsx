import { useState, useEffect } from 'react';
import Modal from './Modal';

export type ToolData = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  parameters: Array<{ name: string; type: string; description: string; required: boolean }>;
  authentication?: string;
};

export type Tool = {
  id: string;
  name: string;
  type: string;
  prompt: string;
  data: ToolData;
  agent_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const TOOL_TYPES = ['http', 'web_search', 'python', 'email', 'api', 'rag', 'custom'];

const DEFAULT_DATA = `{
  "url": "https://api.example.com/search",
  "method": "GET",
  "headers": {},
  "parameters": [
    { "name": "q", "type": "string", "description": "Search query", "required": true }
  ],
  "authentication": ""
}`;

type Props = {
  tool: Tool | null;
  onClose: () => void;
  onSave: (data: { name: string; type: string; prompt: string; data: ToolData }) => Promise<void> | void;
};

export default function ToolModal({ tool, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState(TOOL_TYPES[0]);
  const [prompt, setPrompt] = useState('');
  const [dataStr, setDataStr] = useState(DEFAULT_DATA);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setType(tool.type);
      setPrompt(tool.prompt);
      setDataStr(JSON.stringify(tool.data, null, 2));
    } else {
      setName('');
      setType(TOOL_TYPES[0]);
      setPrompt('');
      setDataStr(DEFAULT_DATA);
    }
    setError(null);
  }, [tool]);

  async function handleSave() {
    if (!name.trim()) return;
    let parsed: ToolData;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      setError('Data must be valid JSON.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), type, prompt: prompt.trim(), data: parsed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const isEdit = tool !== null;
  const customType = !TOOL_TYPES.includes(type);

  return (
    <Modal
      title={isEdit ? 'Edit Tool' : 'Create Tool'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={busy || !name.trim()}>
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Tool'}
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
        <label className="modal-label">Tool Name</label>
        <input
          className="modal-input"
          placeholder="e.g. Web Search API"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="modal-field">
        <label className="modal-label">Type</label>
        <select
          className="modal-select"
          value={customType ? 'custom' : type}
          onChange={(e) => setType(e.target.value)}
        >
          {TOOL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
          {customType && <option value={type}>{type} (current)</option>}
        </select>
      </div>

      <div className="modal-field">
        <label className="modal-label">Prompt</label>
        <textarea
          className="modal-textarea"
          placeholder="Describe to the LLM when and how to use this tool…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <div className="modal-field">
        <label className="modal-label">Data (JSON)</label>
        <textarea
          className="modal-textarea"
          style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5, minHeight: 200 }}
          placeholder={DEFAULT_DATA}
          value={dataStr}
          onChange={(e) => setDataStr(e.target.value)}
          spellCheck={false}
        />
        <p style={{ fontSize: 11, color: '#6a6a8a', margin: '6px 0 0' }}>
          Expected shape: <code style={{ color: '#a78bfa' }}>{'{ url, method, headers, parameters, authentication? }'}</code>
        </p>
      </div>
    </Modal>
  );
}
