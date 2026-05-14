import { useState, useRef, useEffect } from 'react';
import { api, chat } from '../../lib/api';
import './Playground.css';

type Agent = {
  id: string;
  name: string;
  is_active: boolean;
};

const AGENT_COLORS = ['#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#3b82f6'];

function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % AGENT_COLORS.length;
  return AGENT_COLORS[h];
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

type UserMessage = {
  id: string;
  role: 'user';
  text: string;
  timestamp: string;
};

type AgentMessage = {
  id: string;
  role: 'agent';
  agentName: string;
  agentColor: string;
  text: string;
  timestamp: string;
};

type Message = UserMessage | AgentMessage;

type ChatResponse = {
  response?: string;
  message?: string;
  content?: string;
  conversation_id?: string;
};

export default function Playground() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const canSend = Boolean(selectedAgent && secretKey.trim() && input.trim() && !sending);

  useEffect(() => {
    (async () => {
      try {
        const list = await api<Agent[]>('/agents');
        setAgents(list);
        if (list.length > 0) setSelectedAgentId(list[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      }
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  // Reset conversation when switching agent
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, [selectedAgentId]);

  async function handleSend() {
    if (!canSend || !selectedAgent) return;
    const text = input.trim();
    const userMsg: UserMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { message: text, agent_id: selectedAgentId };
      if (conversationId) body.conversation_id = conversationId;

      const res = await chat<ChatResponse>(secretKey.trim(), body);
      const replyText = res.response ?? res.message ?? res.content ?? '(empty response)';
      if (res.conversation_id) setConversationId(res.conversation_id);

      const agentMsg: AgentMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        agentName: selectedAgent.name,
        agentColor: colorForId(selectedAgent.id),
        text: replyText,
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed — check your secret key.');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="playground">
      <aside className="config-panel">
        <h1 className="playground-title">AI Playground</h1>

        <div className="config-section">
          <label className="config-label">Select Agent</label>
          <select
            className="config-select"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            disabled={agents.length === 0}
          >
            {agents.length === 0 ? (
              <option value="">No agents yet</option>
            ) : (
              agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.is_active ? '' : ' (inactive)'}</option>
              ))
            )}
          </select>
        </div>

        <div className="config-section">
          <div className="config-section-header">
            <SettingsIcon />
            <h3 className="config-section-title">Configuration</h3>
          </div>
          <div className="config-field">
            <div className="config-field-header">
              <label className="config-sublabel">agent secret key</label>
              <button className="config-reset" onClick={() => setSecretKey('')}>Clear</button>
            </div>
            <input
              type="password"
              className="config-input"
              placeholder="Paste this agent's secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
            <p style={{ fontSize: 10, color: '#6a6a8a', margin: '8px 0 0', lineHeight: 1.5 }}>
              The playground authenticates against <code style={{ color: '#a78bfa' }}>POST /chat</code> using the agent's secret key (not your account JWT).
            </p>
          </div>
        </div>
      </aside>

      <main className="chat-area">
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', fontSize: 12, margin: 14 }}>
            {error}
          </div>
        )}

        <div className="messages-list">
          {messages.length === 0 ? (
            <p style={{ color: '#6a6a8a', textAlign: 'center', padding: 80, fontSize: 13 }}>
              {agents.length === 0
                ? 'Create an agent first to chat with it.'
                : selectedAgent
                  ? `Send a message to chat with ${selectedAgent.name}.`
                  : 'Select an agent to start chatting.'}
            </p>
          ) : (
            <>
              {messages.map((msg) =>
                msg.role === 'user'
                  ? <UserBubble key={msg.id} msg={msg} />
                  : <AgentBubble key={msg.id} msg={msg} />
              )}
              {sending && selectedAgent && (
                <AgentBubble msg={{
                  id: 'pending',
                  role: 'agent',
                  agentName: selectedAgent.name,
                  agentColor: colorForId(selectedAgent.id),
                  text: 'Thinking…',
                  timestamp: nowTime(),
                }} />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="chat-input-section">
          <div className="chat-input-bar">
            <button className="chat-attach-btn" title="Attach" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              className="chat-textarea"
              placeholder={secretKey ? 'Message your agent…' : 'Paste an agent secret key to begin…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={!selectedAgent || !secretKey.trim()}
            />
            <button className="chat-send-btn" onClick={handleSend} disabled={!canSend}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" />
              </svg>
            </button>
          </div>
          <p className="chat-hint">
            {secretKey.trim()
              ? 'Press Enter to send, Shift + Enter for new line.'
              : 'A secret key is required — paste your agent\'s secret_key above.'}
          </p>
        </div>
      </main>
    </div>
  );
}

function UserBubble({ msg }: { msg: UserMessage }) {
  return (
    <div className="user-msg-wrap">
      <div className="user-bubble">{msg.text}</div>
      <span className="msg-time">{msg.timestamp}</span>
    </div>
  );
}

function AgentBubble({ msg }: { msg: AgentMessage }) {
  return (
    <div className="agent-msg-wrap">
      <div className="agent-header">
        <div className="agent-avatar-sm" style={{ background: msg.agentColor }}>
          {initials(msg.agentName)}
        </div>
        <span className="agent-name-sm">{msg.agentName}</span>
      </div>
      <div className="agent-content">
        <p className="agent-intro" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
