import { AlertCircle } from "lucide-react";
import { Button } from "./button";

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message = "Something went wrong", onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex gap-2 flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Error</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
