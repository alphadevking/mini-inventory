import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  showRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showDateRange?: boolean;
  dateRange?: string;
  onDateRangeChange?: (value: string) => void;
  dateRangeOptions?: Array<{ value: string; label: string }>;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  showRefresh = true,
  isRefreshing = false,
  onRefresh,
  showDateRange = false,
  dateRange,
  onDateRangeChange,
  dateRangeOptions = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "365", label: "Last year" }
  ],
  children
}) => {
  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-3">
        {children}
        <div className="flex items-center gap-2">
          {showRefresh && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
          {showDateRange && onDateRangeChange && (
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
};
