import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import './Dashboard.css';

type DayPoint = { date: string; count: number };
type HourPoint = { hour: number; count: number };

type DashboardData = {
  active_agents: number;
  total_agents: number;
  total_knowledge_bases: number;
  total_conversations: number;
  conversations_by_day: DayPoint[];
  messages_by_hour: HourPoint[];
};

function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

function BarChart({
  bars,
  labels,
  color = '#7c3aed',
  emptyText = 'No data',
}: {
  bars: number[];
  labels: string[];
  color?: string;
  emptyText?: string;
}) {
  const maxVal = Math.max(...bars, 1);
  const count = bars.length;

  if (count === 0) {
    return <p style={{ color: '#6a6a8a', fontSize: 13, margin: '24px 0' }}>{emptyText}</p>;
  }

  const chartH = 160;
  const labelH = 20;
  const totalH = chartH + labelH;
  const gap = 2;
  const barW = Math.max(4, Math.floor((600 - gap * count) / count));
  const svgW = count * (barW + gap);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${svgW} ${totalH}`} style={{ width: '100%', height: totalH }}>
        {bars.map((val, i) => {
          const barH = val === 0 ? 2 : Math.max(4, Math.round((val / maxVal) * chartH));
          const x = i * (barW + gap);
          const y = chartH - barH;
          const isHighlighted = val === maxVal && maxVal > 0;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="3"
                fill={isHighlighted ? color : `${color}66`}
              />
              {(count <= 31) && (
                <text
                  x={x + barW / 2}
                  y={chartH + 15}
                  textAnchor="middle"
                  fontSize={count > 24 ? 8 : 10}
                  fill="#6a6a8a"
                  fontFamily="system-ui, sans-serif"
                >
                  {labels[i]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<DashboardData>('/analytics/dashboard')
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard'); });
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: 'Active Agents',     value: data ? formatNum(data.active_agents) : '…' },
    { label: 'Total Agents',      value: data ? formatNum(data.total_agents) : '…' },
    { label: 'Knowledge Bases',   value: data ? formatNum(data.total_knowledge_bases) : '…' },
    { label: 'Total Conversations', value: data ? formatNum(data.total_conversations) : '…' },
  ];

  const dayBars    = data?.conversations_by_day.map((d) => d.count) ?? [];
  const dayLabels  = data?.conversations_by_day.map((d) => d.date.slice(8)) ?? [];  // day number
  const hourBars   = data?.messages_by_hour.map((h) => h.count) ?? [];
  const hourLabels = data?.messages_by_hour.map((h) => {
    const h12 = h.hour % 12 || 12;
    return `${h12}${h.hour < 12 ? 'a' : 'p'}`;
  }) ?? [];

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

      <div className="charts-row">
        <div className="chart-card">
          <p className="chart-title">Conversations — This Month</p>
          {!data ? (
            <p className="dashboard-loading">Loading…</p>
          ) : (
            <BarChart
              bars={dayBars}
              labels={dayLabels}
              color="#7c3aed"
              emptyText="No conversations this month yet."
            />
          )}
        </div>

        <div className="chart-card">
          <p className="chart-title">Messages Today — By Hour</p>
          {!data ? (
            <p className="dashboard-loading">Loading…</p>
          ) : (
            <BarChart
              bars={hourBars}
              labels={hourLabels}
              color="#06b6d4"
              emptyText="No messages today yet."
            />
          )}
        </div>
      </div>
    </>
  );
}
