// src/components/Pagination.jsx

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }) {
  if (totalPages <= 0) return null;

  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of{' '}
        <strong>{total.toLocaleString()}</strong> records
      </div>

      <div className="pagination-controls">
        <button
          className="page-btn"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="First"
        >«</button>

        <button
          className="page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          title="Previous"
        >‹</button>

        {pages[0] > 1 && <span className="page-ellipsis">…</span>}

        {pages.map(p => (
          <button
            key={p}
            className={`page-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >{p}</button>
        ))}

        {pages[pages.length - 1] < totalPages && <span className="page-ellipsis">…</span>}

        <button
          className="page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          title="Next"
        >›</button>

        <button
          className="page-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last"
        >»</button>
      </div>

      <div className="pagination-limit">
        <label>Rows</label>
        <select
          value={limit}
          onChange={e => { onLimitChange(Number(e.target.value)); onPageChange(1); }}
        >
          {[10, 20, 50, 100].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
