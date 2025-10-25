import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: number;
  progress?: number;
  progressLabel?: string;
  borderColor?: string;
  iconColor?: string;
  valueColor?: string;
  className?: string;
}

const getTrendIcon = (trend: number) => {
  if (trend > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (trend < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
};

const getTrendColor = (trend: number) => {
  if (trend > 0) return 'text-green-600';
  if (trend < 0) return 'text-red-600';
  return 'text-gray-600';
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  progress,
  progressLabel,
  borderColor = 'border-l-blue-500',
  iconColor = 'text-blue-500',
  valueColor = '',
  className = ''
}) => {
  return (
    <Card className={`border-l-4 ${borderColor} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor}`}>
          {value}
        </div>
        <div className="flex items-center space-x-2 mt-1">
          {subtitle && (
            <span className="text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
          {trend !== undefined && (
            <div className={`flex items-center space-x-1 ${getTrendColor(trend)}`}>
              {getTrendIcon(trend)}
              <span className="text-xs">
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {progress !== undefined && (
          <div className="flex items-center space-x-2 mt-2">
            <Progress value={progress} className="flex-1 h-2" />
            {progressLabel && (
              <span className="text-xs text-muted-foreground">
                {progressLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
