import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { usePageState } from '@/hooks/usePageState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Legend, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { useFetch } from '@/lib/api';
import {
  TrendingUp, DollarSign, Package, AlertTriangle, Users, ShoppingCart,
  Target, BarChart3, Activity, Zap, Award, Clock, CheckCircle,
  RefreshCw, ArrowUpRight, ArrowDownRight, Minus, TrendingDown
} from 'lucide-react';

interface KPIMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface BusinessMetrics {
  revenue_growth: number;
  profit_margin: number;
  inventory_turnover: number;
  customer_satisfaction: number;
  operational_efficiency: number;
  cash_flow: number;
}

interface PerformanceData {
  period: string;
  revenue: number;
  profit: number;
  expenses: number;
  efficiency: number;
}

interface BusinessIntelligence {
  financial_metrics: {
    total_revenue: number;
    total_costs: number;
    net_profit: number;
    profit_margin: number;
    revenue_growth: number;
  };
  operational_metrics: {
    total_transactions: number;
    average_order_value: number;
    customer_acquisition_cost: number;
    customer_lifetime_value: number;
    market_share: number;
  };
  inventory_metrics: {
    total_inventory_value: number;
    low_stock_products: number;
    inventory_turnover: number;
  };
  sales_trends: {
    daily_trends: Array<{
      date: string;
      revenue: number;
      transactions: number;
    }>;
    weekly_trends: Array<{
      week: string;
      revenue: number;
      transactions: number;
    }>;
  };
  category_performance: {
    categories: Array<{
      name: string;
      total_quantity: number;
      total_revenue: number;
      total_transactions: number;
      avg_price: number;
      product_count: number;
    }>;
  };
  business_health_score: number;
}

interface KPIMetrics {
  financial_kpis: {
    revenue_growth: number;
    profit_growth: number;
    profit_margin: number;
    operational_efficiency: number;
  };
  operational_kpis: {
    inventory_turnover: number;
    customer_satisfaction: number;
    order_fulfillment_rate: number;
    average_processing_time: number;
  };
  growth_kpis: {
    monthly_recurring_revenue: number;
    customer_acquisition_rate: number;
    market_penetration: number;
    brand_awareness: number;
  };
}

interface OperationalEfficiency {
  cost_efficiency: {
    cost_to_revenue_ratio: number;
    expense_to_revenue_ratio: number;
    gross_profit_margin: number;
  };
  resource_utilization: {
    inventory_utilization: number;
    staff_productivity: number;
    equipment_utilization: number;
    space_utilization: number;
  };
  process_efficiency: {
    order_processing_time: number;
    repair_completion_rate: number;
    return_processing_time: number;
    inventory_accuracy: number;
  };
  overall_efficiency_score: number;
}

