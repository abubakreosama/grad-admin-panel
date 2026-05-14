import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import './Dashboard.css';

type Agent = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type ConversationsListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: unknown[];
};

type KB = { id: string; status: string };

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

type Stats = {
  agents: number;
  activeAgents: number;
  conversations: number;
  knowledgeBases: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [agentList, convoCount] = await Promise.all([
          api<Agent[]>('/agents'),
          api<ConversationsListResponse>('/conversations?limit=1'),
        ]);
        if (cancelled) return;

        // Sum KBs across agents — best we can do without an aggregate endpoint.
        const kbCounts = await Promise.all(
          agentList.map((a) =>
            api<KB[]>(`/agents/${a.id}/knowledgebase`).catch(() => [] as KB[])
          )
        );
        if (cancelled) return;

        const totalKBs = kbCounts.reduce((sum, list) => sum + list.length, 0);
        setAgents(agentList);
        setStats({
          agents: agentList.length,
          activeAgents: agentList.filter((a) => a.is_active).length,
          conversations: convoCount.total,
          knowledgeBases: totalKBs,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: 'Active Agents', value: stats ? formatNum(stats.activeAgents) : '…' },
    { label: 'Total Agents',  value: stats ? formatNum(stats.agents) : '…' },
    { label: 'Knowledge Bases', value: stats ? formatNum(stats.knowledgeBases) : '…' },
    { label: 'Conversations', value: stats ? formatNum(stats.conversations) : '…' },
  ];

  return (
    <>
      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div className="dashboard-stats">
        {cards.map((c, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <p className="chart-title">Your Agents</p>
        {agents.length === 0 ? (
          <p style={{ color: '#6a6a8a', fontSize: 13, margin: '12px 0' }}>
            {stats ? 'No agents yet. ' : 'Loading… '}
            <Link to="/agents/new" style={{ color: '#a78bfa' }}>Create your first agent →</Link>
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agents.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link
                  to={`/agents/${a.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: '#0f0f22',
                    border: '1px solid rgba(255,255,255,0.05)',
                    textDecoration: 'none',
                    color: '#e0e0f0',
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: a.is_active ? '#22c55e' : '#6b7280', fontWeight: 700, letterSpacing: 0.5 }}>
                    {a.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
