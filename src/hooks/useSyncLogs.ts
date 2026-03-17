import { useState, useEffect, useCallback } from 'react';
import type { SyncLogFilters, SyncLogPage } from '../types/trello';
import { getSyncLogs } from '../services/trelloService';

const DEFAULT_PAGE_SIZE = 20;

export function useSyncLogs(initialFilters: SyncLogFilters = {}) {
  const [filters, setFilters] = useState<SyncLogFilters>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...initialFilters,
  });
  const [data, setData] = useState<SyncLogPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (f: SyncLogFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSyncLogs(f);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดล็อกล้มเหลว');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(filters); }, [filters, fetch]);

  const updateFilters = useCallback((updates: Partial<SyncLogFilters>) => {
    setFilters(prev => ({ ...prev, ...updates, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => fetch(filters), [filters, fetch]);

  return { data, loading, error, filters, updateFilters, setPage, refresh };
}
