import React from "react";
import { useFetch } from "@/lib/api";
import {
  Card,
  Button,
  Badge,
  Group,
  Text,
  SimpleGrid,
  Stack,
  Container,
  Box,
  Table,
} from "@mantine/core";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { usePageState } from "@/hooks/usePageState";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  Wrench,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  ShoppingCart,
  RotateCcw,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Link } from "react-router";
import type { DashboardStats } from "@/types";

// ─── Technician view ──────────────────────────────────────────────────────────

function TechnicianHome() {
  const { data: repairs, loading, error, refetch } = useFetch<any[]>("/api/repairs?limit=20");
  const { data: lowStock } = useFetch<any[]>("/api/products/low-stock");

  if (loading) return <LoadingState message="Loading your repair queue..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  const pending    = repairs?.filter((r) => r.repair_status === "pending")     ?? [];
  const inProgress = repairs?.filter((r) => r.repair_status === "in_progress") ?? [];
  const completed  = repairs?.filter((r) => r.repair_status === "completed")   ?? [];

  return (
    <Container size="xl" py="xl">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <MetricCard title="Pending"     value={pending.length}    icon={Clock}        color="orange" description="Awaiting action"   />
        <MetricCard title="In Progress" value={inProgress.length} icon={Wrench}       color="blue"   description="Currently active"  />
        <MetricCard title="Completed"   value={completed.length}  icon={CheckCircle}  color="teal"   description="All time"          />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
        <Card className="block-card" padding="lg">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--echo-radius-sm)',
                  backgroundColor: 'rgba(var(--echo-warning-rgb), 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} color="var(--echo-warning)" />
              </Box>
              <Text fw={600} style={{ color: 'var(--echo-text)' }}>Pending Queue</Text>
            </Group>
            <Button size="xs" variant="light" color="gray" component={Link} to="/repairs" rightSection={<ArrowRight size={13} />}>
              View All
            </Button>
          </Group>

          {pending.length ? (
            <Stack gap="xs">
              {pending.slice(0, 6).map((r: any) => (
                <Box
                  key={r.id}
                  p="sm"
                  style={{
                    borderRadius: 'var(--echo-radius-sm)',
                    backgroundColor: 'var(--echo-surface-2)',
                    border: '1px solid var(--echo-border)',
                  }}
                >
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={600} style={{ color: 'var(--echo-text)' }}>{r.customer_name}</Text>
                      <Text size="xs" style={{ color: 'var(--echo-text-3)' }}>{r.phone_model}</Text>
                    </div>
                    <Badge color="orange" variant="light">pending</Badge>
                  </Group>
                </Box>
              ))}
            </Stack>
          ) : (
            <Text size="sm" fw={500} style={{ color: 'var(--echo-text-2)' }}>No pending repairs — great job!</Text>
          )}
        </Card>

        <Stack gap="lg">
          <Card className="block-card" padding="lg">
            <Group mb="md" gap="sm">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--echo-radius-sm)',
                  backgroundColor: 'rgba(var(--echo-warning-rgb), 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={16} color="var(--echo-warning)" />
              </Box>
              <Text fw={600} style={{ color: 'var(--echo-text)' }}>Low Stock Parts</Text>
            </Group>
            {lowStock?.length ? (
              <Stack gap="xs">
                <Text size="sm" style={{ color: 'var(--echo-text-2)' }}>{lowStock.length} parts are running low</Text>
                <Button size="xs" variant="light" color="gray" component={Link} to="/products" rightSection={<ArrowRight size={13} />}>
                  View Inventory
                </Button>
              </Stack>
            ) : (
              <Text size="sm" fw={500} style={{ color: 'var(--echo-text-2)' }}>All parts well stocked</Text>
            )}
          </Card>

          <Card className="block-card" padding="lg">
            <Text fw={600} mb="md" style={{ color: 'var(--echo-text)' }}>Quick Actions</Text>
            <Stack gap="sm">
              <Button component={Link} to="/repairs" color="indigo" leftSection={<Plus size={16} />} fullWidth>
                New Repair Job
              </Button>
              <Button component={Link} to="/products" variant="light" color="gray" leftSection={<Package size={16} />} fullWidth>
                Parts Inventory
              </Button>
            </Stack>
          </Card>
        </Stack>
      </SimpleGrid>
    </Container>
  );
}

// ─── Cashier view ─────────────────────────────────────────────────────────────

