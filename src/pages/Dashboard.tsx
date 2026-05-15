import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import './Dashboard.css';

type DayPoint  = { date: string; count: number };
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
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

type AxisLabel  = { index: number; label: string };
type TooltipState = { label: string; count: number; x: number; y: number } | null;

function BarChart({
  bars,
  barLabels,
  axisLabels,
  emptyText = 'No data yet.',
}: {
  bars: number[];
  barLabels: string[];
  axisLabels: AxisLabel[];
  emptyText?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const count = bars.length;
  if (count === 0) {
    return <p style={{ color: '#6a6a8a', fontSize: 13, margin: '32px 0 8px' }}>{emptyText}</p>;
  }

  const maxVal  = Math.max(...bars, 1);
  const VIEW_W  = 600;
  const TOP_PAD = 14;
  const CHART_H = 70;
  const AXIS_H  = 22;
  const TOTAL_H = TOP_PAD + CHART_H + AXIS_H;
  const GAP     = 7;
  const barW    = Math.max(3, Math.floor((VIEW_W - GAP * (count - 1)) / count));
  const svgW    = count * barW + (count - 1) * GAP;

  function handleBarEnter(e: React.MouseEvent<SVGRectElement>, i: number) {
    const wrapRect = wrapRef.current?.getBoundingClientRect();
    const barRect  = e.currentTarget.getBoundingClientRect();
    if (!wrapRect) return;
    const rawX = barRect.left + barRect.width / 2 - wrapRect.left;
    // Clamp so the tooltip (≈80px wide) never overflows either edge of the wrapper
    const x = Math.max(44, Math.min(wrapRect.width - 44, rawX));
    setTooltip({
      label: barLabels[i],
      count: bars[i],
      x,
      y: barRect.top - wrapRect.top,
    });
  }

  return (
    <div ref={wrapRef} className="chart-wrap">
      <svg
        viewBox={`0 0 ${svgW} ${TOTAL_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="none"
      >
        {bars.map((val, i) => {
          const barH = val === 0
            ? 3
            : Math.max(5, Math.round((val / maxVal) * CHART_H));
          const x = i * (barW + GAP);
          const y = TOP_PAD + CHART_H - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              fill={tooltip?.label === barLabels[i] ? '#5a5a8c' : '#3b3b5c'}
              style={{ cursor: 'pointer', transition: 'fill 0.1s' }}
              onMouseEnter={(e) => handleBarEnter(e, i)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {axisLabels.map(({ index, label }) => {
          const x = index * (barW + GAP) + barW / 2;
          return (
            <text
              key={index}
              x={x}
              y={TOP_PAD + CHART_H + 16}
              textAnchor={
                index === 0 ? 'start'
                : index === count - 1 ? 'end'
                : 'middle'
              }
              fontSize="11"
              fill="#6a6a8a"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="bar-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="bar-tooltip-label">{tooltip.label}</div>
          <div className="bar-tooltip-count">{tooltip.count}</div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]   = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<DashboardData>('/analytics/dashboard')
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard'); });
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: 'Active Agents',       value: data ? formatNum(data.active_agents)        : '…' },
    { label: 'Total Agents',        value: data ? formatNum(data.total_agents)          : '…' },
    { label: 'Knowledge Bases',     value: data ? formatNum(data.total_knowledge_bases) : '…' },
    { label: 'Total Conversations', value: data ? formatNum(data.total_conversations)   : '…' },
  ];

  // ── Conversations by day ─────────────────────────────────────────────
  const dayPoints  = data?.conversations_by_day ?? [];
  const dayBars    = dayPoints.map((d) => d.count);
  const dayLabels  = dayPoints.map((d) => d.date.slice(8));       // "01"–"31"
  const dayCount   = dayBars.length;
  const dayAxisLabels: AxisLabel[] = dayCount === 0 ? [] : (() => {
    const positions = new Set([
      0,
      Math.floor(dayCount / 4),
      Math.floor(dayCount / 2),
      Math.floor((3 * dayCount) / 4),
      dayCount - 1,
    ]);
    return Array.from(positions)
      .sort((a, b) => a - b)
      .map((i) => ({ index: i, label: dayLabels[i] }));
  })();

  // ── Messages by hour ─────────────────────────────────────────────────
  const hourPoints = data?.messages_by_hour ?? [];
  const hourBars   = hourPoints.map((h) => h.count);
  const hourLabels = hourPoints.map((h) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h.hour)}:00`;
  });
  const hourAxisLabels: AxisLabel[] = [
    { index: 0,  label: '00:00' },
    { index: 6,  label: '06:00' },
    { index: 12, label: '12:00' },
    { index: 18, label: '18:00' },
    { index: 23, label: '23:59' },
  ].filter(({ index }) => index < hourBars.length);

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
        <p className="chart-title">Conversations — This Month</p>
        {!data ? (
          <p className="dashboard-loading">Loading…</p>
        ) : (
          <BarChart
            bars={dayBars}
            barLabels={dayLabels}
            axisLabels={dayAxisLabels}
            emptyText="No conversations this month yet."
          />
        )}
      </div>

      <div className="chart-card">
        <p className="chart-title">Messages Statistics</p>
        {!data ? (
          <p className="dashboard-loading">Loading…</p>
        ) : (
          <BarChart
            bars={hourBars}
            barLabels={hourLabels}
            axisLabels={hourAxisLabels}
            emptyText="No messages today yet."
          />
        )}
      </div>
    </>
  );
}
