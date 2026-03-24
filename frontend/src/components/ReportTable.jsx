// src/components/ReportTable.jsx
// All filters are displayed as a horizontal bar ABOVE the table

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useReports }  from '../hooks/useReports';
import { useWebSockets } from '../hooks/useWebSockets';
import ColumnSelector  from './ColumnSelector';
import Pagination      from './Pagination';
import SavedViews      from './SavedViews';
import { api }         from '../services/api';
import { useDebounce } from '../hooks/useDebounce';

const STORAGE_KEY       = 'report_column_widths';
const VISIBLE_COLS_KEY  = 'report_visible_columns';
const DEFAULT_WIDTH     = 160;
const MIN_WIDTH         = 60;
const MAX_WIDTH         = 600;
const BASE_URL          = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function loadWidths() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveWidths(w) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)); } catch {}
}

function loadVisibleCols() {
  try { return JSON.parse(localStorage.getItem(VISIBLE_COLS_KEY)) || null; }
  catch { return null; }
}
function saveVisibleCols(cols) {
  try { localStorage.setItem(VISIBLE_COLS_KEY, JSON.stringify(cols)); } catch {}
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return <span className="cell-empty">—</span>;
  if (typeof value === 'boolean') return <span className={`cell-badge cell-badge--${value ? 'green' : 'red'}`}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return value.toLocaleString();
  const str = String(value);
  if (str.startsWith('http')) return <a href={str} target="_blank" rel="noopener noreferrer" className="cell-link" onClick={e => e.stopPropagation()}>↗ Link</a>;
  return str;
}

function fieldLabel(key) {
  return key.replace(/_[sifbdt]$/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Resizable TH ──────────────────────────────────────────────
function ResizableHeader({ col, width, onSort, sortField, sortDir, onResize }) {
  const isActive = sortField === col;
  const startX   = useRef(0);
  const startW   = useRef(0);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = width;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      if (!dragging.current) return;
      const newW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + e.clientX - startX.current));
      onResize(col, newW);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [col, width, onResize]);

  return (
    <th className={`rt-th ${isActive ? 'rt-th--active' : ''}`}
        style={{ width, minWidth: MIN_WIDTH }}
        onClick={() => onSort(col)} title={col}>
      <span className="rt-th-inner">
        <span className="rt-th-label">{fieldLabel(col)}</span>
        <span className="rt-sort-icon">
          {isActive ? <span className="rt-sort-active">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    : <span className="rt-sort-neutral">↕</span>}
        </span>
      </span>
      <span className="rt-resize-handle" onMouseDown={handleMouseDown} onClick={e => e.stopPropagation()} />
    </th>
  );
}

