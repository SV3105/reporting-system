// src/components/FilterBar.jsx

import { useState } from 'react';

const INITIAL = { column: '', min: '', max: '', search: '' };

export default function FilterBar({ columns, onApply }) {
  const [form, setForm] = useState(INITIAL);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const apply = () => {
    const active = {};
    if (form.column) {
      if (form.min !== '' || form.max !== '') {
        active.column = form.column;
        if (form.min !== '') active.min = form.min;
        if (form.max !== '') active.max = form.max;
      }
      if (form.search) {
        active.column = form.column;
        active.search = form.search;
      }
    }
    onApply(active);
  };

  const reset = () => { setForm(INITIAL); onApply({}); };

  const hasFilter = form.column && (form.min || form.max || form.search);

  return (
    <div className="filter-bar">
      {/* Column picker */}
      <div className="filter-group">
        <label className="filter-label">Column</label>
        <select
          className="filter-select"
          value={form.column}
          onChange={e => set('column', e.target.value)}
        >
          <option value="">— select —</option>
          {columns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Range */}
      <div className="filter-group">
        <label className="filter-label">Min</label>
        <input
          className="filter-input"
          type="number"
          placeholder="0"
          value={form.min}
          onChange={e => set('min', e.target.value)}
          disabled={!form.column}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Max</label>
        <input
          className="filter-input"
          type="number"
          placeholder="∞"
          value={form.max}
          onChange={e => set('max', e.target.value)}
          disabled={!form.column}
        />
      </div>

      {/* Text search */}
      <div className="filter-group filter-group--wide">
        <label className="filter-label">Search</label>
        <input
          className="filter-input"
          type="text"
          placeholder="keyword..."
          value={form.search}
          onChange={e => set('search', e.target.value)}
          disabled={!form.column}
          onKeyDown={e => e.key === 'Enter' && apply()}
        />
      </div>

      <div className="filter-actions">
        <button className="btn btn-primary" onClick={apply} disabled={!hasFilter}>
          Apply
        </button>
        <button className="btn btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
