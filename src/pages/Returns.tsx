import React, { useState, useMemo } from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import { useFetch, returnsApi } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Button,
  Badge,
  TextInput,
  Textarea,
  Group,
  Text,
  SimpleGrid,
  Stack,
  Container,
  Table,
  Modal,
  Select,
  NumberInput,
  Paper,
  Box,
  Pagination,
  Menu,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import { Plus, Eye, MoreVertical, RotateCcw, DollarSign, Search, ArrowRight } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ReturnCreateSchema,
  ReturnStatusUpdateSchema,
  type ReturnCreate,
  type ReturnStatusUpdate,
} from "@/lib/schemas";
import { toast } from "../components/Toast";
import type { Return, Product, ReturnStatus, ReturnAction } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: "orange",
  approved: "blue",
  rejected: "red",
  resolved: "teal",
};

const ACTION_COLORS: Record<ReturnAction, string> = {
  refund: "blue",
  exchange: "violet",
  repair: "orange",
  replacement: "teal",
};

function StatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <Badge color={STATUS_COLORS[status]} variant="outline" fw={700}>
      {status.toUpperCase()}
    </Badge>
  );
}

function ActionBadge({ action }: { action: ReturnAction }) {
  return (
    <Badge color={ACTION_COLORS[action]} variant="outline" fw={700}>
      {action.toUpperCase()}
    </Badge>
  );
}

// ─── Status Transition Panel ──────────────────────────────────────────────────

