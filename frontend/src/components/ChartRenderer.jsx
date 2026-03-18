// src/components/ChartRenderer.jsx
// Requires: npm install recharts
// Props:
//   facetField  string   Solr field to facet on e.g. "Brand_Name_s"
//   filters     object   Active filters to scope the chart data
//   title       string   Optional chart title override

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line
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
  { id: 'line', label: 'Line' },
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
export default function ChartRenderer({ facetField, filters = {}, title, onDrilldown }) {
  const [chartData,  setChartData]  = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [chartType,  setChartType]  = useState('bar');
  const [topN,       setTopN]       = useState(10);
  const chartRef = useRef(null);

  const exportChart = () => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;

    // Get actual dimensions or fallback
    const width = svg.clientWidth || svg.getBoundingClientRect().width || 800;
    const height = svg.clientHeight || svg.getBoundingClientRect().height || 400;

    let source = new XMLSerializer().serializeToString(svg);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x resolution for sharpness
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      
      // Draw white background so transparent SVGs don't turn black
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Scale context and draw
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      DOMURL.revokeObjectURL(url);

      // Download as PNG
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${facetField}_chart.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = url;
  };

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
                {ct.id === 'bar' ? '▦' : ct.id === 'line' ? '📈' : '◑'} {ct.label}
              </button>
            ))}
          </div>

          <button 
            className="btn btn-outline" 
            onClick={exportChart} 
            title="Download chart as PNG image"
            style={{ padding: '5px 12px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            📥
          </button>
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
          <div ref={chartRef} style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
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
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={48}
                  onClick={(data) => onDrilldown?.(facetField, data.name)}
                  style={{ cursor: onDrilldown ? 'pointer' : 'default' }}
                >
                  {displayed.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Line Chart */}
        {!loading && !error && displayed.length > 0 && chartType === 'line' && (
          <div ref={chartRef} style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayed} margin={{ top: 8, right: 16, left: 8, bottom: 60 }}
                onClick={(e) => {
                  if (e?.activePayload) onDrilldown?.(facetField, e.activePayload[0].payload.name);
                }}
                style={{ cursor: onDrilldown ? 'pointer' : 'default' }}
              >
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
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(43,127,255,.2)', strokeWidth: 32 }} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={PALETTE[0]} 
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: PALETTE[0], stroke: '#fff', strokeWidth: 2 }}
                  dot={{ r: 4, fill: PALETTE[0], strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie Chart */}
        {!loading && !error && displayed.length > 0 && chartType === 'pie' && (
          <div ref={chartRef} style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
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
                  onClick={(data) => onDrilldown?.(facetField, data.name)}
                  style={{ cursor: onDrilldown ? 'pointer' : 'default', transition: 'filter 0.2s' }}
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
          </div>
        )}
      </div>
    </div>
  );
}