// src/App.jsx — Vertical nav + full-width content, filters in toolbar
import { useState, useEffect, useCallback, useMemo } from 'react';
import ReportTable, { HorizontalFilters } from './components/ReportTable';
import ChartRenderer  from './components/ChartRenderer';
import DateComparison from './components/DateComparison';
import Login          from './components/Login';
import UserManagement     from './components/UserManagement';
import AdminReportsPanel  from './components/AdminReportsPanel';
import AdminScheduler     from './components/AdminScheduler';
import { api }        from './services/api';
import './App.css';

const NAV_ITEMS = [
  { 
    id: 'reports', 
    label: 'Reports', 
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="9" y1="21" x2="9" y2="9"/>
      </svg>
    ) 
  },
  { 
    id: 'charts',  
    label: 'Charts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <polyline points="2 17 8.5 10.5 13.5 15.5 22 7"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ) 
  },
  {
    id: 'all-reports',
    label: 'All Reports',
    adminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    )
  },
  {
    id: 'users',
    label: 'Users',
    adminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    id: 'schedules',
    label: 'Schedules',
    adminOnly: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    )
  }
];

export default function App() {
  const [solrStatus,   setSolrStatus]   = useState('checking');
  const [activeTab,    setActiveTab]    = useState('reports');
  const [allFields,    setAllFields]    = useState([]);
  const [facetField1,  setFacetField1]  = useState('');
  const [yAxisFunc1,   setYAxisFunc1]   = useState('count');
  const [yAxisField1,  setYAxisField1]  = useState('');

  const [facetField2,  setFacetField2]  = useState('');
  const [yAxisFunc2,   setYAxisFunc2]   = useState('count');
  const [yAxisField2,  setYAxisField2]  = useState('');

  const [dateFilters,  setDateFilters]  = useState(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [globalExternalFilters, setGlobalExternalFilters] = useState({});
  const [reportFilters, setReportFilters] = useState({});
  const [showFilters,    setShowFilters]    = useState(false);
  const [user,           setUser]           = useState(null);
  const [authChecking,   setAuthChecking]   = useState(true);

  // resetKey forces ReportTable to fully remount (clears all internal filters/sort/columns)
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    // Check initial session
    api.me()
      .then(res => { if (res.success) setUser(res.user); })
      .catch(() => setUser(null))
      .finally(() => setAuthChecking(false));

    api.healthCheck().then(() => setSolrStatus('ok')).catch(() => setSolrStatus('error'));
    api.getFields().then(d => {
      const fields = d.fields ?? [];
      setAllFields(fields);
      const str = fields.filter(f => f.endsWith('_s'));
      if (str[0]) setFacetField1(str[0]);
      if (str[1]) setFacetField2(str[1]);
    }).catch(() => {});
  }, []);

  // ── Global Reset ──────────────────────────────────────────
  const handleResetAll = useCallback(() => {
    setDateFilters(null);          // clear date filter
    setGlobalExternalFilters({});  // clear external drill-down filters
    setReportFilters({});          // clear report-specific filters
    setResetKey(k => k + 1);       // remount ReportTable
  }, []);

  const handleDrilldown = useCallback((field, value) => {
    // Determine if it's a numeric field (_i for int, _f for float)
    const isNum = field.endsWith('_i') || field.endsWith('_f');
    // For numbers, we need an exact match; for strings/text, we use wildcards
    const filterValue = isNum ? value : `*${value}*`;
    
    setGlobalExternalFilters({ [`filter_${field}`]: filterValue }); 
    setResetKey(k => k + 1);
    setActiveTab('reports');
  }, []);

  const numericFields = useMemo(() => allFields.filter(f => 
    f.match(/_[ifdp]$/i) || f.match(/price|cost|qty|amount|count/i)
  ), [allFields]);

  const hasAnyFilter = !!dateFilters || Object.keys(globalExternalFilters).length > 0;

  const activeDateParams = dateFilters
    ? { 
        date_field: dateFilters.date_field, 
        start_date: dateFilters.start_date, 
        end_date: dateFilters.end_date,
        relative_range: dateFilters.relative_range
      }
    : {};

  const fieldFilterCount = Object.keys(reportFilters).filter(k => k !== 'sort' && k !== 'page' && k !== 'limit').length;
  const activeFilterCount = fieldFilterCount + (dateFilters ? 1 : 0);

  const handleLogout = async () => {
    try {
      await api.logout();
      // Clear ALL filter/UI state so the next user starts fresh
      setDateFilters(null);
      setGlobalExternalFilters({});
      setReportFilters({});
      setResetKey(k => k + 1);
      setActiveTab('reports');
      setUser(null);
    } catch (e) {
      console.error('Logout failed', e);
      setUser(null); // force logout even if API call fails
    }
  };

  if (authChecking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#94a3b8' }}>
        <div className="chart-spinner" style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1' }} />
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  return (
    <div className="app-shell">

      {/* ── Vertical Nav ────────────────────────────────────── */}
      <nav className={`vnav ${navCollapsed ? 'vnav--collapsed' : ''}`}>

        <div className="vnav-brand">
          <div className="vnav-logo">◈</div>
          {!navCollapsed && <span className="vnav-brand-name">ReportSystem</span>}
        </div>

        <div className="vnav-items">
          {NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin').map(item => (
            <button key={item.id}
              className={`vnav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={navCollapsed ? item.label : ''}>
              <span className="vnav-item-icon">{item.icon}</span>
              {!navCollapsed && <span className="vnav-item-label">{item.label}</span>}
              {activeTab === item.id && <span className="vnav-active-bar" />}
            </button>
          ))}
        </div>

        <div className="vnav-bottom">
          <div className={`vnav-status ${navCollapsed ? 'vnav-status--collapsed' : ''}`}>
            <span className={`status-dot status-dot--${solrStatus}`} />
            {!navCollapsed && (
              <span className="vnav-status-label">
                {solrStatus === 'checking' && 'Connecting…'}
                {solrStatus === 'ok'       && 'Solr Connected'}
                {solrStatus === 'error'    && 'Unreachable'}
              </span>
            )}
          </div>
          <button className="vnav-collapse-btn" onClick={() => setNavCollapsed(c => !c)}>
            <span className="vnav-collapse-icon">{navCollapsed ? '»' : '«'}</span>
            {!navCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </nav>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="app-body">

        {/* Top bar */}
        <header className="app-topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h1>
            {solrStatus === 'error' && (
              <span className="topbar-alert">⚠ API unreachable</span>
            )}
          </div>

          <div className="topbar-right">
            <div className="user-meta" style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 16 }}>
              <div className="user-avatar" style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(45deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                {user.username[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{user.username}</span>
              <button className="btn btn-icon btn-sm" onClick={handleLogout} title="Sign Out" style={{ color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
            <span className="topbar-meta">
              {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
            </span>
          </div>
        </header>

        <main className="app-main">

          {/* Reports — key prop forces full remount on reset */}
          {activeTab === 'reports' && (
            <ReportTable 
              key={resetKey} 
              externalFilters={{...globalExternalFilters, ...reportFilters}} 
              extraParams={activeDateParams}
              onFiltersChange={setReportFilters}
              onDateChange={setDateFilters}
              showFilterDropdown={showFilters}
              onCloseFilters={() => setShowFilters(false)}
              filterControl={
                <div className="filter-center-wrapper">
                  <button
                    className={`btn btn-outline btn-icon ${showFilters ? 'btn-outline--active' : ''} ${activeFilterCount > 0 ? 'btn-active-highlight' : ''}`}
                    onClick={() => setShowFilters(s => !s)}
                    style={{ position: 'relative' }}
                    title="Filters"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    {activeFilterCount > 0 && <span className="badge-count">{activeFilterCount}</span>}
                  </button>

                  {showFilters && (
                    <div className="filter-dropdown filter-dropdown--unified">
                      <div className="dropdown-header">
                        <span>Filter Center</span>
                        <button className="btn-close" onClick={() => setShowFilters(false)}>✕</button>
                      </div>
                      
                      <div className="dropdown-body">
                        {/* Section 1: Time Range */}
                        <div className="filter-section">
                          <div className="section-title">🕒 Time Range</div>
                          <DateComparison
                            key={resetKey}
                            allFields={allFields}
                            onDateChange={setDateFilters}
                            compact
                          />
                        </div>

                        <div className="section-divider" />

                        {/* Section 2: Field Filters */}
                        <div className="filter-section">
                          <div className="section-title">⊞ Field Filters</div>
                          <HorizontalFilters
                            columns={allFields}
                            filters={reportFilters}
                            onChange={(f) => setReportFilters(f)}
                            onReset={handleResetAll}
                          />
                        </div>
                      </div>

                      <div className="dropdown-footer">
                         <button className="btn btn-primary btn-sm btn-wide" onClick={() => setShowFilters(false)}>Done</button>
                      </div>
                    </div>
                  )}
                  {showFilters && <div className="col-backdrop" style={{ zIndex: 199 }} onClick={() => setShowFilters(false)} />}
                </div>
              }
              resetControl={
                <button
                  className={`btn btn-reset-all ${hasAnyFilter || activeFilterCount > 0 ? 'btn-reset-all--active' : ''}`}
                  onClick={handleResetAll}
                  title="Clear all filters, date range, sorting, and column selection"
                >
                  ↺ Reset All
                </button>
              }
            />
          )}

          {/* Charts */}
          {activeTab === 'charts' && (
            <div className="charts-page">
              <div className="charts-controls">
                <h2 className="charts-heading">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--accent)' }}>
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
                  </svg>
                  Chart Explorer
                </h2>
                <div className="charts-field-pickers">
                  <div className="fp-group">
                    <label className="fp-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16V8"/><path d="M11 16V12"/><path d="M15 16V10"/><path d="M19 16V4"/></svg>
                      Chart 1 — X-Axis
                    </label>
                    <select className="fp-select" value={facetField1} onChange={e => setFacetField1(e.target.value)}>
                      <option value="">— select category —</option>
                      {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    <label className="fp-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M3 7h12"/><path d="M3 12h8"/><path d="M3 17h4"/></svg>
                      Y-Axis Metric
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="fp-select" value={yAxisFunc1} onChange={e => setYAxisFunc1(e.target.value)} style={{ width: 90 }}>
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Avg</option>
                      </select>
                      {yAxisFunc1 !== 'count' && (
                        <select className="fp-select" value={yAxisField1} onChange={e => setYAxisField1(e.target.value)} style={{ flex: 1 }}>
                          <option value="">— field —</option>
                          {numericFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  
                  <div className="fp-group">
                    <label className="fp-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16V8"/><path d="M11 16V12"/><path d="M15 16V10"/><path d="M19 16V4"/></svg>
                      Chart 2 — X-Axis
                    </label>
                    <select className="fp-select" value={facetField2} onChange={e => setFacetField2(e.target.value)}>
                      <option value="">— select category —</option>
                      {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>

                    <label className="fp-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M3 7h12"/><path d="M3 12h8"/><path d="M3 17h4"/></svg>
                      Y-Axis Metric
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="fp-select" value={yAxisFunc2} onChange={e => setYAxisFunc2(e.target.value)} style={{ width: 90 }}>
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Avg</option>
                      </select>
                      {yAxisFunc2 !== 'count' && (
                        <select className="fp-select" value={yAxisField2} onChange={e => setYAxisField2(e.target.value)} style={{ flex: 1 }}>
                          <option value="">— field —</option>
                          {numericFields.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="fp-group" style={{ flex: 2, minWidth: '320px' }}>
                    <label className="fp-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Date Filter
                    </label>
                    <DateComparison allFields={allFields} onDateChange={setDateFilters} compact />
                  </div>
                </div>
              </div>

              <div className="charts-grid">
                {facetField1 && (
                  <ChartRenderer 
                    facetField={facetField1} 
                    yAxisFunc={yAxisFunc1}
                    yAxisField={yAxisField1}
                    filters={activeDateParams} 
                    onDrilldown={handleDrilldown} 
                  />
                )}
                {facetField2 && (
                  <ChartRenderer 
                    facetField={facetField2} 
                    yAxisFunc={yAxisFunc2}
                    yAxisField={yAxisField2}
                    filters={activeDateParams} 
                    onDrilldown={handleDrilldown} 
                  />
                )}
                {!facetField1 && !facetField2 && (
                  <div className="chart-card chart-card--placeholder" style={{ gridColumn: '1/-1' }}>
                    <span className="chart-placeholder-icon">⬡</span>
                    <p>Select fields above to render charts</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'all-reports' && user?.role === 'admin' && (
            <AdminReportsPanel />
          )}

          {activeTab === 'users' && user?.role === 'admin' && (
            <UserManagement />
          )}

          {activeTab === 'schedules' && user?.role === 'admin' && (
            <AdminScheduler />
          )}
        </main>

        <footer className="app-footer">
          Kafka · Solr · PHP MVC · React — ReportSystem v2
        </footer>
      </div>
    </div>
  );
}