function StatusUpdatePanel({
  ret,
  onUpdated,
}: {
  ret: Return;
  onUpdated: () => void;
}) {
  const form = useForm<ReturnStatusUpdate>({
    resolver: zodResolver(ReturnStatusUpdateSchema),
    defaultValues: { new_status: "approved", notes: "" },
  });

  const availableStatuses = (["pending", "approved", "rejected", "resolved"] as ReturnStatus[]).filter(
    (s) => s !== ret.status
  );

  const submit = async (data: ReturnStatusUpdate) => {
    try {
      await returnsApi.updateStatus(ret.id, data);
      toast.success(`Status updated to ${data.new_status}`);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <Stack gap="sm">
        <Controller
          name="new_status"
          control={form.control}
          render={({ field }) => (
            <Select
              label="NEW STATUS"
              data={availableStatuses.map((s) => ({ value: s, label: s.toUpperCase() }))}
              value={field.value}
              onChange={(val) => field.onChange(val as ReturnStatus)}
              className="block-input"
            />
          )}
        />
        <Textarea
          label="NOTES (OPTIONAL)"
          placeholder="Reason for status change..."
          minRows={2}
          {...form.register("notes")}
          className="block-input"
        />
        <Group justify="flex-end">
          <Button
            type="submit"
            className="block-button"
            leftSection={<ArrowRight size={14} />}
            loading={form.formState.isSubmitting}
          >
            UPDATE STATUS
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ─── Return Detail Modal ──────────────────────────────────────────────────────

function ReturnDetailModal({
  ret: initialRet,
  products,
  onClose,
  onMutated,
}: {
  ret: Return;
  products: Product[];
  onClose: () => void;
  onMutated: () => void;
}) {
  const [ret, setRet] = useState<Return>(initialRet);

  const refresh = async () => {
    try {
      const updated = await returnsApi.get(ret.id);
      setRet(updated);
      onMutated();
    } catch {
      // stay open with stale data
    }
  };

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  const productName = ret.product?.name ?? productMap[ret.product_id]?.name ?? ret.product_id.slice(0, 8);
  const replacementName = ret.replacement_product_id
    ? (productMap[ret.replacement_product_id]?.name ?? ret.replacement_product_id.slice(0, 8))
    : null;

  return (
    <Modal opened onClose={onClose} title="Return Details" size="lg">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" color="dimmed" fw={700}>Customer</Text>
          <Text size="sm" fw={800}>{ret.customer_name}</Text>
        </Group>
        <Divider />
        <Group justify="space-between">
          <Text size="sm" color="dimmed" fw={700}>Phone</Text>
          <Text size="sm" fw={700}>{ret.customer_phone}</Text>
        </Group>
        {ret.customer_email && (
          <>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Email</Text>
              <Text size="sm" fw={700}>{ret.customer_email}</Text>
            </Group>
          </>
        )}
        <Divider />
        <Group justify="space-between">
          <Text size="sm" color="dimmed" fw={700}>Product</Text>
          <Text size="sm" fw={800}>{productName}</Text>
        </Group>
        <Divider />
        <Group justify="space-between">
          <Text size="sm" color="dimmed" fw={700}>Action</Text>
          <ActionBadge action={ret.action_taken} />
        </Group>
        {replacementName && (
          <>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Replacement Product</Text>
              <Text size="sm" fw={800}>{replacementName}</Text>
            </Group>
          </>
        )}
        <Divider />
        <Group justify="space-between">
          <Text size="sm" color="dimmed" fw={700}>Status</Text>
          <StatusBadge status={ret.status} />
        </Group>
        {ret.refund_amount !== undefined && ret.refund_amount > 0 && (
          <>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Refund Amount</Text>
              <Text size="sm" fw={800}>{formatCurrency(ret.refund_amount)}</Text>
            </Group>
          </>
        )}
        <Divider />
        <Group justify="space-between">
          <Text size="sm" color="dimmed" fw={700}>Return Date</Text>
          <Text size="sm" fw={700}>{new Date(ret.return_date).toLocaleDateString()}</Text>
        </Group>
        {ret.reason && (
          <>
            <Divider />
            <Stack gap={2}>
              <Text size="sm" color="dimmed" fw={700}>Reason</Text>
              <Text size="sm" fw={600}>{ret.reason}</Text>
            </Stack>
          </>
        )}
        {ret.notes && (
          <>
            <Divider />
            <Stack gap={2}>
              <Text size="sm" color="dimmed" fw={700}>Notes</Text>
              <Text size="sm" fw={600}>{ret.notes}</Text>
            </Stack>
          </>
        )}

        {ret.status !== "resolved" && ret.status !== "rejected" && (
          <>
            <Divider mt="md" label="UPDATE STATUS" labelPosition="left" fw={700} />
            <StatusUpdatePanel ret={ret} onUpdated={refresh} />
          </>
        )}
      </Stack>
    </Modal>
  );
}

// ─── Create Return Modal ──────────────────────────────────────────────────────

function CreateReturnModal({
  products,
  onClose,
  onCreated,
}: {
  products: Product[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const form = useForm<ReturnCreate>({
    resolver: zodResolver(ReturnCreateSchema),
    defaultValues: {
      product_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      reason: "",
      action_taken: "refund",
      return_date: new Date().toISOString().split("T")[0],
      refund_amount: 0,
      replacement_product_id: null,
      notes: "",
    },
  });

  const actionTaken = form.watch("action_taken");
  const needsReplacement = actionTaken === "exchange" || actionTaken === "replacement";

  const submit = async (data: ReturnCreate) => {
    try {
      const payload = {
        ...data,
        customer_email: data.customer_email === "" ? null : data.customer_email,
        notes: data.notes === "" ? null : data.notes,
        replacement_product_id: needsReplacement ? data.replacement_product_id : null,
      };
      await returnsApi.create(payload);
      toast.success("Return created — stock adjusted automatically");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create return");
    }
  };

  return (
    <Modal opened onClose={onClose} title="New Return" size="lg">
      <form onSubmit={form.handleSubmit(submit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="CUSTOMER NAME"
              placeholder="John Doe"
              required
              {...form.register("customer_name")}
              error={form.formState.errors.customer_name?.message}
              className="block-input"
            />
            <TextInput
              label="PHONE NUMBER"
              placeholder="080..."
              required
              {...form.register("customer_phone")}
              error={form.formState.errors.customer_phone?.message}
              className="block-input"
            />
          </Group>
          <TextInput
            label="EMAIL (OPTIONAL)"
            placeholder="john@example.com"
            {...form.register("customer_email")}
            className="block-input"
          />

          <Controller
            name="product_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Select
                label="RETURNED PRODUCT"
                placeholder="Select product..."
                required
                searchable
                data={products.map((p) => ({ value: p.id, label: p.name }))}
                value={field.value || null}
                onChange={(val) => field.onChange(val ?? "")}
                error={fieldState.error?.message}
                className="block-input"
              />
            )}
          />

          <Textarea
            label="REASON FOR RETURN"
            placeholder="Describe the issue..."
            required
            minRows={3}
            {...form.register("reason")}
            error={form.formState.errors.reason?.message}
            className="block-input"
          />

          <Group grow align="flex-start">
            <Controller
              name="action_taken"
              control={form.control}
              render={({ field }) => (
                <Select
                  label="ACTION TAKEN"
                  data={[
                    { value: "refund", label: "REFUND" },
                    { value: "repair", label: "REPAIR" },
                    { value: "exchange", label: "EXCHANGE" },
                    { value: "replacement", label: "REPLACEMENT" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  className="block-input"
                />
              )}
            />
            <Controller
              name="refund_amount"
              control={form.control}
              render={({ field }) => (
                <NumberInput
                  label="REFUND AMOUNT"
                  min={0}
                  decimalScale={2}
                  leftSection={CURRENCY_SYMBOL}
                  value={field.value}
                  onChange={(val) => field.onChange(Number(val))}
                  className="block-input"
                />
              )}
            />
          </Group>

          {needsReplacement && (
            <Controller
              name="replacement_product_id"
              control={form.control}
              render={({ field, fieldState }) => (
                <Select
                  label="REPLACEMENT PRODUCT"
                  placeholder="Select replacement..."
                  required
                  searchable
                  data={products.map((p) => ({
                    value: p.id,
                    label: `${p.name} — Stock: ${p.current_stock}`,
                    disabled: p.current_stock === 0,
                  }))}
                  value={field.value ?? null}
                  onChange={(val) => field.onChange(val ?? null)}
                  error={fieldState.error?.message}
                  className="block-input"
                />
              )}
            />
          )}

          <Controller
            name="return_date"
            control={form.control}
            render={({ field }) => (
              <DateInput
                label="RETURN DATE"
                placeholder="Pick date"
                value={field.value || null}
                onChange={(val: string | null) => {
                  field.onChange(val ?? new Date().toISOString().split("T")[0]);
                }}
                className="block-input"
              />
            )}
          />

          <Textarea
            label="NOTES"
            placeholder="Additional notes..."
            minRows={2}
            {...form.register("notes")}
            className="block-input"
          />

          <Group justify="flex-end" mt="xl">
            <Button
              variant="light"
              color="gray"
              onClick={onClose}
            >
              CANCEL
            </Button>
            <Button type="submit" className="block-button" loading={form.formState.isSubmitting}>
              CREATE RETURN
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Returns() {
  const { user } = useAuth();
  const { data: returnsData, loading, error, refetch } = useFetch<Return[]>("/api/returns");
  const { data: productsData } = useFetch<Product[]>("/api/products?limit=1000");
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setPage] = useState(1);
  const itemsPerPage = 10;

  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "view"; ret: Return }
    | null
  >(null);

  const returns = returnsData ?? [];
  const products = productsData ?? [];

  const filteredReturns = useMemo(
    () =>
      returns.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.reason.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [returns, searchTerm]
  );

  const paginatedReturns = filteredReturns.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const totalRefunds = returns.reduce((s, r) => s + (r.refund_amount ?? 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReturns = returns.filter(r => r.return_date === todayStr || r.created_at?.startsWith(todayStr));
  const pendingReturns = returns.filter(r => r.status === 'pending').length;
  const resolvedReturns = returns.filter(r => r.status === 'resolved').length;

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  if (loading && !returnsData) return <LoadingState message="Loading return records..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Returns"
        description="Manage product returns and refunds"
        showRefresh
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetch)}
      >
        <Button onClick={() => setModal({ type: "create" })} leftSection={<Plus size={16} />}>
          New Return
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        {isManager ? (
          <>
            <Paper className="block-card" p="md">
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                    TOTAL RETURNS
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {returns.length}
                  </Text>
                </Stack>
                <RotateCcw size={24} color="black" />
              </Group>
            </Paper>
            <Paper className="block-card" p="md">
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                    TOTAL REFUNDS
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {formatCurrency(totalRefunds)}
                  </Text>
                </Stack>
                <DollarSign size={24} color="black" />
              </Group>
            </Paper>
            <Paper className="block-card" p="md">
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                    PENDING
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {pendingReturns}
                  </Text>
                </Stack>
                <RotateCcw size={24} color="black" />
              </Group>
            </Paper>
          </>
        ) : (
          <>
            <Paper className="block-card" p="md">
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                    TODAY'S RETURNS
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {todayReturns.length}
                  </Text>
                </Stack>
                <RotateCcw size={24} color="black" />
              </Group>
            </Paper>
            <Paper className="block-card" p="md">
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                    PENDING
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {pendingReturns}
                  </Text>
                </Stack>
                <RotateCcw size={24} color="black" />
              </Group>
            </Paper>
            <Paper className="block-card" p="md">
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                    RESOLVED
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                    {resolvedReturns}
                  </Text>
                </Stack>
                <RotateCcw size={24} color="black" />
              </Group>
            </Paper>
          </>
        )}
      </SimpleGrid>

      {/* Table */}
      <Paper className="block-card" p={0} style={{ overflow: "hidden" }}>
        <Box p="md" style={{ borderBottom: '1px solid var(--echo-border)' }}>
          <TextInput
            placeholder="Search by customer or reason..."
            leftSection={<Search size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: 400 }}
            className="block-input"
          />
        </Box>

        <Table verticalSpacing="sm" style={{ borderCollapse: "collapse" }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Customer</Table.Th>
              <Table.Th>Product</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Refund</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedReturns.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text size="sm" color="dimmed" fw={600} ta="center" py="xl">
                    No returns found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              paginatedReturns.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={800}>{item.customer_name}</Text>
                    <Text size="xs" color="dimmed" fw={500}>{item.customer_phone}</Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={700}>
                      {item.product?.name ?? productMap[item.product_id]?.name ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <ActionBadge action={item.action_taken} />
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <StatusBadge status={item.status} />
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={800}>{formatCurrency(item.refund_amount ?? 0)}</Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={500}>
                      {new Date(item.return_date).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="dark">
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<Eye size={14} />}
                          onClick={() => setModal({ type: "view", ret: item })}
                          fw={700}
                        >
                          View / Update Status
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {totalPages > 1 && (
          <Box p="md">
            <Pagination total={totalPages} value={activePage} onChange={setPage} />
          </Box>
        )}
      </Paper>

      {/* Modals */}
      {modal?.type === "create" && (
        <CreateReturnModal
          products={products}
          onClose={() => setModal(null)}
          onCreated={refetch}
        />
      )}
      {modal?.type === "view" && (
        <ReturnDetailModal
          ret={modal.ret}
          products={products}
          onClose={() => setModal(null)}
          onMutated={refetch}
        />
      )}
    </Container>
  );
}