interface Forecasting {
  historical_data: Array<{
    month: string;
    revenue: number;
  }>;
  forecasts: Array<{
    month: string;
    revenue: number;
    confidence: number;
  }>;
  growth_trend: number;
  confidence_level: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

// Utility functions for calculations
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

const getTrendIcon = (value: number) => {
  if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
  if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
};

const getTrendColor = (value: number) => {
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-600';
  return 'text-gray-600';
};

const getHealthScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getHealthScoreBadge = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const ERP: React.FC = () => {
  const { isRefreshing, dateRange, startDate, endDate, handleRefresh, handleDateRangeChange } = usePageState();

  // API calls with error handling
  const { data: dashboardStats, loading: statsLoading, error: statsError } = useFetch('/api/analytics/dashboard/stats');
  const { data: businessIntelligence, loading: biLoading, error: biError } = useFetch<BusinessIntelligence>(
    startDate && endDate ? `/api/erp/business-intelligence?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: kpiMetrics, loading: kpiLoading, error: kpiError } = useFetch<KPIMetrics>(
    startDate && endDate ? `/api/erp/kpi-metrics?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: operationalEfficiency, loading: efficiencyLoading, error: efficiencyError } = useFetch<OperationalEfficiency>(
    startDate && endDate ? `/api/erp/operational-efficiency?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: marketAnalysis, loading: marketLoading, error: marketError } = useFetch(
    startDate && endDate ? `/api/erp/market-analysis?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: riskAssessment, loading: riskLoading, error: riskError } = useFetch('/api/erp/risk-assessment');
  const { data: forecasting, loading: forecastLoading, error: forecastError } = useFetch<Forecasting>('/api/erp/forecasting?months=3');
  const { data: benchmarking, loading: benchmarkLoading, error: benchmarkError } = useFetch(
    startDate && endDate ? `/api/erp/benchmarking?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: strategicInsights, loading: insightsLoading, error: insightsError } = useFetch(
    startDate && endDate ? `/api/erp/strategic-insights?start_date=${startDate}&end_date=${endDate}` : null
  );


  // Calculate derived metrics
  const totalLoading = statsLoading || biLoading || kpiLoading;
  const hasErrors = statsError || biError || kpiError;

  // Enhanced calculations
  const businessHealthScore = businessIntelligence?.business_health_score || 0;
  const overallEfficiency = operationalEfficiency?.overall_efficiency_score || 0;
  const revenue = businessIntelligence?.financial_metrics?.total_revenue || 0;
  const profitMargin = businessIntelligence?.financial_metrics?.profit_margin || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  // Calculate KPI metrics
  const kpiMetricsData: KPIMetric[] = [
    {
      name: 'Revenue Growth',
      value: kpiMetrics?.financial_kpis?.revenue_growth || 0,
      target: 15,
      unit: '%',
      trend: (kpiMetrics?.financial_kpis?.revenue_growth || 0) > 0 ? 'up' : 'down',
      change: kpiMetrics?.financial_kpis?.revenue_growth || 0
    },
    {
      name: 'Profit Margin',
      value: kpiMetrics?.financial_kpis?.profit_margin || 0,
      target: 20,
      unit: '%',
      trend: (kpiMetrics?.financial_kpis?.profit_margin || 0) > 15 ? 'up' : 'down',
      change: kpiMetrics?.financial_kpis?.profit_margin || 0
    },
    {
      name: 'Inventory Turnover',
      value: kpiMetrics?.operational_kpis?.inventory_turnover || 0,
      target: 6,
      unit: 'x',
      trend: (kpiMetrics?.operational_kpis?.inventory_turnover || 0) > 5 ? 'up' : 'down',
      change: (kpiMetrics?.operational_kpis?.inventory_turnover || 0) - 4.2
    },
    {
      name: 'Operational Efficiency',
      value: kpiMetrics?.financial_kpis?.operational_efficiency || 0,
      target: 75,
      unit: '%',
      trend: (kpiMetrics?.financial_kpis?.operational_efficiency || 0) > 70 ? 'up' : 'down',
      change: (kpiMetrics?.financial_kpis?.operational_efficiency || 0)
    }
  ];

  // Generate performance data for charts
  const performanceData: PerformanceData[] = businessIntelligence?.sales_trends?.daily_trends?.slice(-7).map((trend: { date: string; revenue: number; transactions: number }, index: number) => {
    const actualProfitMargin = businessIntelligence?.financial_metrics?.profit_margin || 0;
    const profitAmount = (trend.revenue * actualProfitMargin) / 100;
    const expensesAmount = trend.revenue - profitAmount;
    const efficiencyScore = operationalEfficiency?.overall_efficiency_score || 0;

    return {
      period: `Day ${index + 1}`,
      revenue: trend.revenue,
      profit: profitAmount,
      expenses: expensesAmount,
      efficiency: efficiencyScore
    };
  }) || [];

  // Enhanced loading state
  if (totalLoading) {
    return (
      <LoadingState
        title="ERP Dashboard"
        description="Loading your business intelligence..."
        cardCount={4}
        showCharts={true}
      />
    );
  }

  // Error state
  if (hasErrors) {
    return (
      <ErrorState
        title="Error Loading ERP Data"
        description="There was an error loading your ERP dashboard data."
        onRetry={handleRefresh}
        isRetrying={isRefreshing}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 space-y-6">
      <PageHeader
        title="ERP Dashboard"
        description="Enterprise Resource Planning & Business Intelligence"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        showDateRange={true}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiMetricsData.map((metric, index) => (
          <Card key={metric.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              {index === 0 && <TrendingUp className="h-4 w-4 text-muted-foreground" />}
              {index === 1 && <DollarSign className="h-4 w-4 text-muted-foreground" />}
              {index === 2 && <Package className="h-4 w-4 text-muted-foreground" />}
              {index === 3 && <Activity className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.unit === '%' ? formatPercentage(metric.value) : formatNumber(metric.value)}
                {metric.unit !== '%' && ` ${metric.unit}`}
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Progress
                  value={(metric.value / metric.target) * 100}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  {formatPercentage((metric.value / metric.target) * 100)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">Target: {metric.target}{metric.unit}</span>
                <Badge
                  variant={metric.trend === 'up' ? 'default' : metric.trend === 'down' ? 'destructive' : 'secondary'}
                >
                  {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Business Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue vs Profit Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit Analysis</CardTitle>
                <CardDescription>Daily revenue and profit trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'efficiency' ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value)),
                          name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : name === 'efficiency' ? 'Efficiency' : name
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
                      <Bar yAxisId="left" dataKey="profit" fill="#82ca9d" name="Profit" />
                      <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#ff6b6b" name="Efficiency %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance Radar</CardTitle>
                <CardDescription>Multi-dimensional category analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={businessIntelligence?.category_performance?.categories?.slice(0, 5).map((cat: { name: string; total_revenue: number; total_transactions: number; product_count: number; avg_price: number }) => ({
                      category: cat.name,
                      revenue: cat.total_revenue,
                      transactions: cat.total_transactions,
                      products: cat.product_count,
                      avgPrice: cat.avg_price / 100 // Normalize
                    })) || []}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis />
                      <Radar name="Revenue" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                      <Radar name="Transactions" dataKey="transactions" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Health Score */}
          <Card>
            <CardHeader>
              <CardTitle>Business Health Score</CardTitle>
              <CardDescription>Overall business performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {Math.min(100, Math.max(0, Math.round(businessIntelligence?.financial_metrics?.profit_margin || 0)))}/100
                  </div>
                  <div className="text-sm text-muted-foreground">Profitability Score</div>
                  <Progress value={Math.min(100, Math.max(0, businessIntelligence?.financial_metrics?.profit_margin || 0))} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {Math.min(100, Math.max(0, Math.round(operationalEfficiency?.overall_efficiency_score || 0)))}/100
                  </div>
                  <div className="text-sm text-muted-foreground">Efficiency Score</div>
                  <Progress value={Math.min(100, Math.max(0, operationalEfficiency?.overall_efficiency_score || 0))} className="mt-2" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {Math.min(100, Math.max(0, Math.round((businessIntelligence?.financial_metrics?.revenue_growth || 0) + 50)))}/100
                  </div>
                  <div className="text-sm text-muted-foreground">Growth Score</div>
                  <Progress value={Math.min(100, Math.max(0, (businessIntelligence?.financial_metrics?.revenue_growth || 0) + 50))} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Key performance indicators over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue" />
                      <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} name="Profit" />
                      <Line type="monotone" dataKey="expenses" stroke="#ff6b6b" strokeWidth={2} name="Expenses" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Efficiency Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Efficiency Metrics</CardTitle>
                <CardDescription>Operational efficiency indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cost to Revenue Ratio</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={operationalEfficiency?.cost_efficiency?.cost_to_revenue_ratio || 0} className="w-24" />
                      <span className="text-sm font-bold">{formatPercentage(operationalEfficiency?.cost_efficiency?.cost_to_revenue_ratio || 0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Expense to Revenue Ratio</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={operationalEfficiency?.cost_efficiency?.expense_to_revenue_ratio || 0} className="w-24" />
                      <span className="text-sm font-bold">{formatPercentage(operationalEfficiency?.cost_efficiency?.expense_to_revenue_ratio || 0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue Growth</span>
                    <Badge variant={businessIntelligence?.financial_metrics?.revenue_growth && businessIntelligence.financial_metrics.revenue_growth > 0 ? 'default' : 'destructive'}>
                      {formatPercentage(businessIntelligence?.financial_metrics?.revenue_growth || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Inventory Utilization</span>
                    <Badge variant={operationalEfficiency?.resource_utilization?.inventory_utilization && operationalEfficiency.resource_utilization.inventory_utilization > 70 ? 'default' : 'destructive'}>
                      {formatPercentage(operationalEfficiency?.resource_utilization?.inventory_utilization || 0)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Operational Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle>Operational Efficiency</CardTitle>
                <CardDescription>Efficiency metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                      <Area type="monotone" dataKey="efficiency" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Resource Utilization */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>How efficiently resources are being used</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Inventory Utilization</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={75} className="w-24" />
                      <span className="text-sm font-bold">75%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sales Efficiency</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={68} className="w-24" />
                      <span className="text-sm font-bold">68%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cost Control</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={82} className="w-24" />
                      <span className="text-sm font-bold">82%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profit Optimization</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={71} className="w-24" />
                      <span className="text-sm font-bold">71%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
                <CardDescription>Projected revenue based on current trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      ...performanceData,
                      ...(forecasting?.forecasts?.slice(0, 3).map((forecast: { month: string; revenue: number; confidence: number }, index: number) => ({
                        period: `Forecast ${index + 1}`,
                        revenue: forecast.revenue,
                        profit: (forecast.revenue * (businessIntelligence?.financial_metrics?.profit_margin || 0)) / 100,
                        expenses: forecast.revenue - ((forecast.revenue * (businessIntelligence?.financial_metrics?.profit_margin || 0)) / 100),
                        efficiency: 0
                      })) || [])
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Actual Revenue" />
                      <Line type="monotone" dataKey="revenue" stroke="#ff6b6b" strokeDasharray="5 5" strokeWidth={2} name="Forecast" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Growth Projections */}
            <Card>
              <CardHeader>
                <CardTitle>Growth Projections</CardTitle>
                <CardDescription>Expected growth metrics for next quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue Growth</span>
                    <Badge variant={businessIntelligence?.financial_metrics?.revenue_growth && businessIntelligence.financial_metrics.revenue_growth > 0 ? 'default' : 'destructive'}>
                      {formatPercentage(businessIntelligence?.financial_metrics?.revenue_growth || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profit Growth</span>
                    <Badge variant={kpiMetrics?.financial_kpis?.profit_growth && kpiMetrics.financial_kpis.profit_growth > 0 ? 'default' : 'destructive'}>
                      {formatPercentage(kpiMetrics?.financial_kpis?.profit_growth || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Market Share</span>
                    <Badge variant="secondary">{formatPercentage(businessIntelligence?.operational_metrics?.market_share || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Customer Acquisition</span>
                    <Badge variant="default">{formatPercentage(kpiMetrics?.growth_kpis?.customer_acquisition_rate || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Operational Efficiency</span>
                    <Badge variant="default">{formatPercentage(operationalEfficiency?.overall_efficiency_score || 0)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ERP;
