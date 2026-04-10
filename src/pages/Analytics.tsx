import React from 'react';
import {
  Card,
  Group,
  Title,
  Text,
  SimpleGrid,
  Stack,
  Container,
  Table,
  Badge,
  Tabs,
  Progress,
  Paper,
  Box,
  SimpleGrid as MantineSimpleGrid,
  Select
} from "@mantine/core";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Legend
} from 'recharts';
import { useFetch } from '@/lib/api';
import {
  DollarSign, Package, AlertTriangle, TrendingUp,
  BarChart as BarChartIcon, Activity, PieChart as PieChartIcon, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatNumber, formatCurrencyShort } from "@/lib/utils";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { usePageState } from "@/hooks/usePageState";
import type { DashboardStats, FinancialSummary } from "@/types";

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

const COLORS = ['#228be6', '#0ca678', '#fd7e14', '#fa5252', '#4c6ef5']; // blue, teal, orange, red, indigo

const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { isRefreshing, dateRange, startDate, endDate, handleRefresh, handleDateRangeChange } = usePageState();

  const { data: dashboardStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useFetch<DashboardStats>('/api/analytics/dashboard/stats');
  const { data: financialSummary, loading: financialLoading, error: financialError, refetch: refetchFinancial } = useFetch<FinancialSummary>(
    startDate && endDate ? `/api/analytics/financial-summary?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: salesTrends, loading: trendsLoading, error: trendsError, refetch: refetchTrends } = useFetch<{ daily_trends: SalesTrend[]; weekly_trends: SalesTrend[] }>(`/api/analytics/sales/trends?days=${dateRange}`);
  const { data: inventoryAnalysis, loading: inventoryLoading, error: inventoryError, refetch: refetchInventory } = useFetch<{
    total_products: number;
    total_inventory_value_at_cost: number;
    low_stock_products: number;
    low_stock_value_at_cost: number;
    category_breakdown: Record<string, { count: number; value_at_cost: number; stock: number }>;
    top_products_by_value: Array<{ name: string; value_at_cost: number }>;
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

  const totalLoading = statsLoading || financialLoading || inventoryLoading;
  const hasErrors = statsError || financialError || inventoryError;

  if (totalLoading) return <LoadingState message="Loading your business insights..." />;
  if (hasErrors) return <ErrorDisplay message="Failed to load analytics data" onRetry={() => handleRefresh(refetchStats, refetchFinancial, refetchInventory)} />;

  const salesRevenue = financialSummary?.sales_revenue ?? 0;
  const repairRevenue = financialSummary?.repair_revenue ?? 0;
  const revenue = salesRevenue + repairRevenue;
  const inventoryValue = financialSummary?.inventory_value_at_cost ?? inventoryAnalysis?.total_inventory_value_at_cost ?? 0;
  const lowStockPercentage = inventoryAnalysis ? calculatePercentage(inventoryAnalysis.low_stock_products, inventoryAnalysis.total_products) : 0;
  const profitMargin = financialSummary?.profit_margin ?? 0;

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title={`Analytics Dashboard`}
        description={`Welcome, ${user?.full_name || 'User'}. Visualize your business performance.`}
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetchStats, refetchFinancial, refetchTrends, refetchInventory)}
      >
        <Select
          placeholder="Filter by range"
          data={[
            { value: '7', label: 'Last 7 Days' },
            { value: '30', label: 'Last 30 Days' },
            { value: '90', label: 'Last 90 Days' }
          ]}
          value={dateRange.toString()}
          onChange={(val) => handleDateRangeChange(val || '30')}
          style={{ width: 180 }}
          className="block-input"
        />
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(revenue)}
          description={`${formatCurrency(dashboardStats?.monthly_revenue || 0)} this month`}
          icon={DollarSign}
          color="indigo"
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(inventoryValue)}
          description={`${formatNumber(dashboardStats?.total_products || 0)} products`}
          icon={Package}
          color="blue"
        />
        <MetricCard
          title="Low Stock Alert"
          value={formatNumber(dashboardStats?.low_stock_products || 0)}
          progress={lowStockPercentage}
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          description={`${formatCurrency(financialSummary?.net_profit || 0)} net profit`}
          icon={TrendingUp}
          color="teal"
        />
      </SimpleGrid>

      <Tabs defaultValue="overview" mb="xl">
        <Tabs.List style={{ borderBottom: '1px solid var(--echo-border)' }}>
          <Tabs.Tab value="overview" leftSection={<Activity size={14} />} fw={700}>Overview</Tabs.Tab>
          <Tabs.Tab value="sales" leftSection={<BarChartIcon size={14} />} fw={700}>Sales</Tabs.Tab>
          <Tabs.Tab value="inventory" leftSection={<Package size={14} />} fw={700}>Inventory</Tabs.Tab>
          <Tabs.Tab value="financial" leftSection={<DollarSign size={14} />} fw={700}>Financial</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="lg">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper className="block-card" p="lg">
              <Title order={4} mb="lg" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Sales Trends</Title>
              <Box h={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesTrends?.daily_trends || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fill: 'black', fontSize: 12 }} axisLine={{ stroke: 'black' }} />
                    <YAxis yAxisId="left" tick={{ fill: 'black', fontSize: 12 }} axisLine={{ stroke: 'black' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'black', fontSize: 12 }} axisLine={{ stroke: 'black' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--echo-border)', backgroundColor: 'var(--echo-surface)', color: 'var(--echo-text)' }} formatter={(value: number | string | undefined) => formatCurrency(Number(value || 0))} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="var(--accent-blue)" name="Revenue" radius={0} />
                    <Line yAxisId="right" type="step" dataKey="transactions" stroke="var(--accent-teal)" name="Transactions" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-teal)', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper className="block-card" p="lg">
              <Title order={4} mb="lg" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Revenue Breakdown</Title>
              <Box h={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown ? [
                        { name: 'Sales', value: revenueBreakdown.sales_revenue },
                        { name: 'Repairs', value: revenueBreakdown.repair_revenue }
                      ] : []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      <Cell fill="var(--accent-blue)" />
                      <Cell fill="var(--accent-teal)" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--echo-border)', backgroundColor: 'var(--echo-surface)', color: 'var(--echo-text)' }} formatter={(value: number | string | undefined) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper className="block-card" p="lg" style={{ gridColumn: 'span 2' }}>
              <Title order={4} mb="lg" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Top Selling Products</Title>
              <Table style={{ borderCollapse: 'collapse' }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Units Sold</Table.Th>
                    <Table.Th>Revenue</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topProducts?.map((product, idx) => (
                    <Table.Tr key={product.sku}>
                      <Table.Td style={{ borderBottom: '1px solid black' }}>
                        <Group gap="sm">
                          <Badge color="dark" variant="outline" size="sm" style={{ borderRadius: 0, border: '1px solid black' }}>{idx + 1}</Badge>
                          <Text size="sm" fw={800}>{product.name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={700}>{product.category}</Text></Table.Td>
                      <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={700}>{product.total_quantity}</Text></Table.Td>
                      <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={800}>{formatCurrency(product.total_revenue)}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="sales" pt="lg">
          {/* Add more detailed sales charts if needed */}
          <Paper withBorder p="lg" radius="md">
            <Title order={4} mb="lg">Category Performance</Title>
            <Box h={400}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerformance?.categories || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <YAxis tickFormatter={formatCurrencyShort} />
                  <Tooltip formatter={(value: number | string | undefined) => formatCurrency(Number(value || 0))} />
                  <Bar dataKey="total_revenue" fill="var(--accent-indigo)" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="inventory" pt="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder p="lg" radius="md">
              <Title order={4} mb="lg">Value by Category</Title>
              <Box h={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryAnalysis?.category_breakdown ? Object.entries(inventoryAnalysis.category_breakdown).map(([name, d]) => ({ name, value: d.value_at_cost })) : []}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {inventoryAnalysis && Object.keys(inventoryAnalysis.category_breakdown).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | string | undefined) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <Paper withBorder p="lg" radius="md">
              <Title order={4} mb="lg">Inventory Health</Title>
              <Stack gap="md">
                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Low Stock Items</Text>
                    <Text size="sm" fw={500}>{inventoryAnalysis?.low_stock_products || 0}</Text>
                  </Group>
                  <Progress value={lowStockPercentage} color="orange.6" size="lg" radius={0} style={{ border: '1px solid black' }} />
                </Box>
                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Total Products</Text>
                    <Text size="sm" fw={500}>{inventoryAnalysis?.total_products || 0}</Text>
                  </Group>
                  <Progress value={100} color="blue.6" size="lg" radius={0} style={{ border: '1px solid black' }} />
                </Box>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="financial" pt="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Paper withBorder p="lg" radius="md">
              <Title order={4} mb="lg">Profitability Overview</Title>
              <Table verticalSpacing="md">
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Sales Revenue</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="green">{formatCurrency(financialSummary?.sales_revenue ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Sales COGS</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="red">-{formatCurrency(financialSummary?.sales_cogs ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Sales Gross Profit</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={600}>{formatCurrency(financialSummary?.sales_gross_profit ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr style={{ borderTop: '1px solid #eee' }}>
                    <Table.Td><Text size="sm" color="dimmed">Repair Revenue</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="green">{formatCurrency(financialSummary?.repair_revenue ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Repair Parts Cost</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="red">-{formatCurrency(financialSummary?.repair_parts_cost ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Repair Labor Cost</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="red">-{formatCurrency(financialSummary?.repair_labor_cost ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Repair Gross Profit</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={600}>{formatCurrency(financialSummary?.repair_gross_profit ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr style={{ borderTop: '1px solid #eee' }}>
                    <Table.Td><Text size="sm" color="dimmed">Transport / Other</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="red">-{formatCurrency(financialSummary?.transport_costs ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Operating Expenses</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={500} color="red">-{formatCurrency(financialSummary?.total_expenses ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="md" fw={800}>Net Profit</Text></Table.Td>
                    <Table.Td><Text size="md" fw={800} color={financialSummary?.net_profit && financialSummary.net_profit >= 0 ? "green" : "red"}>{formatCurrency(financialSummary?.net_profit ?? 0)}</Text></Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td><Text size="sm" color="dimmed">Profit Margin</Text></Table.Td>
                    <Table.Td><Text size="sm" fw={700}>{(financialSummary?.profit_margin ?? 0).toFixed(1)}%</Text></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Paper>
            <Paper withBorder p="lg" radius="md">
              <Title order={4} mb="lg">Expense Breakdown</Title>
              <Box h={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseBreakdown?.categories || []}>
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="var(--accent-red)" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default Analytics;
