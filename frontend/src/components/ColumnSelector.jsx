// src/components/ColumnSelector.jsx

import { useState } from 'react';

export default function ColumnSelector({ allColumns, visibleColumns, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (col) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length === 1) return; // keep at least 1
      onChange(visibleColumns.filter(c => c !== col));
    } else {
      // Preserve original column order
      onChange(allColumns.filter(c => visibleColumns.includes(c) || c === col));
    }
  };

  const selectAll  = () => onChange([...allColumns]);
  const clearAll   = () => onChange([allColumns[0]]);

  return (
    <div className="col-selector-wrapper">
      <button className="btn btn-outline" onClick={() => setOpen(o => !o)}>
        <span className="btn-icon">⊞</span>
        Columns
        <span className="badge">{visibleColumns.length}/{allColumns.length}</span>
      </button>

      {open && (
        <div className="col-dropdown">
          <div className="col-dropdown-header">
            <span>Select Columns</span>
            <div className="col-actions">
              <button className="link-btn" onClick={selectAll}>All</button>
              <span className="divider">·</span>
              <button className="link-btn" onClick={clearAll}>None</button>
            </div>
          </div>

          <div className="col-list">
            {allColumns.map(col => (
              <label key={col} className="col-item">
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col)}
                  onChange={() => toggle(col)}
                />
                <span className="col-name">{col}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Close on outside click */}
      {open && <div className="col-backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}
