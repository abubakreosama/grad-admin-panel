import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import './ConversationDetail.css';

type Message = {
  id: string;
  conversation_id: string;
  sender_role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type MessagesResponse = {
  total: number;
  limit: number;
  offset: number;
  items: Message[];
};

type ConversationItem = {
  id: string;
  agent_id: string;
  agent_name: string;
  external_user_id: string | null;
  created_at: string;
};

type ConversationsListResponse = {
  total: number;
  items: ConversationItem[];
};

const PAGE_SIZE = 50;
const USER_COLOR = '#3b82f6';
const AGENT_COLOR = '#8b5cf6';

function formatDateHeader(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  } catch { return iso; }
}

function formatMsgTime(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch { return iso; }
}

export default function ConversationDetail() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [meta, setMeta] = useState<ConversationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch first page of messages (API returns asc; we reverse to show newest first)
        const msgs = await api<MessagesResponse>(`/conversations/${conversationId}/messages?limit=${PAGE_SIZE}&offset=0`);
        setMessages([...msgs.items].reverse());
        setTotal(msgs.total);
        setOffset(msgs.items.length);

        // Look up agent name via the conversations listing (no GET /conversations/:id endpoint in spec)
        try {
          const list = await api<ConversationsListResponse>(`/conversations?limit=100`);
          setMeta(list.items.find((c) => c.id === conversationId) ?? null);
        } catch { /* ignore */ }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId]);

  async function loadMore() {
    if (!conversationId) return;
    try {
      const next = await api<MessagesResponse>(`/conversations/${conversationId}/messages?limit=${PAGE_SIZE}&offset=${offset}`);
      setMessages((prev) => [...[...next.items].reverse(), ...prev]);
      setOffset((o) => o + next.items.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    }
  }

  if (!conversationId) {
    return <p>Missing conversation id.</p>;
  }

  return (
    <div className="convo-detail">
      <div className="convo-back">
        <button className="back-btn" onClick={() => navigate('/conversations')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>
        <div className="convo-meta">
          <span className="convo-title">Conversation #{conversationId.slice(0, 8)}</span>
          {meta && (
            <span className="convo-subtitle">
              {meta.agent_name} · {meta.external_user_id ?? 'no external user'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="messages-area">
        {loading ? (
          <p style={{ color: '#6a6a8a', textAlign: 'center', padding: 40 }}>Loading messages…</p>
        ) : messages.length === 0 ? (
          <p style={{ color: '#6a6a8a', textAlign: 'center', padding: 40 }}>No messages in this conversation yet.</p>
        ) : (
          <>
            {messages.length > 0 && (
              <div className="date-separator">
                <span>{formatDateHeader(messages[0].created_at)}</span>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.sender_role === 'user') {
                return (
                  <div key={msg.id} className="msg-row user">
                    <div className="msg-avatar" style={{ background: USER_COLOR }}>U</div>
                    <div className="msg-col">
                      <div className="msg-bubble user">{msg.content}</div>
                      <div className="msg-time user-time">{formatMsgTime(msg.created_at)}</div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="msg-row agent">
                  <div className="msg-avatar agent-shape" style={{ background: AGENT_COLOR }}>
                    {meta ? meta.agent_name.slice(0, 2).toUpperCase() : 'AI'}
                  </div>
                  <div className="msg-col">
                    <div className="msg-bubble agent">{msg.content}</div>
                    <div className="msg-time">{formatMsgTime(msg.created_at)}</div>
                  </div>
                </div>
              );
            })}

            {offset < total && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <button className="back-btn" onClick={loadMore}>Load older messages ({total - offset} remaining)</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
