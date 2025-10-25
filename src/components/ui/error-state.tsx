import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  retryText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Error Loading Data",
  description = "There was an error loading your data. Please try again.",
  onRetry,
  isRetrying = false,
  retryText = "Try Again"
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 space-y-4">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <div className="text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} className="mt-4" disabled={isRetrying}>
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {retryText}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
