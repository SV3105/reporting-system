// src/components/ReportTable.jsx
// All filters are displayed as a horizontal bar ABOVE the table

import { useState, useMemo, useRef, useCallback } from 'react';
import { useReports }  from '../hooks/useReports';
import ColumnSelector  from './ColumnSelector';
import Pagination      from './Pagination';
import SavedViews      from './SavedViews';

const STORAGE_KEY   = 'report_column_widths';
const DEFAULT_WIDTH = 160;
const MIN_WIDTH     = 60;
const MAX_WIDTH     = 600;

function loadWidths() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveWidths(w) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)); } catch {}
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

// ── Horizontal Filter Bar (renders above the table always) ─────
function HorizontalFilters({ columns, filters, onChange }) {
  const [column, setColumn] = useState(filters.column || '');
  const [search, setSearch] = useState(filters.search || '');
  const [min,    setMin]    = useState(filters.min    || '');
  const [max,    setMax]    = useState(filters.max    || '');

  const apply = () => {
    const f = {};
    if (column) {
      if (search) { f.column = column; f.search = search; }
      if (min || max) { f.column = column; if (min) f.min = min; if (max) f.max = max; }
    }
    onChange(f);
  };

  const reset = () => {
    setColumn(''); setSearch(''); setMin(''); setMax('');
    onChange({});
  };

  const hasFilter = Object.keys(filters).length > 0;

  return (
    <div className="hfilter-bar">
      {/* Row of controls */}
      <div className="hfilter-row">
        {/* Column picker */}
        <div className="fp-group hfilter-group">
          <label className="fp-label">Column</label>
          <select
            className="fp-select fp-select--sm"
            value={column}
            onChange={e => { setColumn(e.target.value); setSearch(''); setMin(''); setMax(''); }}
          >
            <option value="">— all —</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Search */}
        <div className="fp-group hfilter-group">
          <label className="fp-label">Search</label>
          <input
            className="fp-input fp-input--sm"
            type="text"
            placeholder="keyword…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={!column}
            onKeyDown={e => e.key === 'Enter' && apply()}
          />
        </div>

        {/* Min */}
        <div className="fp-group hfilter-group hfilter-group--narrow">
          <label className="fp-label">Min</label>
          <input
            className="fp-input fp-input--sm"
            type="number"
            placeholder="0"
            value={min}
            onChange={e => setMin(e.target.value)}
            disabled={!column}
          />
        </div>

        {/* Max */}
        <div className="fp-group hfilter-group hfilter-group--narrow">
          <label className="fp-label">Max</label>
          <input
            className="fp-input fp-input--sm"
            type="number"
            placeholder="∞"
            value={max}
            onChange={e => setMax(e.target.value)}
            disabled={!column}
          />
        </div>

        {/* Actions */}
        <div className="hfilter-actions">
          <button className="btn btn-primary btn-sm" onClick={apply} disabled={!column}>
            Apply
          </button>
          {hasFilter && (
            <button className="btn btn-ghost btn-sm" onClick={reset}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {hasFilter && (
        <div className="hfilter-active">
          <span className="hfilter-active-label">Filtered by:</span>
          {filters.column && <span className="ifp-tag">{filters.column}</span>}
          {filters.search && <span className="ifp-tag">"{filters.search}"</span>}
          {filters.min    && <span className="ifp-tag">min {filters.min}</span>}
          {filters.max    && <span className="ifp-tag">max {filters.max}</span>}
        </div>
      )}
    </div>
  );
}

// ── Main ReportTable ──────────────────────────────────────────
export default function ReportTable({ externalFilters, extraParams = {} } = {}) {
  const [filters,        setFilters]        = useState(externalFilters ?? {});
  const [sort,           setSort]           = useState({ field: '', dir: 'asc' });
  const [visibleColumns, setVisibleColumns] = useState(null);
  const [columnWidths,   setColumnWidths]   = useState(loadWidths);
  const [showSavedViews, setShowSavedViews] = useState(false);

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
    if (view.filters && Object.keys(view.filters).length) setFilters(view.filters);
    if (view.columns?.length) setVisibleColumns(view.columns);
    if (view.sorting?.field)  setSort({ field: view.sorting.field, dir: view.sorting.dir || 'asc' });
    setPage(1);
  };

  const hasActive = Object.keys(activeFilters).filter(k => k !== 'sort').length > 0;

  return (
    <div>
      {/* ── Horizontal Filter Bar ──────────────────────────────── */}
      <HorizontalFilters
        columns={allColumns}
        filters={filters}
        onChange={(f) => { setFilters(f); setPage(1); }}
      />

      {/* ── Table Card ─────────────────────────────────────────── */}
      <div className="report-table-container">

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-left">
            <h2 className="table-title">Reports</h2>
            {total > 0 && <span className="total-badge">{total.toLocaleString()} records</span>}
            {hasActive  && <span className="filtered-badge">⊟ Filtered</span>}
          </div>

          <div className="toolbar-right">
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
                className={`btn btn-outline ${showSavedViews ? 'btn-outline--active' : ''}`}
                onClick={() => setShowSavedViews(s => !s)}
              >
                ⊕ Views
              </button>
              {showSavedViews && (
                <div className="sv-dropdown">
                  <SavedViews
                    currentFilters={filters}
                    currentColumns={visibleColumns ?? allColumns}
                    currentSorting={sort}
                    onLoadView={(v) => { handleLoadView(v); setShowSavedViews(false); }}
                  />
                </div>
              )}
              {showSavedViews && <div className="col-backdrop" onClick={() => setShowSavedViews(false)} />}
            </div>

            {/* Reset widths */}
            {Object.keys(columnWidths).length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setColumnWidths({}); saveWidths({}); }}>
                ⊟ Widths
              </button>
            )}

            <button className="btn btn-outline" onClick={refetch} disabled={loading}>
              {loading ? '⟳' : '↻'} Refresh
            </button>
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
          <div className="table-scroll">
            <table className="rt-table">
              <thead>
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
                {records.map((row, i) => (
                  <tr key={row.id ?? i} className="rt-row">
                    {columns.map(col => (
                      <td key={col} className="rt-td" style={{ maxWidth: columnWidths[col] ?? DEFAULT_WIDTH }}>
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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