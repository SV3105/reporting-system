// src/hooks/useReports.js
// Custom hook — keeps all data-fetching logic out of components

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export function useReports(filters = {}) {
  const [records,     setRecords]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(0);
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(20);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const fetchReports = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit, ...filters };
      // Strip empty values
      Object.entries(params).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) {
          delete params[k];
        }
      });

      const data = await api.getReports(params, { signal });
      setRecords(data.records    ?? []);
      setTotal(data.total        ?? 0);
      setTotalPages(data.total_pages ?? 0);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setRecords([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, limit, JSON.stringify(filters)]); // eslint-disable-line

  useEffect(() => {
    const controller = new AbortController();
    fetchReports(controller.signal);
    return () => controller.abort();
  }, [fetchReports]);

  return {
    records, total, totalPages,
    page, setPage,
    limit, setLimit,
    loading, error,
    refetch: fetchReports,
  };
}
