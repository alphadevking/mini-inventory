import React from 'react';
import {
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
  Box
} from "@mantine/core";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
  ComposedChart, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { useFetch } from '@/lib/api';
import {
  TrendingUp, DollarSign, Package, Activity, BarChart as BarChartIcon, Zap, Target
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";

interface KPIMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
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
}

interface OperationalEfficiency {
  cost_efficiency: {
    cost_to_revenue_ratio: number;
    expense_to_revenue_ratio: number;
  };
  overall_efficiency_score: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ERP: React.FC = () => {
  const { user } = useAuth();
  const { isRefreshing, dateRange, startDate, endDate, handleRefresh } = usePageState();

  const { data: biData, loading: biLoading, error: biError, refetch: refetchBi } = useFetch<BusinessIntelligence>(
    startDate && endDate ? `/api/erp/business-intelligence?start_date=${startDate}&end_date=${endDate}` : null
  );
  const { data: efficiencyData, loading: effLoading, error: effError, refetch: refetchEff } = useFetch<OperationalEfficiency>(
    startDate && endDate ? `/api/erp/operational-efficiency?start_date=${startDate}&end_date=${endDate}` : null
  );

  const loading = biLoading || effLoading;
  const error = biError || effError;

  if (loading) return <LoadingState message="Loading ERP data..." />;
  if (error) return <ErrorDisplay message="Failed to load ERP data" onRetry={() => handleRefresh(refetchBi, refetchEff)} />;

  const performanceData = biData?.sales_trends?.daily_trends?.slice(-7).map((trend, index) => {
    const profitMargin = biData?.financial_metrics?.profit_margin || 0;
    const profitAmount = (trend.revenue * profitMargin) / 100;
    return {
      period: `Day ${index + 1}`,
      revenue: trend.revenue,
      profit: profitAmount,
      efficiency: efficiencyData?.overall_efficiency_score || 0
    };
  }) || [];

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="ERP Dashboard"
        description="Comprehensive Business Intelligence & Resource Planning"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetchBi, refetchEff)}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <Paper className="block-card" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>Revenue Growth</Text>
            <TrendingUp size={16} color="black" />
          </Group>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{(biData?.financial_metrics?.revenue_growth ?? 0).toFixed(1)}%</Text>
          <Progress value={Math.min(100, Math.max(0, (biData?.financial_metrics?.revenue_growth ?? 0) + 50))} mt="sm" color="black" size="sm" radius={0} />
        </Paper>
        <Paper className="block-card" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>Profit Margin</Text>
            <TrendingUp size={16} color="black" />
          </Group>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{(biData?.financial_metrics?.profit_margin ?? 0).toFixed(1)}%</Text>
          <Progress value={Math.min(100, Math.max(0, biData?.financial_metrics?.profit_margin ?? 0))} mt="sm" color="black" size="sm" radius={0} />
        </Paper>
        <Paper className="block-card" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>Efficiency</Text>
            <Activity size={16} color="black" />
          </Group>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{(efficiencyData?.overall_efficiency_score ?? 0).toFixed(1)}%</Text>
          <Progress value={Math.min(100, Math.max(0, efficiencyData?.overall_efficiency_score ?? 0))} mt="sm" color="black" size="sm" radius={0} />
        </Paper>
        <Paper className="block-card" p="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>Inventory Turnover</Text>
            <Package size={16} color="black" />
          </Group>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{(biData?.inventory_metrics?.inventory_turnover ?? 0).toFixed(1)}x</Text>
          <Progress value={Math.min(100, Math.max(0, (biData?.inventory_metrics?.inventory_turnover ?? 0) * 10))} mt="sm" color="black" size="sm" radius={0} />
        </Paper>
      </SimpleGrid>

      <Tabs defaultValue="overview">
        <Tabs.List style={{ borderBottom: '1px solid var(--echo-border)' }}>
          <Tabs.Tab value="overview" leftSection={<Activity size={14} />} fw={700}>Overview</Tabs.Tab>
          <Tabs.Tab value="performance" leftSection={<BarChartIcon size={14} />} fw={700}>Performance</Tabs.Tab>
          <Tabs.Tab value="radar" leftSection={<Target size={14} />} fw={700}>Market Radar</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="lg">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper className="block-card" p="lg">
              <Title order={4} mb="lg" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Revenue vs Profit Analysis</Title>
              <Box h={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="period" tick={{ fill: 'black', fontSize: 12 }} axisLine={{ stroke: 'black' }} />
                    <YAxis yAxisId="left" tick={{ fill: 'black', fontSize: 12 }} axisLine={{ stroke: 'black' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'black', fontSize: 12 }} axisLine={{ stroke: 'black' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--echo-border)', backgroundColor: 'var(--echo-surface)', color: 'var(--echo-text)' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="black" name="Revenue" radius={0} />
                    <Bar yAxisId="left" dataKey="profit" fill="#666" name="Profit" radius={0} />
                    <Line yAxisId="right" type="step" dataKey="efficiency" stroke="black" strokeWidth={3} name="Efficiency %" dot={{ r: 4, fill: 'white', stroke: 'black', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
            <Paper className="block-card" p="lg">
              <Title order={4} mb="lg" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Category Radar</Title>
              <Box h={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={biData?.category_performance?.categories?.slice(0, 5) || []}>
                    <PolarGrid stroke="#eee" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'black', fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fill: 'black', fontSize: 10 }} />
                    <Radar name="Revenue" dataKey="total_revenue" stroke="black" fill="black" fillOpacity={0.6} />
                    <Radar name="Units" dataKey="total_quantity" stroke="#666" fill="#666" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="performance" pt="lg">
          <Paper className="block-card" p="lg">
            <Title order={4} mb="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Business Health Indicators</Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
              <Stack align="center" gap="sm">
                <Text fw={800} size="xl" color="black">{(biData?.financial_metrics?.profit_margin ?? 0).toFixed(1)}%</Text>
                <Text size="sm" color="dimmed" fw={700}>Profit Margin</Text>
                <Progress value={Math.min(100, Math.max(0, biData?.financial_metrics?.profit_margin ?? 0))} w="100%" color="black" size="md" radius={0} />
              </Stack>
              <Stack align="center" gap="sm">
                <Text fw={800} size="xl" color="black">{(efficiencyData?.overall_efficiency_score ?? 0).toFixed(1)}%</Text>
                <Text size="sm" color="dimmed" fw={700}>Efficiency Score</Text>
                <Progress value={Math.min(100, Math.max(0, efficiencyData?.overall_efficiency_score ?? 0))} w="100%" color="black" size="md" radius={0} />
              </Stack>
              <Stack align="center" gap="sm">
                <Text fw={800} size="xl" color="black">{(biData?.financial_metrics?.revenue_growth ?? 0).toFixed(1)}%</Text>
                <Text size="sm" color="dimmed" fw={700}>Revenue Growth</Text>
                <Progress value={Math.min(100, Math.max(0, (biData?.financial_metrics?.revenue_growth ?? 0) + 50))} w="100%" color="black" size="md" radius={0} />
              </Stack>
            </SimpleGrid>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default ERP;
