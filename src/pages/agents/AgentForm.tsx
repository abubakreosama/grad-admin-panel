import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, apiMultipart } from '../../lib/api';
import KbModal, { type KB } from '../../components/KbModal';
import ToolModal, { type Tool, type ToolData } from '../../components/ToolModal';
import ConfirmModal from '../organization/ConfirmModal';
import './AgentForm.css';

type Agent = {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  organization_id: string;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ConversationItem = {
  id: string;
  agent_id: string;
  agent_name: string;
  external_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationsListResponse = {
  total: number;
  items: ConversationItem[];
};

function relativeTime(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch { return iso; }
}

const KB_STATUS_CLASS: Record<string, string> = {
  pending:    'pending',
  processing: 'processing',
  ready:      'active',
  failed:     'failed',
};

export default function AgentForm() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(agentId);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [rotatingSecret, setRotatingSecret] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Related data
  const [kbs, setKbs] = useState<KB[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);

  // Modals
  const [kbModal, setKbModal] = useState<{ open: boolean; kb: KB | null }>({ open: false, kb: null });
  const [toolModal, setToolModal] = useState<{ open: boolean; tool: Tool | null }>({ open: false, tool: null });
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!isEdit || !agentId) return;
    (async () => {
      setLoading(true);
      try {
        const [a, kbList, toolList, convoList] = await Promise.all([
          api<Agent>(`/agents/${agentId}`),
          api<KB[]>(`/agents/${agentId}/knowledgebase`).catch(() => []),
          api<Tool[]>(`/agents/${agentId}/tools`).catch(() => []),
          api<ConversationsListResponse>(`/conversations?agent_id=${agentId}&limit=5`).catch(() => ({ total: 0, items: [] as ConversationItem[] })),
        ]);
        setName(a.name);
        setDescription(a.description ?? '');
        setPrompt(a.prompt);
        setIsActive(a.is_active);
        setKbs(kbList);
        setTools(toolList);
        setConversations(convoList.items);
        setTotalConversations(convoList.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId, isEdit]);

  async function handleSave() {
    setError(null);
    if (!name.trim() || !prompt.trim()) {
      setError('Name and prompt are required.');
      return;
    }
    if (!isEdit && !secretKey.trim()) {
      setError('Secret key is required when creating an agent.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && agentId) {
        const body: Record<string, unknown> = {
          agent_id: agentId,
          name: name.trim(),
          description: description.trim() || null,
          prompt: prompt.trim(),
        };
        if (rotatingSecret && secretKey.trim()) body.secret_key = secretKey.trim();
        await api<Agent>(`/agents/${agentId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setRotatingSecret(false);
        setSecretKey('');
      } else {
        const created = await api<Agent>('/agents', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            prompt: prompt.trim(),
            secret_key: secretKey.trim(),
          }),
        });
        navigate(`/agents/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!isEdit || !agentId) return;
    const next = !isActive;
    try {
      await api<Agent>(`/agents/${agentId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: next }),
      });
      setIsActive(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  }

  async function handleDelete() {
    if (!isEdit || !agentId) return;
    try {
      await api<void>(`/agents/${agentId}`, { method: 'DELETE' });
      navigate('/agents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // ── KB handlers ───────────────────────────────────
  async function handleCreateKb(kbName: string, kbDesc: string, file: File) {
    if (!agentId) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', kbName);
    if (kbDesc) fd.append('description', kbDesc);
    const created = await apiMultipart<KB>(`/agents/${agentId}/knowledgebase`, fd);
    setKbs((prev) => [...prev, created]);
    setKbModal({ open: false, kb: null });
  }

  async function handleDeleteKb(kb: KB) {
    if (!agentId) return;
    await api<void>(`/agents/${agentId}/knowledgebase/${kb.id}`, { method: 'DELETE' });
    setKbs((prev) => prev.filter((k) => k.id !== kb.id));
    setKbModal({ open: false, kb: null });
  }

  // ── Tool handlers ─────────────────────────────────
  async function handleSaveTool(form: { name: string; type: string; prompt: string; data: ToolData }) {
    if (!agentId) return;
    if (toolModal.tool) {
      const updated = await api<Tool>(`/agents/${agentId}/tools/${toolModal.tool.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await api<Tool>(`/agents/${agentId}/tools`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setTools((prev) => [...prev, created]);
    }
    setToolModal({ open: false, tool: null });
  }

  async function handleDeleteTool(tool: Tool) {
    if (!agentId) return;
    if (!confirm(`Delete tool "${tool.name}"?`)) return;
    try {
      await api<void>(`/agents/${agentId}/tools/${tool.id}`, { method: 'DELETE' });
      setTools((prev) => prev.filter((t) => t.id !== tool.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (loading) {
    return <div style={{ color: '#6a6a8a', padding: 40 }}>Loading agent…</div>;
  }

  return (
    <>
      {/* Page header */}
      <div className="form-header">
        <h1>{isEdit ? `Edit Agent: ${name || '…'}` : 'Create Agent'}</h1>
        <div className="form-header-actions">
          {isEdit && (
            <>
              <button
                className={isActive ? 'btn btn-danger' : 'btn btn-secondary'}
                onClick={handleToggleActive}
                disabled={saving}
              >
                {isActive ? 'Deactivate Agent' : 'Activate Agent'}
              </button>
              <button className="btn btn-danger" onClick={() => setDeleteOpen(true)} disabled={saving}>
                Delete
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/agents')} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Agent'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="form-sections">
        {/* Basic Identity */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-title"><IdentityIcon /> Basic Identity</span>
          </div>
          <div className="section-body">
            <div className="field-row">
              <div className="field">
                <label className="field-label">Agent Name</label>
                <input
                  className="field-input"
                  placeholder="e.g. Customer Support"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">
                  Secret Key {isEdit && !rotatingSecret && <span style={{ color: '#6a6a8a', fontWeight: 400 }}> (set on creation, cannot be viewed)</span>}
                </label>
                {isEdit && !rotatingSecret ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="field-input"
                      type="password"
                      value="••••••••••••"
                      readOnly
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-secondary" onClick={() => setRotatingSecret(true)}>
                      Rotate
                    </button>
                  </div>
                ) : (
                  <input
                    className="field-input"
                    type="password"
                    placeholder={isEdit ? 'Enter a new secret key' : 'A strong shared secret'}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Description</label>
              <input
                className="field-input"
                placeholder="A short summary shown in the agents list"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">System Prompt</label>
              <textarea
                className="field-textarea"
                placeholder="Describe how this agent should behave. This is the LLM system instruction."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={{ minHeight: 140 }}
              />
            </div>
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-title"><KbIcon /> Knowledge Base</span>
            <button
              className="btn btn-secondary"
              onClick={() => setKbModal({ open: true, kb: null })}
              disabled={!isEdit}
              title={!isEdit ? 'Create the agent first' : undefined}
            >
              + Upload KB
            </button>
          </div>
          <div className="section-body">
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!isEdit ? (
                    <tr><td colSpan={4} className="empty-table">Save the agent first to upload knowledge bases.</td></tr>
                  ) : kbs.length === 0 ? (
                    <tr><td colSpan={4} className="empty-table">No knowledge bases yet. Click "+ Upload KB" to add one.</td></tr>
                  ) : kbs.map((kb) => {
                    const statusClass = KB_STATUS_CLASS[kb.status] ?? 'inactive';
                    return (
                      <tr key={kb.id}>
                        <td className="td-name">{kb.name}</td>
                        <td className="td-desc">{kb.description ?? '—'}</td>
                        <td>
                          <div className="status-cell">
                            <span className={`status-dot ${statusClass}`} />
                            <span className={`status-text ${statusClass}`}>{kb.status.toUpperCase()}</span>
                          </div>
                        </td>
                        <td>
                          <button className="btn btn-ghost" onClick={() => setKbModal({ open: true, kb })}>
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-title"><ToolsIcon /> Tools &amp; Capabilities</span>
            <button
              className="btn btn-secondary"
              onClick={() => setToolModal({ open: true, tool: null })}
              disabled={!isEdit}
              title={!isEdit ? 'Create the agent first' : undefined}
            >
              + Create Tool
            </button>
          </div>
          <div className="section-body">
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>URL</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!isEdit ? (
                    <tr><td colSpan={4} className="empty-table">Save the agent first to add tools.</td></tr>
                  ) : tools.length === 0 ? (
                    <tr><td colSpan={4} className="empty-table">No tools yet. Click "+ Create Tool" to add one.</td></tr>
                  ) : tools.map((tool) => (
                    <tr key={tool.id}>
                      <td>{tool.type}</td>
                      <td className="td-name">{tool.name}</td>
                      <td className="td-desc">{tool.data?.url ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost" onClick={() => setToolModal({ open: true, tool })}>
                            Manage
                          </button>
                          <button className="btn btn-ghost" onClick={() => handleDeleteTool(tool)} title="Delete">
                            ×
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

        {/* Conversations (only in edit mode) */}
        {isEdit && (
          <div className="form-section">
            <div className="section-header">
              <span className="section-title"><ChatIcon /> Recent Conversations</span>
              {totalConversations > 5 && (
                <Link to={`/conversations`} className="btn btn-secondary">
                  View all ({totalConversations})
                </Link>
              )}
            </div>
            <div className="section-body">
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>External User</th>
                      <th>Started</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.length === 0 ? (
                      <tr><td colSpan={4} className="empty-table">No conversations for this agent yet.</td></tr>
                    ) : conversations.map((c) => (
                      <tr key={c.id}>
                        <td><span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, color: '#8a8aaa' }}>#{c.id.slice(0, 8)}</span></td>
                        <td>{c.external_user_id ?? '—'}</td>
                        <td className="td-desc">{relativeTime(c.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <Link to={`/conversations/${c.id}`} className="btn btn-ghost">View</Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {kbModal.open && (
        <KbModal
          kb={kbModal.kb}
          onClose={() => setKbModal({ open: false, kb: null })}
          onCreate={handleCreateKb}
          onDelete={handleDeleteKb}
        />
      )}
      {toolModal.open && (
        <ToolModal
          tool={toolModal.tool}
          onClose={() => setToolModal({ open: false, tool: null })}
          onSave={handleSaveTool}
        />
      )}
      {deleteOpen && (
        <ConfirmModal
          title="Delete Agent"
          message={<>Are you sure you want to delete <strong style={{ color: '#fff' }}>{name}</strong>? This will remove the agent, its knowledge bases, and tools.</>}
          warning="This action is permanent and cannot be undone."
          confirmLabel="Delete Agent"
          onConfirm={handleDelete}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}

function IdentityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6M9 12h6M9 15h4" />
    </svg>
  );
}

function KbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}
