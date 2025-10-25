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
  ComposedChart, Legend
} from 'recharts';
import { useFetch } from '@/lib/api';
import {
  Calendar, TrendingUp, DollarSign, Package, AlertTriangle, Users, ShoppingCart,
  Activity, Target, Zap, Award, Clock, CheckCircle, TrendingDown, ArrowUpRight,
  ArrowDownRight, Minus, RefreshCw
} from 'lucide-react';

interface DashboardStats {
  total_products: number;
  low_stock_products: number;
  total_repairs: number;
  pending_repairs: number;
  completed_repairs: number;
  total_transactions: number;
  total_expenses: number;
  monthly_revenue: number;
  monthly_profit: number;
}

interface FinancialSummary {
  total_revenue: number;
  total_cogs: number;
  total_gross_profit: number;
  total_transport_other_costs: number;
  total_expenses: number;
  total_repair_revenue: number;
  total_repair_costs: number;
  net_profit: number;
  profit_margin: number;
}

interface SalesTrend {
  date: string;
  revenue: number;
  transactions: number;
}

interface TopProduct {
  name: string;
  sku: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  avg_price: number;
}

interface CategoryPerformance {
  name: string;
  total_quantity: number;
  total_revenue: number;
  total_transactions: number;
  avg_price: number;
  product_count: number;
}

interface RevenueBreakdown {
  total_revenue: number;
  sales_revenue: number;
  repair_revenue: number;
  breakdown: {
    sales_percentage: number;
    repair_percentage: number;
  };
}

