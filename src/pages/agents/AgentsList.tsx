import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import './AgentsList.css';

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

const AVATAR_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function relativeTime(iso: string): string {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

const PAGE_SIZE = 8;

export default function AgentsList() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<Agent[]>('/agents');
        setAgents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = agents.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = agents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div className="page-header-text">
          <h1>AI Agents</h1>
          <p>Manage, deploy, and monitor your autonomous AI fleet.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/agents/new')}>
          + Create New Agent
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent Identity</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>Loading agents…</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>No agents yet. Create your first agent.</td></tr>
            ) : paged.map((agent) => {
              const status = agent.is_active ? 'online' : 'offline';
              return (
                <tr key={agent.id}>
                  <td>
                    <div className="agent-identity">
                      <div className="agent-avatar" style={{ background: avatarColor(agent.name) }}>
                        {initials(agent.name)}
                      </div>
                      <div>
                        <div className="agent-name">{agent.name}</div>
                        <div className="agent-desc">{agent.description ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="status-cell">
                      <span className={`status-dot ${status}`} />
                      <span className={`status-text ${status}`}>{status.toUpperCase()}</span>
                    </div>
                  </td>
                  <td>{relativeTime(agent.created_at)}</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {total > 0 && (
          <div className="table-footer">
            <span className="pagination-info">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} agents
            </span>
            <div className="pagination-controls">
              <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
