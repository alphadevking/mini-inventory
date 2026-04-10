import React, { useState, useMemo } from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import { useFetch, repairsApi, apiRequest } from "@/lib/api";
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
  Tabs,
  Divider,
  Timeline,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import {
  Plus,
  Eye,
  MoreVertical,
  Wrench,
  Clock,
  CheckCircle,
  Search,
  DollarSign,
  Trash2,
  Package,
  ArrowRight,
} from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RepairCreateSchema,
  RepairUpdateSchema,
  RepairStatusTransitionSchema,
  AddRepairPartSchema,
  type RepairCreate,
  type RepairUpdate,
  type RepairStatusTransition,
  type AddRepairPart,
} from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import { toast } from "../components/Toast";
import type { Repair, Product, RepairStatus } from "@/types";

// ─── Allowed status transitions ───────────────────────────────────────────────

const NEXT_STATUSES: Record<RepairStatus, RepairStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<RepairStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<RepairStatus, string> = {
  pending: "orange",
  in_progress: "blue",
  completed: "teal",
  cancelled: "gray",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RepairStatus }) {
  return (
    <Badge color={STATUS_COLORS[status]} variant="outline" fw={700}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const color = status === "paid" ? "teal" : status === "partial" ? "orange" : "red";
  return (
    <Badge color={color} variant="outline" fw={700}>
      {status.toUpperCase()}
    </Badge>
  );
}

// ─── Status Transition Panel ──────────────────────────────────────────────────

function StatusTransitionPanel({
  repair,
  onTransitioned,
}: {
  repair: Repair;
  onTransitioned: () => void;
}) {
  const nextStatuses = NEXT_STATUSES[repair.repair_status];
  const form = useForm<RepairStatusTransition>({
    resolver: zodResolver(RepairStatusTransitionSchema),
    defaultValues: { new_status: nextStatuses[0], notes: "", expected_version: repair.version },
  });

  const submit = async (data: RepairStatusTransition) => {
    try {
      await repairsApi.transitionStatus(repair.id, { ...data, expected_version: repair.version });
      toast.success(`Status updated to ${STATUS_LABELS[data.new_status]}`);
      onTransitioned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transition status");
    }
  };

  if (nextStatuses.length === 0) {
    return (
      <Text size="sm" color="dimmed" fw={600}>
        No further transitions available for this repair.
      </Text>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <Stack gap="sm">
        <Controller
          name="new_status"
          control={form.control}
          render={({ field }) => (
            <Select
              label="MOVE TO STATUS"
              data={nextStatuses.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
              value={field.value}
              onChange={(val) => field.onChange(val as RepairStatus)}
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
            TRANSITION
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ─── Add Part Panel ───────────────────────────────────────────────────────────

function AddPartPanel({
  repair,
  products,
  onPartAdded,
}: {
  repair: Repair;
  products: Product[];
  onPartAdded: () => void;
}) {
  const form = useForm<AddRepairPart>({
    resolver: zodResolver(AddRepairPartSchema),
    defaultValues: { product_id: "", quantity_used: 1 },
  });

  const submit = async (data: AddRepairPart) => {
    try {
      await repairsApi.addPart(repair.id, data);
      toast.success("Part added and stock deducted");
      form.reset({ product_id: "", quantity_used: 1 });
      onPartAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add part");
    }
  };

  const inStockProducts = products.filter((p) => p.current_stock > 0 && p.is_active);

  return (
    <form onSubmit={form.handleSubmit(submit)}>
      <Stack gap="sm">
        <Controller
          name="product_id"
          control={form.control}
          render={({ field, fieldState }) => (
            <Select
              label="PRODUCT / PART"
              placeholder="Select part..."
              searchable
              data={inStockProducts.map((p) => ({
                value: p.id,
                label: `${p.name} — Stock: ${p.current_stock}`,
              }))}
              value={field.value || null}
              onChange={(val) => field.onChange(val ?? "")}
              error={fieldState.error?.message}
              className="block-input"
            />
          )}
        />
        <Group grow align="flex-end">
          <Controller
            name="quantity_used"
            control={form.control}
            render={({ field, fieldState }) => (
              <NumberInput
                label="QTY USED"
                min={1}
                value={field.value}
                onChange={(val) => field.onChange(Number(val))}
                error={fieldState.error?.message}
                className="block-input"
              />
            )}
          />
          <Controller
            name="unit_cost_override"
            control={form.control}
            render={({ field }) => (
              <NumberInput
                label="COST OVERRIDE (OPT.)"
                min={0}
                decimalScale={2}
                leftSection={CURRENCY_SYMBOL}
                placeholder="Default: purchase cost"
                value={field.value ?? ""}
                onChange={(val) => field.onChange(val === "" ? undefined : Number(val))}
                className="block-input"
              />
            )}
          />
        </Group>
        <Group justify="flex-end">
          <Button
            type="submit"
            className="block-button"
            leftSection={<Plus size={14} />}
            loading={form.formState.isSubmitting}
          >
            ADD PART
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function RepairDetailModal({
  repair: initialRepair,
  products,
  onClose,
  onMutated,
}: {
  repair: Repair;
  products: Product[];
  onClose: () => void;
  onMutated: () => void;
}) {
  const [repair, setRepair] = useState<Repair>(initialRepair);

  const refresh = async () => {
    try {
      const updated = await repairsApi.get(repair.id);
      setRepair(updated);
      onMutated();
    } catch {
      // ignore — modal stays open with stale data
    }
  };

  const removePart = async (partId: string) => {
    if (!confirm("Remove this part? Stock will be restored.")) return;
    try {
      await repairsApi.removePart(repair.id, partId);
      toast.success("Part removed — stock restored");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove part");
    }
  };

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Repair — ${repair.customer_name}`}
      size="xl"
    >
      <Tabs defaultValue="details">
        <Tabs.List mb="md">
          <Tabs.Tab value="details" fw={700}>Details</Tabs.Tab>
          <Tabs.Tab value="parts" fw={700}>Parts Used ({repair.parts_used?.length ?? 0})</Tabs.Tab>
          <Tabs.Tab value="status" fw={700}>Status History</Tabs.Tab>
          {NEXT_STATUSES[repair.repair_status].length > 0 && (
            <Tabs.Tab value="transition" fw={700}>Transition</Tabs.Tab>
          )}
        </Tabs.List>

        {/* ── Details ── */}
        <Tabs.Panel value="details">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Customer</Text>
              <Text size="sm" fw={800}>{repair.customer_name}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Phone</Text>
              <Text size="sm" fw={700}>{repair.customer_phone}</Text>
            </Group>
            {repair.customer_email && (
              <>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" color="dimmed" fw={700}>Email</Text>
                  <Text size="sm" fw={700}>{repair.customer_email}</Text>
                </Group>
              </>
            )}
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Device</Text>
              <Text size="sm" fw={800}>{repair.phone_model}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Repair Status</Text>
              <StatusBadge status={repair.repair_status} />
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Payment Status</Text>
              <PaymentBadge status={repair.payment_status} />
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Labor Cost</Text>
              <Text size="sm" fw={800}>{formatCurrency(repair.labor_cost)}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Parts Cost</Text>
              <Text size="sm" fw={800}>{formatCurrency(repair.parts_cost)}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Total</Text>
              <Text size="sm" fw={900}>{formatCurrency(repair.total_amount)}</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" color="dimmed" fw={700}>Amount Paid</Text>
              <Text size="sm" fw={800}>{formatCurrency(repair.amount_paid)}</Text>
            </Group>
            {repair.issue_description && (
              <>
                <Divider />
                <Stack gap={2}>
                  <Text size="sm" color="dimmed" fw={700}>Issue</Text>
                  <Text size="sm" fw={600}>{repair.issue_description}</Text>
                </Stack>
              </>
            )}
            {repair.technician_notes && (
              <>
                <Divider />
                <Stack gap={2}>
                  <Text size="sm" color="dimmed" fw={700}>Technician Notes</Text>
                  <Text size="sm" fw={600}>{repair.technician_notes}</Text>
                </Stack>
              </>
            )}
          </Stack>
        </Tabs.Panel>

        {/* ── Parts Used ── */}
        <Tabs.Panel value="parts">
          <Stack gap="md">
            {repair.parts_used && repair.parts_used.length > 0 ? (
              <Table verticalSpacing="sm" style={{ borderCollapse: "collapse" }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Part</Table.Th>
                    <Table.Th>Qty</Table.Th>
                    <Table.Th>Unit Cost</Table.Th>
                    <Table.Th>Total</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {repair.parts_used.map((part) => (
                    <Table.Tr key={part.id}>
                      <Table.Td style={{ borderBottom: "1px solid black" }}>
                        <Text size="sm" fw={700}>
                          {productMap[part.product_id]?.name ?? part.product_id.slice(0, 8)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ borderBottom: "1px solid black" }}>
                        <Text size="sm" fw={700}>{part.quantity_used}</Text>
                      </Table.Td>
                      <Table.Td style={{ borderBottom: "1px solid black" }}>
                        <Text size="sm" fw={700}>{formatCurrency(part.unit_cost)}</Text>
                      </Table.Td>
                      <Table.Td style={{ borderBottom: "1px solid black" }}>
                        <Text size="sm" fw={800}>{formatCurrency(part.total_cost)}</Text>
                      </Table.Td>
                      <Table.Td style={{ borderBottom: "1px solid black" }}>
                        {repair.repair_status !== "completed" && repair.repair_status !== "cancelled" && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => removePart(part.id)}
                            title="Remove part"
                          >
                            <Trash2 size={14} />
                          </ActionIcon>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text size="sm" color="dimmed" fw={600}>No parts added yet.</Text>
            )}

            {repair.repair_status !== "completed" && repair.repair_status !== "cancelled" && (
              <>
                <Divider label="ADD PART" labelPosition="left" fw={700} />
                <AddPartPanel repair={repair} products={products} onPartAdded={refresh} />
              </>
            )}
          </Stack>
        </Tabs.Panel>

        {/* ── Status History ── */}
        <Tabs.Panel value="status">
          {repair.status_log && repair.status_log.length > 0 ? (
            <Timeline active={repair.status_log.length - 1} bulletSize={20} lineWidth={2}>
              {repair.status_log.map((log, i) => (
                <Timeline.Item
                  key={log.id}
                  title={
                    <Text size="sm" fw={800}>
                      {log.from_status
                        ? `${STATUS_LABELS[log.from_status]} → ${STATUS_LABELS[log.to_status]}`
                        : STATUS_LABELS[log.to_status]}
                    </Text>
                  }
                >
                  <Text size="xs" color="dimmed" fw={600}>
                    {new Date(log.timestamp).toLocaleString()}
                    {log.changed_by && ` · ${log.changed_by}`}
                  </Text>
                  {log.notes && (
                    <Text size="xs" fw={600} mt={2}>{log.notes}</Text>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Text size="sm" color="dimmed" fw={600}>No status history available.</Text>
          )}
        </Tabs.Panel>

        {/* ── Transition ── */}
        <Tabs.Panel value="transition">
          <StatusTransitionPanel repair={repair} onTransitioned={refresh} />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}

// ─── Edit Repair Modal ────────────────────────────────────────────────────────

function EditRepairModal({
  repair,
  onClose,
  onSaved,
}: {
  repair: Repair;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<RepairUpdate>({
    resolver: zodResolver(RepairUpdateSchema) as Resolver<RepairUpdate>,
    defaultValues: {
      customer_name: repair.customer_name,
      customer_phone: repair.customer_phone,
      customer_email: repair.customer_email ?? "",
      phone_model: repair.phone_model,
      issue_description: repair.issue_description,
      technician_notes: repair.technician_notes ?? "",
      payment_status: repair.payment_status,
      estimated_completion: repair.estimated_completion?.split("T")[0] ?? "",
      labor_cost: repair.labor_cost,
      amount_paid: repair.amount_paid,
    },
  });

  const laborCost = form.watch("labor_cost") ?? repair.labor_cost;
  const computedTotal = laborCost + (repair.parts_cost ?? 0);

  const submit = async (data: RepairUpdate) => {
    try {
      const payload = {
        ...data,
        customer_email: data.customer_email === "" ? null : data.customer_email,
        estimated_completion: data.estimated_completion === "" ? null : data.estimated_completion,
      };
      await repairsApi.update(repair.id, payload);
      toast.success("Repair updated");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update repair");
    }
  };

  return (
    <Modal opened onClose={onClose} title="Edit Repair" size="lg">
      <form onSubmit={form.handleSubmit(submit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="CUSTOMER NAME"
              required
              {...form.register("customer_name")}
              error={form.formState.errors.customer_name?.message}
              className="block-input"
            />
            <TextInput
              label="PHONE NUMBER"
              required
              {...form.register("customer_phone")}
              error={form.formState.errors.customer_phone?.message}
              className="block-input"
            />
          </Group>
          <Group grow>
            <TextInput label="EMAIL (OPTIONAL)" {...form.register("customer_email")} className="block-input" />
            <TextInput
              label="PHONE MODEL"
              required
              {...form.register("phone_model")}
              error={form.formState.errors.phone_model?.message}
              className="block-input"
            />
          </Group>
          <Textarea
            label="ISSUE DESCRIPTION"
            required
            minRows={3}
            {...form.register("issue_description")}
            error={form.formState.errors.issue_description?.message}
            className="block-input"
          />
          <Group grow align="flex-start">
            <Controller
              name="payment_status"
              control={form.control}
              render={({ field }) => (
                <Select
                  label="PAYMENT STATUS"
                  data={[
                    { value: "pending", label: "PENDING" },
                    { value: "partial", label: "PARTIAL" },
                    { value: "paid", label: "PAID" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  className="block-input"
                />
              )}
            />
            <Controller
              name="estimated_completion"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  label="EST. COMPLETION"
                  placeholder="Pick date"
                  value={field.value || null}
                  onChange={(val: string | null) => {
                    field.onChange(val ?? "");
                  }}
                  className="block-input"
                />
              )}
            />
          </Group>
          <Group grow align="flex-start">
            <Controller
              name="labor_cost"
              control={form.control}
              render={({ field }) => (
                <NumberInput
                  label="LABOR COST"
                  min={0}
                  decimalScale={2}
                  leftSection={CURRENCY_SYMBOL}
                  value={field.value}
                  onChange={(val) => field.onChange(Number(val))}
                  className="block-input"
                />
              )}
            />
            <Stack gap={4}>
              <Text size="xs" fw={800} style={{ letterSpacing: "1px" }}>TOTAL (COMPUTED)</Text>
              <Paper p="sm" style={{ border: '1px solid var(--echo-border)', backgroundColor: 'var(--echo-surface-2)' }}>
                <Text fw={800}>{formatCurrency(computedTotal)}</Text>
                <Text size="xs" c="dimmed" fw={500}>Labor + parts cost</Text>
              </Paper>
            </Stack>
            <Controller
              name="amount_paid"
              control={form.control}
              render={({ field }) => (
                <NumberInput
                  label="AMOUNT PAID"
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
          <Textarea
            label="TECHNICIAN NOTES"
            minRows={2}
            {...form.register("technician_notes")}
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
              UPDATE REPAIR
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ─── Create Repair Modal ──────────────────────────────────────────────────────

function CreateRepairModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const form = useForm<RepairCreate>({
    resolver: zodResolver(RepairCreateSchema) as Resolver<RepairCreate>,
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      phone_model: "",
      issue_description: "",
      technician_notes: "",
      payment_status: "pending",
      date_received: new Date().toISOString().split("T")[0],
      estimated_completion: "",
      labor_cost: 0,
      amount_paid: 0,
    },
  });

  const laborCost = form.watch("labor_cost") || 0;

  const submit = async (data: RepairCreate) => {
    try {
      const payload = {
        ...data,
        customer_email: data.customer_email === "" ? null : data.customer_email,
        estimated_completion: data.estimated_completion === "" ? null : data.estimated_completion,
      };
      await repairsApi.create(payload);
      toast.success("Repair created — status: Pending");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create repair");
    }
  };

  return (
    <Modal opened onClose={onClose} title="New Repair" size="lg">
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
          <Group grow>
            <TextInput label="EMAIL (OPTIONAL)" placeholder="john@example.com" {...form.register("customer_email")} className="block-input" />
            <TextInput
              label="PHONE MODEL"
              placeholder="iPhone 13 Pro"
              required
              {...form.register("phone_model")}
              error={form.formState.errors.phone_model?.message}
              className="block-input"
            />
          </Group>
          <Textarea
            label="ISSUE DESCRIPTION"
            placeholder="Describe the problem..."
            required
            minRows={3}
            {...form.register("issue_description")}
            error={form.formState.errors.issue_description?.message}
            className="block-input"
          />
          <Group grow align="flex-start">
            <Controller
              name="payment_status"
              control={form.control}
              render={({ field }) => (
                <Select
                  label="PAYMENT STATUS"
                  data={[
                    { value: "pending", label: "PENDING" },
                    { value: "partial", label: "PARTIAL" },
                    { value: "paid", label: "PAID" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  className="block-input"
                />
              )}
            />
            <Controller
              name="estimated_completion"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  label="EST. COMPLETION"
                  placeholder="Pick date"
                  value={field.value || null}
                  onChange={(val: string | null) => {
                    field.onChange(val ?? "");
                  }}
                  className="block-input"
                />
              )}
            />
          </Group>
          <Group grow align="flex-start">
            <Controller
              name="labor_cost"
              control={form.control}
              render={({ field }) => (
                <NumberInput
                  label="LABOR COST"
                  min={0}
                  decimalScale={2}
                  leftSection={CURRENCY_SYMBOL}
                  value={field.value}
                  onChange={(val) => field.onChange(Number(val))}
                  className="block-input"
                />
              )}
            />
            <Stack gap={4}>
              <Text size="xs" fw={800} style={{ letterSpacing: "1px" }}>TOTAL (ESTIMATED)</Text>
              <Paper p="sm" style={{ border: '1px solid var(--echo-border)', backgroundColor: 'var(--echo-surface-2)' }}>
                <Text fw={800}>{formatCurrency(laborCost)}</Text>
                <Text size="xs" c="dimmed" fw={500}>Labor only — parts added after</Text>
              </Paper>
            </Stack>
            <Controller
              name="amount_paid"
              control={form.control}
              render={({ field }) => (
                <NumberInput
                  label="AMOUNT PAID"
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
          <Textarea
            label="TECHNICIAN NOTES"
            placeholder="Additional notes..."
            minRows={2}
            {...form.register("technician_notes")}
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
              CREATE REPAIR
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Repairs() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch<Repair[]>("/api/repairs");
  const { data: products } = useFetch<Product[]>("/api/products?limit=1000");
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setPage] = useState(1);
  const itemsPerPage = 10;

  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; repair: Repair }
    | { type: "view"; repair: Repair }
    | null
  >(null);

  const repairs = data ?? [];
  const allProducts = products ?? [];

  const filteredRepairs = useMemo(
    () =>
      repairs.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.phone_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.issue_description.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [repairs, searchTerm]
  );

  const paginatedItems = filteredRepairs.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this repair? This cannot be undone.")) return;
    try {
      await apiRequest(`/api/repairs/${id}`, { method: "DELETE" });
      toast.success("Repair deleted");
      refetch();
    } catch (err) {
      toast.error("Failed to delete repair");
    }
  };

  if (loading && !data) return <LoadingState message="Loading repair records..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Repairs"
        description="Manage customer repairs and service requests"
        showRefresh
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetch)}
      >
        <Button onClick={() => setModal({ type: "create" })} leftSection={<Plus size={16} />}>
          New Repair
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" mb="xl">
        <Paper className="block-card" p="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                PENDING
              </Text>
              <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                {repairs.filter((r) => r.repair_status === "pending").length}
              </Text>
            </Stack>
            <Clock size={24} color="black" />
          </Group>
        </Paper>
        <Paper className="block-card" p="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                IN PROGRESS
              </Text>
              <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                {repairs.filter((r) => r.repair_status === "in_progress").length}
              </Text>
            </Stack>
            <Wrench size={24} color="black" />
          </Group>
        </Paper>
        <Paper className="block-card" p="md">
          <Group justify="space-between">
            <Stack gap={0}>
              <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                COMPLETED
              </Text>
              <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                {repairs.filter((r) => r.repair_status === "completed").length}
              </Text>
            </Stack>
            <CheckCircle size={24} color="black" />
          </Group>
        </Paper>
        {(user?.role === 'manager' || user?.role === 'admin') ? (
          <Paper className="block-card" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                  TOTAL REVENUE
                </Text>
                <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {formatCurrency(repairs.reduce((s, r) => s + (r.total_amount ?? 0), 0))}
                </Text>
              </Stack>
              <DollarSign size={24} color="black" />
            </Group>
          </Paper>
        ) : (
          <Paper className="block-card" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: "1px" }}>
                  CANCELLED
                </Text>
                <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {repairs.filter((r) => r.repair_status === "cancelled").length}
                </Text>
              </Stack>
              <DollarSign size={24} color="black" />
            </Group>
          </Paper>
        )}
      </SimpleGrid>

      {/* Table */}
      <Paper className="block-card" p={0} style={{ overflow: "hidden" }}>
        <Box p="md" style={{ borderBottom: '1px solid var(--echo-border)' }}>
          <TextInput
            placeholder="Search repairs..."
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
              <Table.Th>Device</Table.Th>
              <Table.Th>Repair Status</Table.Th>
              <Table.Th>Payment</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Due</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedItems.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text size="sm" color="dimmed" fw={600} ta="center" py="xl">
                    No repairs found
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              paginatedItems.map((repair) => (
                <Table.Tr key={repair.id}>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={800}>{repair.customer_name}</Text>
                    <Text size="xs" color="dimmed" fw={500}>{repair.customer_phone}</Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={700}>{repair.phone_model}</Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <StatusBadge status={repair.repair_status} />
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <PaymentBadge status={repair.payment_status} />
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={800}>{formatCurrency(repair.total_amount)}</Text>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: "1px solid black" }}>
                    <Text size="sm" fw={700}>
                      {repair.estimated_completion
                        ? new Date(repair.estimated_completion).toLocaleDateString()
                        : "—"}
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
                          onClick={() => setModal({ type: "view", repair })}
                          fw={700}
                        >
                          View / Manage
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<Package size={14} />}
                          onClick={() => setModal({ type: "edit", repair })}
                          fw={700}
                        >
                          Edit Details
                        </Menu.Item>
                        {user?.role === "admin" && (
                          <Menu.Item
                            color="red"
                            leftSection={<Trash2 size={14} />}
                            onClick={() => handleDelete(repair.id)}
                            fw={700}
                          >
                            Delete
                          </Menu.Item>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {totalPages > 1 && (
          <Group justify="center" p="md">
            <Pagination total={totalPages} value={activePage} onChange={setPage} />
          </Group>
        )}
      </Paper>

      {/* Modals */}
      {modal?.type === "create" && (
        <CreateRepairModal
          onClose={() => setModal(null)}
          onCreated={refetch}
        />
      )}
      {modal?.type === "edit" && (
        <EditRepairModal
          repair={modal.repair}
          onClose={() => setModal(null)}
          onSaved={refetch}
        />
      )}
      {modal?.type === "view" && (
        <RepairDetailModal
          repair={modal.repair}
          products={allProducts}
          onClose={() => setModal(null)}
          onMutated={refetch}
        />
      )}
    </Container>
  );
}