function CashierHome() {
  const { data: recentSales, loading, error, refetch } = useFetch<any[]>("/api/sales?limit=10");

  if (loading) return <LoadingState message="Loading your sales data..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  const _d = new Date();
  const todayLocalStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
  const todaySales = recentSales?.filter((s: any) => s.sale_date === todayLocalStr) ?? [];
  const todayRevenue      = todaySales.reduce((sum: number, s: any) => sum + (s.total_amount ?? 0), 0);
  const pendingPayments   = recentSales?.filter((s: any) => s.payment_status !== "paid") ?? [];

  return (
    <Container size="xl" py="xl">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <MetricCard title="Today's Sales"     value={todaySales.length}          icon={ShoppingCart} color="blue"   description="Transactions today"      />
        <MetricCard title="Today's Revenue"   value={formatCurrency(todayRevenue)} icon={TrendingUp}   color="teal"   description="From completed sales"    />
        <MetricCard title="Pending Payments"  value={pendingPayments.length}     icon={Clock}        color="orange" description="Awaiting payment"         />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
        <Card className="block-card" padding="lg">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--echo-radius-sm)',
                  backgroundColor: 'rgba(var(--echo-info-rgb), 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShoppingCart size={16} color="var(--echo-info)" />
              </Box>
              <Text fw={600} style={{ color: 'var(--echo-text)' }}>Recent Sales</Text>
            </Group>
            <Button size="xs" variant="light" color="gray" component={Link} to="/sales" rightSection={<ArrowRight size={13} />}>
              View All
            </Button>
          </Group>

          {recentSales?.length ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Amount</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recentSales.slice(0, 6).map((s: any) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{s.customer_name || "Walk-in"}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={700} style={{ color: 'var(--echo-text)' }}>{formatCurrency(s.total_amount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={s.payment_status === "paid" ? "teal" : "orange"} variant="light">
                        {s.payment_status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text size="sm" style={{ color: 'var(--echo-text-2)' }}>No sales recorded yet.</Text>
          )}
        </Card>

        <Card className="block-card" padding="lg">
          <Text fw={600} mb="md" style={{ color: 'var(--echo-text)' }}>Quick Actions</Text>
          <Stack gap="sm">
            <Button component={Link} to="/sales"    color="indigo"      leftSection={<Plus size={16} />}      fullWidth>New Sale</Button>
            <Button component={Link} to="/returns"  variant="light" color="gray" leftSection={<RotateCcw size={16} />}  fullWidth>Process Return</Button>
            <Button component={Link} to="/products" variant="light" color="gray" leftSection={<Package size={16} />}    fullWidth>Browse Products</Button>
          </Stack>
        </Card>
      </SimpleGrid>
    </Container>
  );
}

// ─── Manager / Admin view ─────────────────────────────────────────────────────

function ManagerHome({ isAdmin }: { isAdmin: boolean }) {
  const { data: stats, loading, error, refetch } = useFetch<DashboardStats>("/api/analytics/dashboard/stats");

  if (loading) return <LoadingState message="Loading business overview..." />;
  if (error) return <ErrorDisplay title="Error Loading Dashboard" message={error.message} onRetry={refetch} />;
  if (!stats) return null;

  return (
    <Container size="xl" py="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <MetricCard title="Total Products"     value={stats.total_products}                   icon={Package}    color="blue"   description={`${stats.low_stock_products} low stock`}               />
        <MetricCard title="Active Repairs"     value={stats.total_repairs}                    icon={Wrench}     color="teal"   description={`${stats.pending_repairs} pending`}                    />
        <MetricCard title="Monthly Revenue"    value={formatCurrency(stats.monthly_revenue)}  icon={TrendingUp} color="indigo" description={`${formatCurrency(stats.monthly_profit)} profit`}      />
        <MetricCard title="Total Transactions" value={stats.total_transactions}               icon={DollarSign} color="indigo" description={`${formatCurrency(stats.total_expenses)} expenses`}    />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
        <Card className="block-card" padding="lg">
          <Group justify="space-between" mb="xs">
            <Group gap="sm">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--echo-radius-sm)',
                  backgroundColor: 'rgba(var(--echo-warning-rgb), 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={16} color="var(--echo-warning)" />
              </Box>
              <Text fw={600} style={{ color: 'var(--echo-text)' }}>Low Stock Alerts</Text>
            </Group>
          </Group>
          <Text size="sm" mb="md" style={{ color: 'var(--echo-text-3)' }}>Products that need restocking</Text>
          {stats.low_stock_products ? (
            <Stack gap="xs">
              <Text size="sm" style={{ color: 'var(--echo-text-2)' }}>{stats.low_stock_products} products running low</Text>
              <Button size="xs" variant="light" color="gray" component={Link} to="/products" rightSection={<ArrowRight size={13} />}>
                View Products
              </Button>
            </Stack>
          ) : (
            <Text size="sm" fw={500} style={{ color: 'var(--echo-success)' }}>All products well stocked</Text>
          )}
        </Card>

        <Card className="block-card" padding="lg">
          <Group justify="space-between" mb="xs">
            <Group gap="sm">
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--echo-radius-sm)',
                  backgroundColor: 'rgba(var(--echo-info-rgb), 0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} color="var(--echo-info)" />
              </Box>
              <Text fw={600} style={{ color: 'var(--echo-text)' }}>Pending Repairs</Text>
            </Group>
          </Group>
          <Text size="sm" mb="md" style={{ color: 'var(--echo-text-3)' }}>Repairs awaiting completion</Text>
          {stats.pending_repairs ? (
            <Stack gap="xs">
              <Text size="sm" style={{ color: 'var(--echo-text-2)' }}>{stats.pending_repairs} repairs in progress</Text>
              <Button size="xs" variant="light" color="gray" component={Link} to="/repairs" rightSection={<ArrowRight size={13} />}>
                View Repairs
              </Button>
            </Stack>
          ) : (
            <Text size="sm" fw={500} style={{ color: 'var(--echo-success)' }}>No pending repairs</Text>
          )}
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: isAdmin ? 3 : 2 }} spacing="lg">
        <Card className="block-card" padding="lg">
          <Group mb="sm" gap="sm">
            <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-info-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} color="var(--echo-info)" />
            </Box>
            <Text fw={600} style={{ color: 'var(--echo-text)' }}>Inventory</Text>
          </Group>
          <Text size="sm" mb="md" style={{ color: 'var(--echo-text-3)' }}>Manage stock and categories.</Text>
          <Button variant="light" color="indigo" fullWidth component={Link} to="/products">Manage Products</Button>
        </Card>

        <Card className="block-card" padding="lg">
          <Group mb="sm" gap="sm">
            <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-accent-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="var(--echo-accent)" />
            </Box>
            <Text fw={600} style={{ color: 'var(--echo-text)' }}>Analytics</Text>
          </Group>
          <Text size="sm" mb="md" style={{ color: 'var(--echo-text-3)' }}>Revenue, profit, and performance.</Text>
          <Button variant="light" color="indigo" fullWidth component={Link} to="/analytics">View Analytics</Button>
        </Card>

        {isAdmin && (
          <Card className="block-card" padding="lg">
            <Group mb="sm" gap="sm">
              <Box style={{ width: 32, height: 32, borderRadius: 'var(--echo-radius-sm)', backgroundColor: 'rgba(var(--echo-success-rgb), 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={16} color="var(--echo-success)" />
              </Box>
              <Text fw={600} style={{ color: 'var(--echo-text)' }}>ERP</Text>
            </Group>
            <Text size="sm" mb="md" style={{ color: 'var(--echo-text-3)' }}>Business intelligence and strategy.</Text>
            <Button variant="light" color="indigo" fullWidth component={Link} to="/erp">Open ERP</Button>
          </Card>
        )}
      </SimpleGrid>
    </Container>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  const { isRefreshing, handleRefresh } = usePageState();

  const role = user?.role;

  const roleLabel: Record<string, string> = {
    admin:      'Admin Console',
    manager:    'Manager Overview',
    technician: 'Repair Workshop',
    cashier:    'Sales Station',
  };

  const roleDesc: Record<string, string> = {
    admin:      'Full business overview and system control.',
    manager:    "Your store's performance at a glance.",
    technician: 'Your repair queue and parts inventory.',
    cashier:    'Your sales station and transaction history.',
  };

  const roleColor: Record<string, string> = {
    admin: 'violet', manager: 'blue', technician: 'teal', cashier: 'green',
  };

  return (
    <>
      <Container size="xl" pt="xl" pb={0}>
        <PageHeader
          title={`Welcome back, ${user?.full_name || user?.username}`}
          description={roleDesc[role ?? ''] ?? ''}
          showRefresh
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        >
          <Badge color={roleColor[role ?? ''] ?? 'indigo'} variant="light" size="lg">
            {roleLabel[role ?? ''] ?? role}
          </Badge>
        </PageHeader>
      </Container>

      {role === 'technician' && <TechnicianHome />}
      {role === 'cashier'    && <CashierHome />}
      {(role === 'manager' || role === 'admin') && <ManagerHome isAdmin={role === 'admin'} />}
    </>
  );
}