// ── Custom Autocomplete Input for String Filters ──────────────
export function AutocompleteInput({ value, onChange, onApply, options, loading, error, onFocus }) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!options) return [];
    if (!value) return options.slice(0, 50);
    const lower = value.toLowerCase();
    return options.filter(o => String(o).toLowerCase().includes(lower)).slice(0, 50);
  }, [options, value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && focusedIndex >= 0 && filtered[focusedIndex]) {
        onChange(filtered[focusedIndex]);
        setOpen(false);
      } else {
        onApply();
      }
    } else if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setFocusedIndex(i => i < filtered.length - 1 ? i + 1 : i);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setFocusedIndex(i => i > 0 ? i - 1 : 0);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        className="fp-input fp-input--sm"
        type="text"
        placeholder="search (or select from list)…"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setFocusedIndex(-1); }}
        onFocus={() => { setOpen(true); setFocusedIndex(-1); onFocus?.(); }}
        onKeyDown={handleKeyDown}
      />
      {open && (loading || error || filtered.length > 0) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--surface, #fff)', border: '1px solid var(--border-light, #30363d)',
          borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 100,
          maxHeight: 250, overflowY: 'auto'
        }}>
          {loading && (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              <span className="rt-spinner" style={{ marginRight: 8 }}>⟳</span> Loading options…
            </div>
          )}
          {error && (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--danger)', fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}
          {!loading && !error && filtered.map((opt, i) => (
            <div
              key={opt}
              style={{
                padding: '10px 14px', fontSize: 13, cursor: 'pointer',
                background: focusedIndex === i ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: focusedIndex === i ? 'var(--primary)' : 'var(--text-primary)',
                transition: 'background 0.1s ease',
                borderLeft: focusedIndex === i ? '3px solid var(--primary)' : '3px solid transparent'
              }}
              onMouseEnter={() => setFocusedIndex(i)}
              onMouseDown={(e) => { 
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
          {!loading && !error && filtered.length === 0 && value && (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Horizontal Filter Bar (renders above the table always) ─────
export function HorizontalFilters({ columns, filters, onChange, onReset }) {
  const [facetsCache, setFacetsCache] = useState({});
  const [rows, setRows] = useState(() => {
    const initial = [];
    if (filters.column) {
      initial.push({ id: 1, column: filters.column, search: filters.search || '', min: filters.min || '', max: filters.max || '', logic: 'AND' });
    }
    Object.keys(filters).forEach((k, i) => {
      if (k.startsWith('filter_')) {
        const col = k.replace('filter_', '');
        const val = filters[k];
        const row = { id: 100 + i, column: col, search: '', min: '', max: '', logic: 'AND' };
        if (typeof val === 'string' && val.includes(',')) {
          const parts = val.split(',');
          row.min = parts[0] === '*' ? '' : parts[0];
          row.max = parts[1] === '*' ? '' : parts[1];
        } else if (typeof val === 'object' && val.min !== undefined) {
          row.min = val.min === '*' ? '' : val.min;
          row.max = val.max === '*' ? '' : val.max;
        } else {
          let s = typeof val === 'string' ? val : (Array.isArray(val) ? val.join('|') : String(val));
          if (s.startsWith('*') && s.endsWith('*')) s = s.slice(1, -1);
          row.search = s;
        }
        initial.push(row);
      }
    });

    if (filters.filter_logic) {
      try {
        const parsed = JSON.parse(filters.filter_logic);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch(e) {}
    }

    if (initial.length === 0) initial.push({ id: Date.now(), column: '', search: '', min: '', max: '', logic: 'AND' });
    return initial;
  });

  const loadFacets = async (col) => {
    if (!col || (!col.endsWith('_s') && !col.endsWith('_t'))) return;
    
    const current = facetsCache[col];
    if (current?.data || current?.loading) return;

    setFacetsCache(prev => ({ ...prev, [col]: { ...prev[col], loading: true, error: null } }));

    try {
      const res = await api.getFacets([col]);
      setFacetsCache(prev => ({ 
        ...prev, 
        [col]: { data: Object.keys(res.facets?.[col] || {}), loading: false, error: null } 
      }));
    } catch (err) {
      console.error("Failed to load facets for", col, err);
      setFacetsCache(prev => ({ 
        ...prev, 
        [col]: { data: null, loading: false, error: err.message || "Failed to load options" } 
      }));
    }
  };

  // Auto-filtering removed; user must manually click Apply.

  const addRow = (logic = 'AND') => setRows(prev => [...prev, { id: Date.now(), column: '', search: '', min: '', max: '', logic }]);
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id, fields) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r));

  const apply = () => {
    const valid = rows.filter(r => r.column && (r.search || r.min || r.max));
    if (valid.length === 0) {
      onChange({});
      return;
    }
    // Send as structured logic
    onChange({ filter_logic: JSON.stringify(valid) });
  };

  const reset = () => {
    setRows([{ id: Date.now(), column: '', search: '', min: '', max: '', logic: 'AND' }]);
    onChange({});
    onReset?.();
  };

  const activeKeys = Object.keys(filters).filter(k => k === 'column' || k === 'search' || k === 'min' || k === 'max' || k.startsWith('filter_') || k === 'filter_logic');
  const hasFilter = activeKeys.length > 0;

  return (
    <div className="hfilter-bar">
      <div className="hfilter-stack" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rows.map((row, i) => {
          const colType = row.column ? row.column.split('_').pop() : '';
          const isBool = colType === 'b';
          const isNumOrDate = colType === 'f' || colType === 'i' || colType === 'dt' || colType === 'date';
          
          return (
            <div key={row.id} className="hfilter-row" style={{ alignItems: 'center' }}>
              <div style={{ width: 60 }}>
                {i === 0 ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5 }}>WHERE</span>
                ) : (
                  <button 
                    className="btn btn-outline btn-sm" 
                    style={{ fontSize: 10, padding: '2px 6px', height: 22, minWidth: 42, borderColor: row.logic === 'OR' ? 'var(--warning)' : 'var(--primary-mid)' }}
                    onClick={() => updateRow(row.id, { logic: row.logic === 'AND' ? 'OR' : 'AND' })}
                  >
                    {row.logic}
                  </button>
                )}
              </div>

              {/* Column picker */}
              <div className="fp-group hfilter-group">
                <select
                  className="fp-select fp-select--sm"
                  value={row.column}
                  onChange={e => {
                    const newCol = e.target.value;
                    updateRow(row.id, { column: newCol, search: '', min: '', max: '' });
                    loadFacets(newCol);
                  }}
                >
                  <option value="">— select column —</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Smart Inputs based on Type */}
              {(() => {
                if (!row.column) {
                  return <div className="fp-group hfilter-group"><input className="fp-input fp-input--sm" disabled placeholder="select column..." /></div>;
                }

                if (isBool) {
                  return (
                    <div className="fp-group hfilter-group">
                      <select 
                        className="fp-select fp-select--sm" 
                        value={row.search} 
                        onChange={e => { updateRow(row.id, { search: e.target.value }); }}
                      >
                        <option value="">— any —</option>
                        <option value="true">True / Yes</option>
                        <option value="false">False / No</option>
                      </select>
                    </div>
                  );
                }

                if (isNumOrDate) {
                  const inputType = (colType === 'dt' || colType === 'date') ? 'date' : 'number';
                  return (
                    <>
                      <div className="fp-group hfilter-group hfilter-group--narrow">
                        <input
                          className="fp-input fp-input--sm"
                          type={inputType}
                          placeholder="Min"
                          value={row.min}
                          onChange={e => updateRow(row.id, { min: e.target.value, search: '' })}
                          onKeyDown={e => e.key === 'Enter' && apply()}
                        />
                      </div>
                      <div className="fp-group hfilter-group hfilter-group--narrow">
                        <input
                          className="fp-input fp-input--sm"
                          type={inputType}
                          placeholder="Max"
                          value={row.max}
                          onChange={e => updateRow(row.id, { max: e.target.value, search: '' })}
                          onKeyDown={e => e.key === 'Enter' && apply()}
                        />
                      </div>
                    </>
                  );
                }

                // Default String with Autocomplete
                return (
                  <div className="fp-group hfilter-group" style={{ flex: 1 }}>
                    <AutocompleteInput 
                      value={row.search}
                      onChange={val => updateRow(row.id, { search: val, min: '', max: '' })}
                      onApply={apply}
                      options={facetsCache[row.column]?.data || []}
                      loading={facetsCache[row.column]?.loading}
                      error={facetsCache[row.column]?.error}
                      onFocus={() => loadFacets(row.column)}
                    />
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="hfilter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                {rows.length > 1 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => removeRow(row.id)} title="Remove row">✕</button>
                )}
                {i === rows.length - 1 && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => addRow('AND')} title="Add AND condition">＋ AND</button>
                    <button className="btn btn-outline btn-sm" onClick={() => addRow('OR')} title="Add OR condition" style={{ borderColor: 'var(--warning)', color: 'var(--warning)', marginLeft: 6 }}>＋ OR</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hfilter-submit" style={{ marginTop: 12, display: 'flex', gap: 10, paddingLeft: 60 }}>
        <button className="btn btn-primary btn-sm" onClick={apply}>Apply Filters</button>
        {hasFilter && <button className="btn btn-ghost btn-sm" onClick={reset}>✕ Clear All</button>}
      </div>

      {hasFilter && (
        <div className="hfilter-active" style={{ paddingLeft: 60, marginTop: 12 }}>
          <span className="hfilter-active-label">Active:</span>
          {Object.entries(filters).map(([k, v]) => {
            if (k === 'sort' || k === 'page' || k === 'limit') return null;
            if (k === 'filter_logic') {
               try {
                 const parsed = JSON.parse(v);
                 return parsed.map((r, idx) => (
                   <span key={idx} className="ifp-tag">
                     {idx > 0 && <strong style={{ color: 'var(--text-muted)', marginRight: 4 }}>{r.logic}</strong>}
                     {r.column}: {r.search || `${r.min||'*'} → ${r.max||'*'}`}
                   </span>
                 ));
               } catch(e) { return null; }
            }
            if (k === 'column' || k === 'search' || k === 'min' || k === 'max') {
              if (k !== 'column') return null; 
              return <span key={k} className="ifp-tag">{filters.column}: {filters.search || `${filters.min||'*'} → ${filters.max||'*'}`}</span>;
            }
            const col = k.replace('filter_', '');
            let label = String(v);
            if (typeof v === 'object' && v !== null) {
              label = `${v.min || '*'} → ${v.max || '*'}`;
            } else if (label.startsWith('*') && label.endsWith('*')) {
              label = label.slice(1, -1);
            }
            return <span key={k} className="ifp-tag">{col}: {label}</span>;
          })}
        </div>
      )}
    </div>
  );
}

// ── Virtualized Table Rendering ─────────────────────────────
function VirtualTable({
  records, columns, columnWidths, DEFAULT_WIDTH, 
  handleSort, sort, handleResize 
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 40; // Approx based on CSS padding/line-height
  const buffer = 5;

  const onScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Sync scroll top if records change (optional, but good for resets)
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [records]);

  const containerHeight = 560; // From CSS max-height
  
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endIndex   = Math.min(records.length, Math.floor((scrollTop + containerHeight) / rowHeight) + buffer);

  const visibleRecords = records.slice(startIndex, endIndex);
  
  const topPadding    = startIndex * rowHeight;
  const bottomPadding = (records.length - endIndex) * rowHeight;

  return (
    <div className="table-scroll" ref={containerRef} onScroll={onScroll}>
      <table className="rt-table">
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr>
            {columns.map(col => (
              <ResizableHeader key={col} col={col}
                width={columnWidths[col] ?? DEFAULT_WIDTH}
                onSort={handleSort} sortField={sort.field} sortDir={sort.dir}
                onResize={handleResize} />
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Top spacer */}
          {topPadding > 0 && <tr className="rt-row-spacer" style={{ height: topPadding }}><td colSpan={columns.length} /></tr>}
          
          {visibleRecords.map((row, i) => {
            const actualIndex = startIndex + i;
            return (
              <tr key={row.id ?? actualIndex} className="rt-row">
                {columns.map(col => (
                  <td key={col} className="rt-td" style={{ maxWidth: columnWidths[col] ?? DEFAULT_WIDTH }}>
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Bottom spacer */}
          {bottomPadding > 0 && <tr className="rt-row-spacer" style={{ height: bottomPadding }}><td colSpan={columns.length} /></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ReportTable ──────────────────────────────────────────
export default function ReportTable({ externalFilters, extraParams = {}, onFiltersChange, onDateChange, filterControl, resetControl } = {}) {
  const [filters,        setFilters]        = useState(externalFilters ?? {});
  const [sort,           setSort]           = useState({ field: '', dir: 'asc' });
  const [visibleColumns, setVisibleColumnsState] = useState(loadVisibleCols);
  const [columnWidths,   setColumnWidths]   = useState(loadWidths);
  const [showSavedViews, setShowSavedViews] = useState(false);
  // showFilters lifted to App.jsx

  const { connected: wsConnected } = useWebSockets((data) => {
    if (data.type === 'solr_updated') {
      console.log('🔄 Real-time update received, refetching...');
      refetch();
    }
  });

  const setVisibleColumns = useCallback((cols) => {
    setVisibleColumnsState(cols);
    saveVisibleCols(cols);
  }, []);

  const activeFilters = useMemo(() => ({
    ...filters, ...(externalFilters ?? {}), ...extraParams,
  }), [filters, externalFilters, extraParams]);

  const { records, total, totalPages, page, setPage, limit, setLimit, loading, error, refetch } =
    useReports({ ...activeFilters, sort: sort.field ? `${sort.field} ${sort.dir}` : '' });

  const allColumns = useMemo(() => records.length ? Object.keys(records[0]) : [], [records]);

  const columns = useMemo(() => {
    if (!allColumns.length) return [];
    if (!visibleColumns)    return allColumns;
    return visibleColumns.filter(c => allColumns.includes(c));
  }, [allColumns, visibleColumns]);

  const handleResize = useCallback((col, w) => {
    setColumnWidths(prev => { const u = { ...prev, [col]: w }; saveWidths(u); return u; });
  }, []);

  const handleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
    setPage(1);
  };

  const handleLoadView = (view) => {
    if (view.filters) {
      const dateParams = {};
      const rest = {};
      Object.entries(view.filters).forEach(([k, v]) => {
        if (['date_field', 'start_date', 'end_date', 'relative_range'].includes(k)) {
          dateParams[k] = v;
        } else {
          rest[k] = v;
        }
      });

      if (Object.keys(dateParams).length > 0) {
        onDateChange?.(dateParams);
      } else {
        onDateChange?.(null);
      }

      setFilters(rest);
      onFiltersChange?.(rest);
    }

    if (view.columns?.length) setVisibleColumns(view.columns);
    if (view.widths && !Array.isArray(view.widths)) setColumnWidths(view.widths);
    if (view.sorting?.field)  setSort({ field: view.sorting.field, dir: view.sorting.dir || 'asc' });
    setPage(1);
  };

  const hasActive = Object.keys(activeFilters).filter(k => k !== 'sort').length > 0;
  // activeFilterCount moved to App.jsx

  // ── Sync with Backend ──────────────────────────────────────
  // 1. Initial Load
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await api.getUserConfig('sales_report');
        if (res.success && res.config?.column_config) {
          const cfg = res.config.column_config;
          // Safety: convert empty array back to object if PHP serialized it incorrectly
          const w = (cfg.widths && !Array.isArray(cfg.widths)) ? cfg.widths : {};
          setColumnWidths(w);
          // Set visibility even if it's null (null = all columns)
          setVisibleColumnsState(cfg.visible);
        }
      } catch (e) { console.error('Failed to load user config:', e); }
    }
    fetchConfig();
  }, []);

  // 2. Debounced Save
  useEffect(() => {
    // Only save if we have actual data to save
    if (Object.keys(columnWidths).length === 0 && !visibleColumns) return;

    const timer = setTimeout(() => {
      api.saveUserConfig('sales_report', {
        widths: columnWidths,
        visible: visibleColumns
      }).catch(e => console.error('Failed to save user config:', e));
    }, 2000); // 2s debounce

    return () => clearTimeout(timer);
  }, [columnWidths, visibleColumns]);

  const handleExport = () => {
    const params = new URLSearchParams();
    // Replicate useReports parameter logic for active filters/sort
    Object.entries(activeFilters).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      if (typeof v === 'object' && v.min !== undefined) {
        params.append(k, `${v.min},${v.max}`);
      } else if (Array.isArray(v)) {
        params.append(k, v.join('|'));
      } else {
        params.append(k, v);
      }
    });

    const sortStr = sort.field ? `${sort.field} ${sort.dir}` : '';
    if (sortStr) params.append('sort', sortStr);

    window.open(`${BASE_URL}/api/reports/export?${params.toString()}`, '_blank');
  };

  const handleResetAll = () => {
    setFilters({});
    setColumnWidths({});
    saveWidths({});
    // Reset to all columns explicitly
    const targetCols = allColumns.length > 0 ? allColumns : null;
    setVisibleColumns(targetCols);
    setPage(1);
    // Explicitly notify backend about the reset
    api.saveUserConfig('sales_report', { widths: {}, visible: targetCols }).catch(() => {});
  };

  return (
    <div className="report-table-root">
      {/* ── Table Card ─────────────────────────────────────────── */}
      <div className="report-table-container">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {total > 0 && <span className="total-badge">{total.toLocaleString()} records</span>}
            {hasActive  && (
              <span className="filtered-badge">
                ⊟ Filtered
              </span>
            )}
            <div 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '5px', 
                fontSize: '11px', fontWeight: 700, 
                color: wsConnected ? 'var(--success)' : 'var(--text-muted)',
                marginLeft: '8px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: wsConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${wsConnected ? 'rgba(34, 197, 94, 0.2)' : 'var(--border-light)'}`
              }}
              title={wsConnected ? "Connected to live updates" : "Reconnecting to live updates..."}
            >
              <span style={{ 
                width: 6, height: 6, borderRadius: '50%', 
                backgroundColor: wsConnected ? '#22c55e' : '#94a3b8',
                boxShadow: wsConnected ? '0 0 8px #22c55e' : 'none'
              }} />
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>

          <div className="toolbar-right">
            {/* Refresh button - Leftmost active data action */}
            <button className="btn btn-outline" onClick={refetch} disabled={loading}>
              {loading ? '⟳' : '↻'} Refresh
            </button>

            {/* Filter Dropdown */}
            {filterControl}

            {/* Column selector */}
            {allColumns.length > 0 && (
              <ColumnSelector
                allColumns={allColumns}
                visibleColumns={visibleColumns ?? allColumns}
                onChange={setVisibleColumns}
              />
            )}

            {/* Saved views */}
            <div style={{ position: 'relative' }}>
              <button
                className={`btn btn-outline btn-icon ${showSavedViews ? 'btn-outline--active' : ''}`}
                onClick={() => setShowSavedViews(s => !s)}
                title="Saved Views"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
              {showSavedViews && (
                <div className="sv-dropdown">
                   <SavedViews
                    currentFilters={activeFilters}
                    currentColumns={visibleColumns ?? allColumns}
                    currentWidths={columnWidths}
                    currentSorting={sort}
                    onLoadView={(v) => { handleLoadView(v); setShowSavedViews(false); }}
                  />
                </div>
              )}
              {showSavedViews && <div className="col-backdrop" onClick={() => setShowSavedViews(false)} />}
            </div>

            {/* Export button - Right side safe action */}
            <button className="btn btn-outline btn-icon" onClick={handleExport} title="Export current view as CSV">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>

            {/* Reset widths */}
            {Object.keys(columnWidths).length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setColumnWidths({}); saveWidths({}); }}>
                ⊟ Widths
              </button>
            )}

            {/* Reset All button - Rightmost destructive action */}
            {resetControl}
          </div>
        </div>

        {/* Resize hint */}
        {!loading && records.length > 0 && (
          <div className="rt-hint">Drag column borders to resize · widths saved automatically</div>
        )}

        {/* Error */}
        {error && (
          <div className="state-error">
            <span className="state-icon">⚠</span>
            <div><strong>Failed to load</strong><p>{error}</p></div>
            <button className="btn btn-outline btn-sm" onClick={refetch}>Retry</button>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="skeleton-wrapper">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && records.length === 0 && (
          <div className="state-empty">
            <span className="state-icon">⬡</span>
            <strong>No records found</strong>
            <p>Adjust your filters or index CSV data via the Kafka producer.</p>
          </div>
        )}

        {/* Table */}
        {!loading && records.length > 0 && (
          <VirtualTable 
            records={records} 
            columns={columns} 
            columnWidths={columnWidths} 
            DEFAULT_WIDTH={DEFAULT_WIDTH}
            handleSort={handleSort}
            sort={sort}
            handleResize={handleResize}
          />
        )}

        {/* Pagination */}
        {!loading && records.length > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total}
            limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      </div>
    </div>
  );
}