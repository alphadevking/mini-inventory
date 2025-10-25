import { useState, useEffect } from 'react';

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

  // Update dates when date range changes
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - parseInt(dateRange));

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);

    if (options.onDateRangeChange) {
      options.onDateRangeChange(dateRange);
    }
  }, [dateRange, options.onDateRangeChange]);

  // Auto refresh functionality
  useEffect(() => {
    if (!options.autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, options.refreshInterval || 30000); // Default 30 seconds

    return () => clearInterval(interval);
  }, [options.autoRefresh, options.refreshInterval]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  return {
    isRefreshing,
    dateRange,
    startDate,
    endDate,
    handleRefresh,
    handleDateRangeChange
  };
};
