// src/components/ChartRenderer.jsx
// Requires: npm install recharts
// Props:
//   facetField  string   Solr field to facet on e.g. "Brand_Name_s"
//   filters     object   Active filters to scope the chart data
//   title       string   Optional chart title override

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Colour palette — vibrant on dark bg ───────────────────────
const PALETTE = [
  '#6366f1', '#3fb950', '#f78166', '#d2a8ff',
  '#58a6ff', '#f0883e', '#56d364', '#79c0ff',
  '#ffa657', '#ff7b72', '#a5f3fc', '#c084fc',
];

// ── Chart types ───────────────────────────────────────────────
const CHART_TYPES = [
  { id: 'bar', label: 'Bar' },
  { id: 'pie', label: 'Pie' },
];

// ── Custom Tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label ?? payload[0]?.name}</p>
      <p className="chart-tooltip__value">
        {payload[0]?.value?.toLocaleString()}
        <span className="chart-tooltip__unit"> records</span>
      </p>
    </div>
  );
}

// ── Custom Pie label ──────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null;
  const RAD   = Math.PI / 180;
  const r     = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x     = cx + r * Math.cos(-midAngle * RAD);
  const y     = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={600} fontFamily="'DM Mono', monospace">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}


// ── Main Component ────────────────────────────────────────────
export default function ChartRenderer({ facetField, filters = {}, title }) {
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [chartType,  setChartType]  = useState('bar');
  const [topN,       setTopN]       = useState(10);

  // Fetch facet data whenever facetField or filters change
  useEffect(() => {
    if (!facetField) return;

    const controller = new AbortController();

    async function fetchFacets() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          facet_field: facetField,
          limit: 0,           // we only need facets, not records
          ...filters,
        });

        const res  = await fetch(`${BASE_URL}/api/reports?${params}`, {
          signal:  controller.signal,
          headers: { Accept: 'application/json' },
        });
        const json = await res.json();

        if (!json.success) throw new Error(json.error || 'API error');

        const raw = json.facets?.[facetField] ?? {};

        // Convert { label: count } → [{ name, value }] sorted desc
        const parsed = Object.entries(raw)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        setChartData(parsed);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFacets();
    return () => controller.abort();
  }, [facetField, JSON.stringify(filters)]); // eslint-disable-line

  // Slice to topN
  const displayed = useMemo(() => chartData.slice(0, topN), [chartData, topN]);

  const total = useMemo(
    () => displayed.reduce((s, d) => s + d.value, 0),
    [displayed]
  );

  const chartTitle = title ?? facetField?.replace(/_[sifbdt]$/, '').replace(/_/g, ' ') ?? 'Chart';

  // ── Empty / loading / error guards ───────────────────────────
  if (!facetField) {
    return (
      <div className="chart-card chart-card--placeholder">
        <span className="chart-placeholder-icon">◈</span>
        <p>Select a field to visualize</p>
      </div>
    );
  }

  return (
    <div className="chart-card">

      {/* Header */}
      <div className="chart-header">
        <div className="chart-header-left">
          <h3 className="chart-title">{chartTitle}</h3>
          {!loading && chartData.length > 0 && (
            <span className="chart-meta">
              {total.toLocaleString()} records · {chartData.length} values
            </span>
          )}
        </div>

        <div className="chart-controls">
          {/* Top N selector */}
          <select
            className="chart-select"
            value={topN}
            onChange={e => setTopN(Number(e.target.value))}
          >
            {[5, 10, 15, 20].map(n => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>

          {/* Chart type toggle */}
          <div className="chart-type-toggle">
            {CHART_TYPES.map(ct => (
              <button
                key={ct.id}
                className={`chart-type-btn ${chartType === ct.id ? 'active' : ''}`}
                onClick={() => setChartType(ct.id)}
              >
                {ct.id === 'bar' ? '▦' : '◑'} {ct.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="chart-body">

        {/* Loading */}
        {loading && (
          <div className="chart-state">
            <div className="chart-spinner" />
            <span>Loading chart data…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="chart-state chart-state--error">
            <span>⚠ {error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && displayed.length === 0 && (
          <div className="chart-state">
            <span>No data for <strong>{facetField}</strong></span>
          </div>
        )}

        {!loading && !error && displayed.length > 0 && chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={displayed} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce8f7" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#5a82ab', fontSize: 11, fontFamily: 'DM Mono, monospace' }}
                angle={-35}
                textAnchor="end"
                interval={0}
                tickLine={false}
                axisLine={{ stroke: '#b8d4f0' }}
              />
              <YAxis
                tick={{ fill: '#5a82ab', fontSize: 11, fontFamily: 'DM Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(43,127,255,.06)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {displayed.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Pie Chart */}
        {!loading && !error && displayed.length > 0 && chartType === 'pie' && (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={displayed}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                outerRadius={110}
                labelLine={false}
                label={<PieLabel />}
                strokeWidth={0}
              >
                {displayed.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}