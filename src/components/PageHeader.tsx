import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  backButton?: {
    label: string;
    to: string;
  };
  showRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showDateRange?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  onDateRangeChange?: (range: { from: Date; to: Date }) => void;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  action,
  backButton,
  showRefresh = false,
  isRefreshing = false,
  onRefresh,
  showDateRange = false,
  dateRange,
  onDateRangeChange,
  children,
  className
}: PageHeaderProps) {
  return (
    <div className={cn(
      "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm",
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            {backButton && (
              <Link to={backButton.to}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">{backButton.label}</span>
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {showRefresh && onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            {action && (
              <Button
                onClick={action.onClick}
                className="flex items-center gap-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {action.icon || <Plus className="w-4 h-4" />}
                {action.label}
              </Button>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
