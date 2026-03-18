// src/components/SavedViews.jsx
// Props:
//   currentFilters  object   Active filters to save
//   currentColumns  array    Currently visible columns
//   currentSorting  object   { field, dir }
//   onLoadView      fn(view) Called when user loads a saved view

import { useState, useEffect, useRef } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── API helpers ───────────────────────────────────────────────
async function fetchViews() {
  const res  = await fetch(`${BASE_URL}/api/views`, { headers: { Accept: 'application/json' } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to load views');
  return json.views ?? [];
}

async function saveView(payload) {
  const res  = await fetch(`${BASE_URL}/api/views`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body:    JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.errors?.[0] || json.error || 'Failed to save view');
  return json.view;
}

async function deleteView(id) {
  const res  = await fetch(`${BASE_URL}/api/views/${id}`, {
    method:  'DELETE',
    headers: { Accept: 'application/json' },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to delete view');
}

// ── Relative time helper ──────────────────────────────────────
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main Component ────────────────────────────────────────────
export default function SavedViews({
  currentFilters = {},
  currentColumns = [],
  currentWidths  = {},
  currentSorting = {},
  onLoadView,
}) {
  const [views,       setViews]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);
  const [error,       setError]       = useState(null);
  const [saveError,   setSaveError]   = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(null);
  const [viewName,    setViewName]    = useState('');
  const [loadedId,    setLoadedId]    = useState(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const inputRef = useRef(null);

  // ── Load views on mount ───────────────────────────────────
  useEffect(() => {
    loadViews();
  }, []);

  // Focus input when save form opens
  useEffect(() => {
    if (showSaveForm) inputRef.current?.focus();
  }, [showSaveForm]);

  // Clear success message after 3s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const loadViews = async () => {
    setLoading(true);
    setError(null);
    try {
      setViews(await fetchViews());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Save current view ─────────────────────────────────────
  const handleSave = async () => {
    const name = viewName.trim();
    if (!name) { setSaveError('Please enter a name for this view.'); return; }

    setSaving(true);
    setSaveError(null);
    try {
      const view = await saveView({
        name,
        filters: currentFilters,
        columns: currentColumns,
        widths:  currentWidths,
        sorting: currentSorting,
      });
      setViews(prev => [view, ...prev]);
      setViewName('');
      setShowSaveForm(false);
      setSuccessMsg(`"${view.name}" saved!`);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Load a view ───────────────────────────────────────────
  const handleLoad = (view) => {
    setLoadedId(view.id);
    onLoadView?.(view);
    setSuccessMsg(`Loaded "${view.name}"`);
  };

  // ── Delete a view ─────────────────────────────────────────
  const handleDelete = async (e, id, name) => {
    e.stopPropagation(); // don't trigger load
    if (!window.confirm(`Delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteView(id);
      setViews(prev => prev.filter(v => v.id !== id));
      if (loadedId === id) setLoadedId(null);
      setSuccessMsg('View deleted.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const hasCurrentState = Object.keys(currentFilters).length > 0 || currentColumns.length > 0;

  return (
    <div className="saved-views">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="sv-header">
        <span className="sv-title">
          <span className="sv-icon">⊕</span> Saved Views
          {views.length > 0 && <span className="badge">{views.length}</span>}
        </span>
        <div className="sv-header-actions">
          <button className="sv-refresh-btn" onClick={loadViews} title="Refresh">↻</button>
          <button
            className={`btn btn-outline sv-save-btn ${showSaveForm ? 'active' : ''}`}
            onClick={() => { setShowSaveForm(s => !s); setSaveError(null); }}
          >
            {showSaveForm ? '✕ Cancel' : '+ Save View'}
          </button>
        </div>
      </div>

      {/* ── Save Form ─────────────────────────────────────── */}
      {showSaveForm && (
        <div className="sv-save-form">
          <div className="sv-save-preview">
            <span className="sv-preview-item">
              <span className="sv-preview-dot" style={{ background: 'var(--accent)' }} />
              {Object.keys(currentFilters).length} filters
            </span>
            <span className="sv-preview-item">
              <span className="sv-preview-dot" style={{ background: 'var(--blue)' }} />
              {currentColumns.length} columns
            </span>
            {currentSorting?.field && (
              <span className="sv-preview-item">
                <span className="sv-preview-dot" style={{ background: 'var(--green)' }} />
                sorted by {currentSorting.field}
              </span>
            )}
          </div>

          <div className="sv-input-row">
            <input
              ref={inputRef}
              className="fp-input sv-name-input"
              type="text"
              placeholder="View name e.g. High Price Ashley"
              value={viewName}
              onChange={e => { setViewName(e.target.value); setSaveError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              maxLength={100}
            />
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !viewName.trim()}
            >
              {saving ? '⟳' : '⊕ Save'}
            </button>
          </div>

          {saveError && <p className="sv-form-error">⚠ {saveError}</p>}
        </div>
      )}

      {/* ── Success message ────────────────────────────────── */}
      {successMsg && (
        <div className="sv-success">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="sv-error">⚠ {error}</div>
      )}

      {/* ── Loading ───────────────────────────────────────── */}
      {loading && (
        <div className="sv-loading">
          <div className="chart-spinner" style={{ width: 18, height: 18 }} />
          <span>Loading views…</span>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────── */}
      {!loading && views.length === 0 && (
        <div className="sv-empty">
          <span className="sv-empty-icon">⊕</span>
          <p>No saved views yet.</p>
          <p className="sv-empty-hint">Apply filters and click <strong>+ Save View</strong> to save your current report configuration.</p>
        </div>
      )}

      {/* ── Views list ────────────────────────────────────── */}
      {!loading && views.length > 0 && (
        <div className="sv-list">
          {views.map(view => (
            <div
              key={view.id}
              className={`sv-item ${loadedId === view.id ? 'sv-item--active' : ''}`}
              onClick={() => handleLoad(view)}
              title={`Load "${view.name}"`}
            >
              <div className="sv-item-main">
                <span className="sv-item-name">{view.name}</span>
                <span className="sv-item-meta">
                  {timeAgo(view.created_at)}
                </span>
              </div>

              <div className="sv-item-tags">
                {Object.keys(view.filters ?? {}).length > 0 && (
                  <span className="sv-tag sv-tag--filter">
                    {Object.keys(view.filters).length} filter{Object.keys(view.filters).length !== 1 ? 's' : ''}
                  </span>
                )}
                {(view.columns ?? []).length > 0 && (
                  <span className="sv-tag sv-tag--cols">
                    {view.columns.length} col{view.columns.length !== 1 ? 's' : ''}
                  </span>
                )}
                {view.sorting?.field && (
                  <span className="sv-tag sv-tag--sort">
                    ↕ {view.sorting.field?.replace(/_[sifbdt]$/, '')}
                  </span>
                )}
              </div>

              <div className="sv-item-actions">
                {loadedId === view.id && (
                  <span className="sv-active-dot" title="Currently loaded" />
                )}
                <button
                  className="sv-delete-btn"
                  onClick={e => handleDelete(e, view.id, view.name)}
                  disabled={deletingId === view.id}
                  title="Delete view"
                >
                  {deletingId === view.id ? '⟳' : '✕'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}