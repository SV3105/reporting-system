// src/components/FilterPanel.jsx
import { useState, useEffect, useCallback } from 'react';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function FilterPanel({ columns, onFiltersChange }) {
  const [column, setColumn] = useState('');
  const [min,    setMin]    = useState('');
  const [max,    setMax]    = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(false);

  // Debounced emit — fires 500ms after last change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emit = useCallback(
    debounce((filters) => onFiltersChange(filters), 500),
    [onFiltersChange]
  );

  useEffect(() => {
    if (!column) { emit({}); return; }

    const filters = { column };
    if (min    !== '') filters.min    = min;
    if (max    !== '') filters.max    = max;
    if (search !== '') filters.search = search;

    const hasFilter = min !== '' || max !== '' || search !== '';
    setActive(hasFilter);
    emit(hasFilter ? filters : {});
  }, [column, min, max, search, emit]);

  const reset = () => {
    setColumn(''); setMin(''); setMax(''); setSearch('');
    setActive(false);
    onFiltersChange({});
  };

  return (
    <div className="filter-panel">
      <div className="filter-panel__header">
        <span className="filter-panel__title">
          <span className="filter-icon">⌕</span> Filters
        </span>
        {active && (
          <span className="filter-active-badge">Active</span>
        )}
        {(active || column) && (
          <button className="filter-reset-btn" onClick={reset}>
            ✕ Reset
          </button>
        )}
      </div>

      <div className="filter-panel__body">

        {/* Column Selector */}
        <div className="fp-group">
          <label className="fp-label">Column</label>
          <select
            className="fp-select"
            value={column}
            onChange={e => { setColumn(e.target.value); setMin(''); setMax(''); setSearch(''); }}
          >
            <option value="">— select column —</option>
            {columns.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Text Search */}
        <div className="fp-group">
          <label className="fp-label">
            Text Search
            <span className="fp-hint">wildcard match</span>
          </label>
          <div className="fp-input-wrap">
            <span className="fp-input-icon">⌕</span>
            <input
              className="fp-input"
              type="text"
              placeholder="e.g. chair"
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={!column}
            />
            {search && (
              <button className="fp-clear-btn" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>

        {/* Number Range */}
        <div className="fp-group fp-group--range">
          <label className="fp-label">
            Number Range
            <span className="fp-hint">for numeric columns</span>
          </label>
          <div className="fp-range">
            <div className="fp-range-input">
              <span className="fp-range-label">Min</span>
              <input
                className="fp-input"
                type="number"
                placeholder="0"
                value={min}
                onChange={e => setMin(e.target.value)}
                disabled={!column}
              />
            </div>
            <span className="fp-range-sep">→</span>
            <div className="fp-range-input">
              <span className="fp-range-label">Max</span>
              <input
                className="fp-input"
                type="number"
                placeholder="∞"
                value={max}
                onChange={e => setMax(e.target.value)}
                disabled={!column}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Active filter summary */}
      {active && column && (
        <div className="filter-summary">
          <span className="filter-summary__label">Filtering:</span>
          <span className="filter-summary__tag">
            <strong>{column}</strong>
            {search && <> · search: <em>*{search}*</em></>}
            {(min || max) && <> · range: <em>{min||'*'} → {max||'*'}</em></>}
          </span>
        </div>
      )}
    </div>
  );
}