interface ExpenseBreakdown {
  total_expenses: number;
  categories: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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

const Analytics: React.FC = () => {
  const { isRefreshing, dateRange, startDate, endDate, handleRefresh, handleDateRangeChange } = usePageState();

  // API calls with error handling
  const { data: dashboardStats, loading: statsLoading, error: statsError } = useFetch<DashboardStats>('/api/analytics/dashboard/stats');
  const { data: financialSummary, loading: financialLoading, error: financialError } = useFetch<FinancialSummary>(
    startDate && endDate ? `/api/analytics/financial-summary?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: salesTrends, loading: trendsLoading, error: trendsError } = useFetch<{ daily_trends: SalesTrend[]; weekly_trends: SalesTrend[] }>(`/api/analytics/sales/trends?days=${dateRange}`);
  const { data: inventoryAnalysis, loading: inventoryLoading, error: inventoryError } = useFetch<{
    total_products: number;
    total_inventory_value: number;
    low_stock_products: number;
    low_stock_value: number;
    category_analysis: Record<string, { count: number; value: number; stock: number }>;
    top_products_by_value: Array<[string, number]>;
  }>('/api/analytics/inventory/analysis');
  const { data: topProducts, loading: topProductsLoading, error: topProductsError } = useFetch<TopProduct[]>(
    startDate && endDate ? `/api/analytics/products/top-selling?limit=10&start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: categoryPerformance, loading: categoryLoading, error: categoryError } = useFetch<{ categories: CategoryPerformance[] }>(
    startDate && endDate ? `/api/analytics/categories/performance?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: revenueBreakdown, loading: revenueLoading, error: revenueError } = useFetch<RevenueBreakdown>(
    startDate && endDate ? `/api/analytics/revenue/breakdown?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: expenseBreakdown, loading: expenseLoading, error: expenseError } = useFetch<ExpenseBreakdown>(
    startDate && endDate ? `/api/analytics/expenses/breakdown?start_date=${startDate}&end_date=${endDate}` : null
  );


  // Calculate derived metrics
  const totalLoading = statsLoading || financialLoading || inventoryLoading;
  const hasErrors = statsError || financialError || inventoryError;

  // Enhanced calculations
  const inventoryValue = inventoryAnalysis?.total_inventory_value || 0;
  const lowStockPercentage = inventoryAnalysis ?
    calculatePercentage(inventoryAnalysis.low_stock_products, inventoryAnalysis.total_products) : 0;

  const profitMargin = financialSummary?.profit_margin || 0;
  const revenue = financialSummary?.total_revenue || 0;
  const expenses = financialSummary?.total_expenses || 0;
  const netProfit = financialSummary?.net_profit || 0;

  // Enhanced loading state
  if (totalLoading) {
    return (
      <LoadingState
        title="Analytics Dashboard"
        description="Loading your business insights..."
        cardCount={4}
        showCharts={true}
      />
    );
  }

  // Error state
  if (hasErrors) {
    return (
      <ErrorState
        title="Error Loading Analytics"
        description="There was an error loading your analytics data."
        onRetry={handleRefresh}
        isRetrying={isRefreshing}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        description="Comprehensive business insights and analytics"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        showDateRange={true}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(revenue)}
          subtitle={`${formatCurrency(dashboardStats?.monthly_revenue || 0)} this month`}
          icon={DollarSign}
          borderColor="border-l-blue-500"
          iconColor="text-blue-500"
        />

        <MetricCard
          title="Inventory Value"
          value={formatCurrency(inventoryValue)}
          subtitle={`${formatNumber(dashboardStats?.total_products || 0)} products`}
          icon={Package}
          borderColor="border-l-green-500"
          iconColor="text-green-500"
        />

        <MetricCard
          title="Low Stock Alert"
          value={formatNumber(dashboardStats?.low_stock_products || 0)}
          progress={lowStockPercentage}
          progressLabel={`${lowStockPercentage}%`}
          icon={AlertTriangle}
          borderColor="border-l-orange-500"
          iconColor="text-orange-500"
          valueColor="text-orange-600"
        />

        <MetricCard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          subtitle={`${formatCurrency(netProfit)} net profit`}
          icon={TrendingUp}
          borderColor="border-l-purple-500"
          iconColor="text-purple-500"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sales Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Trends</CardTitle>
                <CardDescription>Daily revenue and transaction count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={salesTrends?.daily_trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'revenue' ? formatCurrency(Number(value)) : value,
                          name === 'revenue' ? 'Revenue' : 'Transactions'
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
                      <Line yAxisId="right" type="monotone" dataKey="transactions" stroke="#82ca9d" name="Transactions" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue by source</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueBreakdown ? [
                          { name: 'Sales', value: revenueBreakdown.sales_revenue, percentage: revenueBreakdown.breakdown.sales_percentage },
                          { name: 'Repairs', value: revenueBreakdown.repair_revenue, percentage: revenueBreakdown.breakdown.repair_percentage }
                        ] : []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Products</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts?.slice(0, 5).map((product, index) => (
                  <div key={product.sku} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.category} • {product.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(product.total_revenue)}</div>
                      <div className="text-sm text-muted-foreground">{product.total_quantity} units sold</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sales Trends Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrends?.daily_trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryPerformance?.categories || []} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="total_revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Inventory Value by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value by Category</CardTitle>
                <CardDescription>Current inventory value distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryAnalysis?.category_analysis ? Object.entries(inventoryAnalysis.category_analysis).map(([name, data]) => ({
                          name,
                          value: data.value
                        })) : []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(inventoryAnalysis?.category_analysis || {}).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
                <CardDescription>Key inventory metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Inventory Value</span>
                    <span className="text-lg font-bold">{formatCurrency(inventoryAnalysis?.total_inventory_value || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Products</span>
                    <span className="text-lg font-bold">{formatNumber(inventoryAnalysis?.total_products || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Low Stock Products</span>
                    <Badge variant="destructive">{formatNumber(inventoryAnalysis?.low_stock_products || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Low Stock Value</span>
                    <span className="text-lg font-bold text-orange-600">{formatCurrency(inventoryAnalysis?.low_stock_value || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Key financial metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(financialSummary?.total_revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Cost of Goods Sold</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(financialSummary?.total_cogs || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gross Profit</span>
                    <span className="text-lg font-bold">{formatCurrency(financialSummary?.total_gross_profit || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Expenses</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(financialSummary?.total_expenses || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Net Profit</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(financialSummary?.net_profit || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Profit Margin</span>
                    <Badge variant={financialSummary && financialSummary.profit_margin > 0 ? "default" : "destructive"}>
                      {(financialSummary?.profit_margin || 0).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses Breakdown</CardTitle>
                <CardDescription>Expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseBreakdown?.categories || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="amount" fill="#ff6b6b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
