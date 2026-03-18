// src/App.jsx — Vertical nav + full-width content, filters in toolbar
import { useState, useEffect } from 'react';
import ReportTable    from './components/ReportTable';
import ChartRenderer  from './components/ChartRenderer';
import DateComparison from './components/DateComparison';
import { api }        from './services/api';
import './App.css';

const NAV_ITEMS = [
  { id: 'reports', label: 'Reports',  icon: '⊞' },
  { id: 'charts',  label: 'Charts',   icon: '⬡' },
];

export default function App() {
  const [solrStatus,   setSolrStatus]   = useState('checking');
  const [activeTab,    setActiveTab]    = useState('reports');
  const [allFields,    setAllFields]    = useState([]);
  const [facetField1,  setFacetField1]  = useState('');
  const [facetField2,  setFacetField2]  = useState('');
  const [dateFilters,  setDateFilters]  = useState(null);
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    api.healthCheck().then(() => setSolrStatus('ok')).catch(() => setSolrStatus('error'));
    api.getFields().then(d => {
      const fields = d.fields ?? [];
      setAllFields(fields);
      const str = fields.filter(f => f.endsWith('_s'));
      if (str[0]) setFacetField1(str[0]);
      if (str[1]) setFacetField2(str[1]);
    }).catch(() => {});
  }, []);

  const activeDateParams = dateFilters
    ? { date_field: dateFilters.date_field, start_date: dateFilters.start_date, end_date: dateFilters.end_date }
    : {};

  return (
    <div className="app-shell">

      {/* ── Vertical Nav ────────────────────────────────────────── */}
      <nav className={`vnav ${navCollapsed ? 'vnav--collapsed' : ''}`}>

        <div className="vnav-brand">
          <div className="vnav-logo">◈</div>
          {!navCollapsed && <span className="vnav-brand-name">ReportSystem</span>}
        </div>

        <div className="vnav-items">
          {NAV_ITEMS.map(item => (
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

      {/* ── Body ────────────────────────────────────────────────── */}
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

          {/* Date filter lives in topbar for reports tab */}
          {activeTab === 'reports' && (
            <div className="topbar-date">
              <DateComparison allFields={allFields} onDateChange={setDateFilters} compact />
            </div>
          )}

          <div className="topbar-right">
            <span className="topbar-meta">
              {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })}
            </span>
          </div>
        </header>

        <main className="app-main">

          {/* Reports */}
          {activeTab === 'reports' && (
            <ReportTable extraParams={activeDateParams} />
          )}

          {/* Charts */}
          {activeTab === 'charts' && (
            <div className="charts-page">
              <div className="charts-controls">
                <h2 className="charts-heading">⬡ Chart Explorer</h2>
                <div className="charts-field-pickers">
                  <div className="fp-group">
                    <label className="fp-label">Chart 1 — Field</label>
                    <select className="fp-select" value={facetField1} onChange={e => setFacetField1(e.target.value)}>
                      <option value="">— select —</option>
                      {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="fp-group">
                    <label className="fp-label">Chart 2 — Field</label>
                    <select className="fp-select" value={facetField2} onChange={e => setFacetField2(e.target.value)}>
                      <option value="">— select —</option>
                      {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="fp-group" style={{ flex: 2 }}>
                    <label className="fp-label">Date Filter</label>
                    <DateComparison allFields={allFields} onDateChange={setDateFilters} compact />
                  </div>
                </div>
              </div>

              <div className="charts-grid">
                {facetField1 && <ChartRenderer facetField={facetField1} filters={activeDateParams} />}
                {facetField2 && <ChartRenderer facetField={facetField2} filters={activeDateParams} />}
                {!facetField1 && !facetField2 && (
                  <div className="chart-card chart-card--placeholder" style={{ gridColumn: '1/-1' }}>
                    <span className="chart-placeholder-icon">⬡</span>
                    <p>Select fields above to render charts</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          Kafka · Solr · PHP MVC · React — ReportSystem v2
        </footer>
      </div>
    </div>
  );
}