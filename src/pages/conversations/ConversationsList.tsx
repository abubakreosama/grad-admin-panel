import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import './ConversationsList.css';

type Conversation = {
  id: string;
  agent_id: string;
  agent_name: string;
  external_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationsListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: Conversation[];
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

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return iso;
  }
}

const PAGE_SIZE = 8;

export default function ConversationsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agentFilter = searchParams.get('agent_id');

  const [page, setPage] = useState(1);
  const [data, setData] = useState<ConversationsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
    });
    if (agentFilter) params.set('agent_id', agentFilter);

    api<ConversationsListResponse>(`/conversations?${params}`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, agentFilter]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.items ?? [];
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Conversations Logs</h1>
          <p>Monitor real-time interactions and system logs for all deployed AI agents.</p>
        </div>
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
              <th>ID</th>
              <th>Target Agent</th>
              <th>External User</th>
              <th>Timestamp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: '#6a6a8a' }}>No conversations yet.</td></tr>
            ) : rows.map((c) => (
              <tr key={c.id}>
                <td><span className="conv-id">#{c.id.slice(0, 8)}</span></td>
                <td>
                  <div className="agent-cell">
                    <div className="agent-avatar" style={{ background: avatarColor(c.agent_name) }}>
                      {initials(c.agent_name)}
                    </div>
                    <span className="agent-name">{c.agent_name}</span>
                  </div>
                </td>
                <td><span className="user-id">{c.external_user_id ?? '—'}</span></td>
                <td><span className="timestamp">{formatTimestamp(c.created_at)}</span></td>
                <td>
                  <button
                    className="icon-btn"
                    title="View conversation"
                    onClick={() => navigate(`/conversations/${c.id}`)}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 0 && (
          <div className="table-footer">
            <span className="pagination-info">
              Showing {from} to {to} of {total.toLocaleString()} logs
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </>
  );
}

function Pagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const last = totalPages;

  const pages: (number | '...')[] = [];
  if (page > 1) pages.push(1);
  if (page > 3) pages.push('...');
  if (page > 2) pages.push(page - 1);
  pages.push(page);
  if (page < last - 1) pages.push(page + 1);
  if (page < last - 2) pages.push('...');
  if (page < last) pages.push(last);

  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="page-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`page-btn${p === page ? ' active' : ''}`}
            onClick={() => onPageChange(p as number)}
          >
            {p}
          </button>
        )
      )}

      <button className="page-btn" onClick={() => onPageChange(page + 1)} disabled={page === last}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
