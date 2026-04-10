import { useState, useEffect, useCallback } from 'react';

/** Format a Date as YYYY-MM-DD in local time (avoids UTC date shift near midnight) */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface UsePageStateOptions {
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const usePageState = (options: UsePageStateOptions = {}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(options.dateRange || '30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Update dates when date range changes — use local time, not UTC
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - parseInt(dateRange));

    setStartDate(toLocalDateStr(start));
    setEndDate(toLocalDateStr(today));

    if (options.onDateRangeChange) {
      options.onDateRangeChange(dateRange);
    }
  }, [dateRange, options.onDateRangeChange]);

  /**
   * Call with the page's refetch function(s) so refresh actually hits the server.
   * Usage: onRefresh={() => handleRefresh(refetch)}
   *        onRefresh={() => handleRefresh(refetch1, refetch2)}
   */
  const handleRefresh = useCallback(async (...refetches: Array<() => void | Promise<void>>) => {
    setIsRefreshing(true);
    try {
      await Promise.all(refetches.map(fn => fn()));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto refresh — requires components to wire up refetch via handleRefresh
  useEffect(() => {
    if (!options.autoRefresh) return;
    const interval = setInterval(() => handleRefresh(), options.refreshInterval ?? 30_000);
    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval, handleRefresh]);

  const handleDateRangeChange = useCallback((value: string) => {
    setDateRange(value);
  }, []);

  return {
    isRefreshing,
    dateRange,
    startDate,
    endDate,
    handleRefresh,
    handleDateRangeChange,
  };
};
