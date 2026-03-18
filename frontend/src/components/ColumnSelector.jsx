// src/components/ColumnSelector.jsx

import { useState, useEffect } from 'react';

export default function ColumnSelector({ allColumns, visibleColumns, onChange }) {
  const [open, setOpen] = useState(false);
  const [orderedList, setOrderedList] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);

  // Sync internal list when dropdown opens
  useEffect(() => {
    if (open) {
      const visible = visibleColumns.filter(c => allColumns.includes(c));
      const hidden  = allColumns.filter(c => !visibleColumns.includes(c));
      setOrderedList([...visible, ...hidden]);
    }
  }, [open, allColumns, visibleColumns]);

  const toggle = (col) => {
    if (visibleColumns.includes(col)) {
      if (visibleColumns.length === 1) return; // keep at least 1
      onChange(visibleColumns.filter(c => c !== col));
    } else {
      // Add based on its current position in the reordered list
      const newVisible = orderedList.filter(c => visibleColumns.includes(c) || c === col);
      onChange(newVisible);
    }
  };

  const selectAll = () => onChange([...allColumns]);
  const clearAll  = () => onChange([allColumns[0]]);

  // ── Drag and Drop Handlers ──
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires setting data
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    // Swap items in local state while dragging
    setOrderedList(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedIdx, 1);
      copy.splice(index, 0, moved);
      return copy;
    });
    setDraggedIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    // Commit the new order to the parent table
    const newlyOrderedVisible = orderedList.filter(c => visibleColumns.includes(c));
    onChange(newlyOrderedVisible);
  };

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
            <span>Select & Reorder</span>
            <div className="col-actions">
              <button className="link-btn" onClick={selectAll}>All</button>
              <span className="divider">·</span>
              <button className="link-btn" onClick={clearAll}>None</button>
            </div>
          </div>

          <div className="col-list" style={{ overflowY: 'auto', maxHeight: '400px' }}>
            {orderedList.map((col, idx) => {
              const isVisible = visibleColumns.includes(col);
              const isDragging = draggedIdx === idx;
              
              return (
                <label 
                  key={col} 
                  className={`col-item ${isDragging ? 'col-item--dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '6px 10px',
                    cursor: 'grab',
                    opacity: isDragging ? 0.4 : 1,
                    background: isDragging ? 'var(--bg-surface-2)' : 'transparent',
                    borderBottom: '1px solid var(--border-light)'
                  }}
                >
                  <span style={{ cursor: 'grab', color: 'var(--text-muted)', userSelect: 'none' }}>⋮⋮</span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggle(col)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span className="col-name" style={{ flex: 1 }}>{col}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Close on outside click */}
      {open && <div className="col-backdrop" onClick={() => setOpen(false)} />}
    </div>
  );
}
