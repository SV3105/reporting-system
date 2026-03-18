// src/components/DateComparison.jsx
// Props:
//   onDateChange fn({date_field, start_date, end_date}) → called when applied
//   allFields    array   All available fields (for date field picker)
//   compact      bool    When true, renders as a dropdown button (for topbar)

import { useState, useEffect, useRef } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent ? 'stat-card--accent' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? '—'}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

// ── Trend Badge ───────────────────────────────────────────────
function TrendBadge({ trend, percentage, difference }) {
  if (trend === undefined) return null;
  const icon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const cls  = trend === 'up' ? 'trend--up' : trend === 'down' ? 'trend--down' : 'trend--flat';
  const pct  = percentage !== null ? `${percentage > 0 ? '+' : ''}${percentage}%` : 'N/A';
  const diff = difference !== null ? `${difference > 0 ? '+' : ''}${difference.toLocaleString()}` : '';
  return (
    <div className={`trend-badge ${cls}`}>
      <span className="trend-icon">{icon}</span>
      <span className="trend-pct">{pct}</span>
      {diff && <span className="trend-diff">{diff} records</span>}
    </div>
  );
}

// ── Inner panel (shared between compact dropdown and full mode) ─
function DatePanel({ allFields, onDateChange, onClose }) {
  const today    = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

  const [dateField, setDateField] = useState('');
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate,   setEndDate]   = useState(today);
  const [compare,   setCompare]   = useState(false);
  const [applied,   setApplied]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [result,    setResult]    = useState(null);

  const presets = [
    { label: 'Last 7d',   days: 7  },
    { label: 'Last 30d',  days: 30 },
    { label: 'Last 90d',  days: 90 },
    { label: 'This year', year: true },
  ];

  const applyPreset = ({ days, year }) => {
    const end = new Date();
    const start = year ? new Date(end.getFullYear(), 0, 1) : new Date(Date.now() - days * 864e5);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const handleApply = async () => {
    if (!dateField || !startDate || !endDate) {
      setError('Please select a date field, start date and end date.');
      return;
    }
    if (startDate > endDate) {
      setError('Start date must be before end date.');
      return;
    }
    setError(null);
    setLoading(true);
    setApplied(false);
    try {
      if (compare) {
        const params = new URLSearchParams({ date_field: dateField, start_date: startDate, end_date: endDate, compare: 'true' });
        const res  = await fetch(`${BASE_URL}/api/reports/daterange?${params}`, { headers: { Accept: 'application/json' } });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'API error');
        setResult(json);
      } else {
        setResult(null);
      }
      setApplied(true);
      onDateChange?.({ date_field: dateField, start_date: startDate, end_date: endDate, compare });
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null); setApplied(false); setError(null);
    onDateChange?.(null);
  };

  const dateFields  = allFields.filter(f => f.endsWith('_dt') || f.endsWith('_date') || f.toLowerCase().includes('date') || f.toLowerCase().includes('time'));
  const otherFields = allFields.filter(f => !dateFields.includes(f));
  const fieldOptions = [...dateFields, ...otherFields];

  return (
    <div className="dc-panel">
      {/* Date field */}
      <div className="fp-group">
        <label className="fp-label">Date Field</label>
        <select className="fp-select fp-select--sm" value={dateField} onChange={e => setDateField(e.target.value)}>
          <option value="">— select field —</option>
          {fieldOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Presets */}
      <div className="fp-group">
        <label className="fp-label">Quick Select</label>
        <div className="dc-presets">
          {presets.map(p => (
            <button key={p.label} className="dc-preset-btn" onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* Date inputs */}
      <div className="dc-dates-row">
        <div className="fp-group" style={{ flex: 1 }}>
          <label className="fp-label">Start</label>
          <input type="date" className="fp-input fp-input--sm dc-date-input" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <span style={{ color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 8 }}>→</span>
        <div className="fp-group" style={{ flex: 1 }}>
          <label className="fp-label">End</label>
          <input type="date" className="fp-input fp-input--sm dc-date-input" value={endDate} min={startDate} max={today} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Compare toggle */}
      <label className="dc-compare-toggle">
        <div className={`dc-toggle ${compare ? 'dc-toggle--on' : ''}`} onClick={() => setCompare(c => !c)}>
          <div className="dc-toggle-thumb" />
        </div>
        <span className="dc-compare-label">Compare with previous period</span>
      </label>

      {/* Actions */}
      <div className="dc-actions">
        <button className="btn btn-primary btn-sm" onClick={handleApply} disabled={loading || !dateField} style={{ flex: 1, justifyContent: 'center' }}>
          {loading ? '⟳ Loading…' : '⊡ Apply'}
        </button>
        {applied && (
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>✕ Reset</button>
        )}
      </div>

      {error && <div className="dc-error">⚠ {error}</div>}

      {applied && !compare && (
        <div className="dc-applied">
          <span className="dc-applied-dot" />
          Active: {startDate} → {endDate}
        </div>
      )}

      {/* Comparison Results */}
      {result && compare && (
        <div className="dc-results">
          <div className="dc-results-header">
            <span className="dc-results-title">Period Comparison</span>
            <TrendBadge trend={result.comparison?.trend} percentage={result.comparison?.percentage} difference={result.comparison?.difference} />
          </div>
          <div className="dc-stats-grid">
            <StatCard label="Current Period" value={result.current?.count?.toLocaleString()} sub={`${result.current?.start?.slice(0,10)} → ${result.current?.end?.slice(0,10)}`} accent />
            <StatCard label="Previous Period" value={result.previous?.count?.toLocaleString()} sub={`${result.previous?.start?.slice(0,10)} → ${result.previous?.end?.slice(0,10)}`} />
          </div>
          <div className="dc-breakdown">
            <div className="dc-breakdown-row">
              <span className="dc-breakdown-label">Difference</span>
              <span className={`dc-breakdown-value ${result.comparison?.difference > 0 ? 'text-green' : result.comparison?.difference < 0 ? 'text-red' : ''}`}>
                {result.comparison?.difference > 0 ? '+' : ''}{result.comparison?.difference?.toLocaleString() ?? '—'}
              </span>
            </div>
            <div className="dc-breakdown-row">
              <span className="dc-breakdown-label">Change</span>
              <span className={`dc-breakdown-value ${result.comparison?.percentage > 0 ? 'text-green' : result.comparison?.percentage < 0 ? 'text-red' : ''}`}>
                {result.comparison?.percentage !== null
                  ? `${result.comparison.percentage > 0 ? '+' : ''}${result.comparison.percentage}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────
export default function DateComparison({ onDateChange, allFields = [], compact = false }) {
  const [open,    setOpen]    = useState(false);
  const [active,  setActive]  = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleChange = (val) => {
    setActive(!!val);
    onDateChange?.(val);
  };

  if (compact) {
    return (
      <div className="dc-compact-wrapper" ref={ref}>
        <button
          className={`btn btn-outline btn-sm dc-compact-btn ${active ? 'btn-outline--active' : ''}`}
          onClick={() => setOpen(o => !o)}
        >
          <span>⊡</span>
          Date Filter
          {active && <span className="inline-filters__dot" />}
        </button>

        {open && (
          <>
            <div className="dc-compact-dropdown">
              <div className="dc-compact-header">
                <span className="dc-title"><span className="dc-icon">⊡</span> Date Range</span>
                <button className="filter-reset-btn" onClick={() => setOpen(false)}>✕</button>
              </div>
              <DatePanel allFields={allFields} onDateChange={handleChange} onClose={() => setOpen(false)} />
            </div>
            <div className="col-backdrop" onClick={() => setOpen(false)} />
          </>
        )}
      </div>
    );
  }

  // Full (non-compact) mode — used in Charts page
  return (
    <div className="date-comparison">
      <div className="dc-header">
        <span className="dc-title"><span className="dc-icon">⊡</span> Date Range</span>
      </div>
      <div className="dc-body">
        <DatePanel allFields={allFields} onDateChange={onDateChange} />
      </div>
    </div>
  );
}