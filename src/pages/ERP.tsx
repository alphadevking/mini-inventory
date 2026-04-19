import React from 'react';
import {
  Group,
  Title,
  Text,
  SimpleGrid,
  Stack,
  Container,
  Paper,
  Progress,
  Box,
  Tabs,
} from "@mantine/core";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Line,
} from 'recharts';
import { useFetch } from '@/lib/api';
import { TrendingUp, DollarSign, Package, Activity, BarChart as BarChartIcon, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { usePageState } from "@/hooks/usePageState";

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

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid var(--echo-border)',
  backgroundColor: 'var(--echo-surface)',
  color: 'var(--echo-text)',
};

const axisTickStyle = { fill: 'var(--echo-text-2)', fontSize: 12 };
const axisLineStyle = { stroke: 'var(--echo-border)' };

const ERP: React.FC = () => {
  const { isRefreshing, startDate, endDate, handleRefresh } = usePageState();

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

  const revenueGrowth = biData?.financial_metrics?.revenue_growth ?? 0;
  const profitMargin  = biData?.financial_metrics?.profit_margin ?? 0;
  const efficiency    = efficiencyData?.overall_efficiency_score ?? 0;
  const turnover      = biData?.inventory_metrics?.inventory_turnover ?? 0;

  const performanceData = biData?.sales_trends?.daily_trends?.slice(-7).map((trend, index) => ({
    period: `Day ${index + 1}`,
    revenue: trend.revenue,
    profit: (trend.revenue * profitMargin) / 100,
    efficiency,
  })) || [];

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
        <MetricCard
          title="Revenue Growth"
          value={`${revenueGrowth.toFixed(1)}%`}
          icon={TrendingUp}
          color="teal"
          trend={revenueGrowth >= 0 ? 'up' : 'down'}
          progress={Math.min(100, Math.max(0, revenueGrowth + 50))}
          description="vs prior period"
        />
        <MetricCard
          title="Profit Margin"
          value={`${profitMargin.toFixed(1)}%`}
          icon={DollarSign}
          color="indigo"
          trend={profitMargin >= 10 ? 'up' : 'neutral'}
          progress={Math.min(100, Math.max(0, profitMargin))}
          description="net of costs"
        />
        <MetricCard
          title="Efficiency Score"
          value={`${efficiency.toFixed(1)}%`}
          icon={Activity}
          color="blue"
          trend={efficiency >= 70 ? 'up' : 'neutral'}
          progress={Math.min(100, Math.max(0, efficiency))}
          description="operational efficiency"
        />
        <MetricCard
          title="Inventory Turnover"
          value={`${turnover.toFixed(1)}x`}
          icon={Package}
          color="orange"
          trend={turnover >= 4 ? 'up' : 'neutral'}
          progress={Math.min(100, Math.max(0, turnover * 10))}
          description="stock cycles"
        />
      </SimpleGrid>

      <Tabs defaultValue="overview">
        <Tabs.List style={{ borderBottom: '1px solid var(--echo-border)' }}>
          <Tabs.Tab value="overview"     leftSection={<Activity size={14} />}     fw={700}>Overview</Tabs.Tab>
          <Tabs.Tab value="performance"  leftSection={<BarChartIcon size={14} />} fw={700}>Performance</Tabs.Tab>
          <Tabs.Tab value="radar"        leftSection={<Target size={14} />}       fw={700}>Market Radar</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="lg">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper className="block-card" p="lg">
              <Group mb="lg" gap="sm">
                <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-accent-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} color="var(--echo-accent)" />
                </Box>
                <Title order={4} fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Revenue vs Profit</Title>
              </Group>
              <Box h={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--echo-border)" />
                    <XAxis dataKey="period" tick={axisTickStyle} axisLine={axisLineStyle} />
                    <YAxis yAxisId="left"  tick={axisTickStyle} axisLine={axisLineStyle} />
                    <YAxis yAxisId="right" orientation="right" tick={axisTickStyle} axisLine={axisLineStyle} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string) => formatCurrency(Number(v || 0))} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="var(--accent-blue)"  name="Revenue"    radius={0} />
                    <Bar yAxisId="left" dataKey="profit"  fill="var(--accent-teal)"  name="Profit"     radius={0} />
                    <Line yAxisId="right" type="step" dataKey="efficiency" stroke="var(--echo-warning)" strokeWidth={3} name="Efficiency %" dot={{ r: 4, fill: 'var(--echo-warning)', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper className="block-card" p="lg">
              <Group mb="lg" gap="sm">
                <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-info-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={16} color="var(--echo-info)" />
                </Box>
                <Title order={4} fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Category Radar</Title>
              </Group>
              <Box h={320}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={biData?.category_performance?.categories?.slice(0, 5) || []}>
                    <PolarGrid stroke="var(--echo-border)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--echo-text-2)', fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fill: 'var(--echo-text-3)', fontSize: 10 }} />
                    <Radar name="Revenue" dataKey="total_revenue" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.5} />
                    <Radar name="Units"   dataKey="total_quantity" stroke="var(--accent-teal)"  fill="var(--accent-teal)"  fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="performance" pt="lg">
          <Paper className="block-card" p="lg">
            <Group mb="xl" gap="sm">
              <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-success-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} color="var(--echo-success)" />
              </Box>
              <Title order={4} fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Business Health Indicators</Title>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
              <Stack align="center" gap="sm">
                <Text fw={800} size="xl" style={{ color: 'var(--echo-text)' }}>{profitMargin.toFixed(1)}%</Text>
                <Text size="sm" fw={700} style={{ color: 'var(--echo-text-3)' }}>Profit Margin</Text>
                <Progress value={Math.min(100, Math.max(0, profitMargin))} w="100%" color="indigo" size="md" />
              </Stack>
              <Stack align="center" gap="sm">
                <Text fw={800} size="xl" style={{ color: 'var(--echo-text)' }}>{efficiency.toFixed(1)}%</Text>
                <Text size="sm" fw={700} style={{ color: 'var(--echo-text-3)' }}>Efficiency Score</Text>
                <Progress value={Math.min(100, Math.max(0, efficiency))} w="100%" color="blue" size="md" />
              </Stack>
              <Stack align="center" gap="sm">
                <Text fw={800} size="xl" style={{ color: 'var(--echo-text)' }}>{revenueGrowth.toFixed(1)}%</Text>
                <Text size="sm" fw={700} style={{ color: 'var(--echo-text-3)' }}>Revenue Growth</Text>
                <Progress value={Math.min(100, Math.max(0, revenueGrowth + 50))} w="100%" color="teal" size="md" />
              </Stack>
            </SimpleGrid>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="radar" pt="lg">
          <Paper className="block-card" p="lg">
            <Group mb="lg" gap="sm">
              <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-info-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={16} color="var(--echo-info)" />
              </Box>
              <Title order={4} fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>Market Radar</Title>
            </Group>
            <Box h={400}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={biData?.category_performance?.categories || []}>
                  <PolarGrid stroke="var(--echo-border)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: 'var(--echo-text-2)', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: 'var(--echo-text-3)', fontSize: 10 }} />
                  <Radar name="Revenue"      dataKey="total_revenue"      stroke="var(--accent-blue)"  fill="var(--accent-blue)"  fillOpacity={0.5} />
                  <Radar name="Transactions" dataKey="total_transactions" stroke="var(--accent-teal)"  fill="var(--accent-teal)"  fillOpacity={0.3} />
                  <Radar name="Avg Price"    dataKey="avg_price"          stroke="var(--echo-warning)" fill="var(--echo-warning)" fillOpacity={0.2} />
                  <Legend />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

export default ERP;
