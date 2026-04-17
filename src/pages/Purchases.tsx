import React, { useState, useEffect } from "react";
import { CURRENCY_SYMBOL } from "../config/app";
import { useForm, useFieldArray, Controller, UseFormReturn, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetch, apiRequest } from "@/lib/api";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import {
  Button,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Table,
  Badge,
  Modal,
  Group,
  Stack,
  SimpleGrid,
  Text,
  ActionIcon,
  Container,
  Paper,
  Divider,
  Box,
  Collapse,
} from "@mantine/core";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Cpu,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "../components/Toast";
import { formatCurrency } from "@/lib/utils";
import {
  PurchaseCreateSchema,
  type PurchaseCreate,
  type PurchaseCreateInput,
} from "@/lib/schemas";
import { Purchase, Product } from "@/types";

// ─── Unit spec sub-form row ───────────────────────────────────────────────────

interface UnitRowProps {
  itemIndex: number;
  unitIndex: number;
  register: UseFormRegister<PurchaseCreateInput>;
  remove: (index: number) => void;
}

function UnitRow({ itemIndex, unitIndex, register, remove }: UnitRowProps) {
  return (
    <SimpleGrid cols={{ base: 2, md: 6 }} spacing="xs" mb={4}>
      <TextInput
        placeholder="Serial number *"
        size="xs"
        {...register(`items.${itemIndex}.units.${unitIndex}.serial_number`)}
      />
      <TextInput
        placeholder="IMEI"
        size="xs"
        {...register(`items.${itemIndex}.units.${unitIndex}.imei`)}
      />
      <TextInput
        placeholder="Color"
        size="xs"
        {...register(`items.${itemIndex}.units.${unitIndex}.color`)}
      />
      <TextInput
        placeholder="Storage"
        size="xs"
        {...register(`items.${itemIndex}.units.${unitIndex}.storage`)}
      />
      <TextInput
        placeholder="Condition"
        size="xs"
        defaultValue="New"
        {...register(`items.${itemIndex}.units.${unitIndex}.condition`)}
      />
      <ActionIcon
        variant="subtle"
        color="red"
        size="sm"
        onClick={() => remove(unitIndex)}
        mt={2}
      >
        <Trash2 size={14} />
      </ActionIcon>
    </SimpleGrid>
  );
}

// ─── Line item row ────────────────────────────────────────────────────────────

interface LineItemProps {
  index: number;
  products: Product[];
  form: UseFormReturn<PurchaseCreateInput, unknown, PurchaseCreate>;
  removeItem: (index: number) => void;
}

function LineItemRow({ index, products, form, removeItem }: LineItemProps) {
  const [showUnits, setShowUnits] = useState(false);
  const { fields: unitFields, append: appendUnit, remove: removeUnit } =
    useFieldArray({ control: form.control, name: `items.${index}.units` });

  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.brand ? ` — ${p.brand}` : ""}`,
  }));

  const qty: number = form.watch(`items.${index}.quantity`) ?? 1;
  const unitCost: number = form.watch(`items.${index}.unit_cost`) ?? 0;
  const lineTotal = qty * unitCost;

  return (
    <Paper withBorder p="sm" mb="xs">
      <Group justify="space-between" mb="xs">
        <Text size="xs" fw={700} c="dimmed">LINE {index + 1}</Text>
        <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeItem(index)}>
          <Trash2 size={14} />
        </ActionIcon>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
        <Controller
          name={`items.${index}.product_id`}
          control={form.control}
          render={({ field }) => (
            <Select
              label="Product"
              placeholder="Select product"
              required
              searchable
              data={productOptions}
              value={field.value}
              onChange={field.onChange}
              error={form.formState.errors.items?.[index]?.product_id?.message}
            />
          )}
        />
        <Controller
          name={`items.${index}.quantity`}
          control={form.control}
          render={({ field }) => (
            <NumberInput
              label="Qty"
              required
              min={1}
              value={field.value as number}
              onChange={(v) => field.onChange(Number(v))}
            />
          )}
        />
        <Controller
          name={`items.${index}.unit_cost`}
          control={form.control}
          render={({ field }) => (
            <NumberInput
              label="Unit Cost"
              required
              min={0}
              decimalScale={2}
              thousandSeparator=","
              leftSection={CURRENCY_SYMBOL}
              value={field.value as number}
              onChange={(v) => field.onChange(Number(v))}
            />
          )}
        />
        <Box>
          <Text size="xs" c="dimmed" mb={4}>Line Total</Text>
          <Text fw={700}>{formatCurrency(lineTotal)}</Text>
        </Box>
      </SimpleGrid>

      {/* Serialized units toggle */}
      <Group mt="xs" gap="xs">
        <Button
          variant="subtle"
          size="xs"
          leftSection={<Cpu size={12} />}
          rightSection={showUnits ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          onClick={() => setShowUnits((v) => !v)}
        >
          {showUnits ? "Hide" : "Enter"} serial numbers ({unitFields.length}/{qty})
        </Button>
        {unitFields.length > 0 && unitFields.length === qty && (
          <Badge size="xs" color="green">Serialized</Badge>
        )}
        {unitFields.length > 0 && unitFields.length !== qty && (
          <Badge size="xs" color="orange">
            {unitFields.length}/{qty} serials entered
          </Badge>
        )}
      </Group>

      <Collapse in={showUnits}>
        <Box mt="xs" pl="xs" style={{ borderLeft: "2px solid var(--mantine-color-blue-3)" }}>
          <Group mb="xs" justify="space-between">
            <Text size="xs" c="dimmed" fw={600}>
              Serial · IMEI · Color · Storage · Condition
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<Plus size={12} />}
              onClick={() =>
                appendUnit({
                  serial_number: "",
                  imei: "",
                  color: "",
                  storage: "",
                  condition: "New",
                  notes: "",
                })
              }
              disabled={unitFields.length >= qty}
            >
              Add unit
            </Button>
          </Group>
          {unitFields.map((_, ui) => (
            <UnitRow
              key={ui}
              itemIndex={index}
              unitIndex={ui}
              register={form.register}
              remove={removeUnit}
            />
          ))}
          {unitFields.length === 0 && (
            <Text size="xs" c="dimmed" fs="italic">
              No serial numbers entered — this line will be treated as bulk stock.
            </Text>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Purchases() {
  const {
    data: purchasesData,
    loading: purchasesLoading,
    error: purchasesError,
    refetch: refetchPurchases,
  } = useFetch<Purchase[]>("/api/purchases");
  const { data: productsData } = useFetch<Product[]>("/api/products");
  const { isRefreshing, handleRefresh } = usePageState();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState<Purchase | null>(null);

  const form = useForm<PurchaseCreateInput, unknown, PurchaseCreate>({
    resolver: zodResolver(PurchaseCreateSchema),
    defaultValues: {
      supplier: "",
      reference_number: "",
      delivery_date: new Date().toISOString().split("T")[0],
      transport_cost: 0,
      notes: "",
      items: [{ product_id: "", quantity: 1, unit_cost: 0, units: [] }],
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } =
    useFieldArray({ control: form.control, name: "items" });

  useEffect(() => {
    if (purchasesData) setPurchases(purchasesData);
  }, [purchasesData]);

  useEffect(() => {
    if (productsData) setProducts(productsData);
  }, [productsData]);

  const filtered = purchases.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.supplier.toLowerCase().includes(term) ||
      (p.reference_number ?? "").toLowerCase().includes(term)
    );
  });

  const handleSubmit = async (data: PurchaseCreate) => {
    try {
      // Clean empty strings
      const payload = {
        ...data,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        items: data.items.map((item) => ({
          ...item,
          units: item.units?.filter((u) => u.serial_number?.trim()) ?? [],
        })),
      };
      await apiRequest("/api/purchases", { method: "POST", body: JSON.stringify(payload) });
      toast.success("Purchase recorded — stock updated.");
      setIsModalOpen(false);
      form.reset();
      refetchPurchases();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save purchase.");
    }
  };

  const totalSpend = purchases.reduce((s, p) => s + p.total_cost, 0);
  const totalUnits = purchases.reduce(
    (s, p) => s + p.items.reduce((si, i) => si + i.quantity, 0),
    0
  );

  if (purchasesLoading) return <LoadingState message="Loading purchases..." />;
  if (purchasesError)
    return (
      <ErrorDisplay
        title="Error Loading Purchases"
        message={purchasesError?.message}
        onRetry={refetchPurchases}
      />
    );

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Purchases"
        description="Record supplier deliveries — stock updates automatically"
        showRefresh
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetchPurchases)}
      >
        <Button
          leftSection={<Plus size={16} />}
          onClick={() => {
            form.reset();
            setIsModalOpen(true);
          }}
        >
          New Purchase
        </Button>
      </PageHeader>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <Paper className="block-card" p="md">
          <Text size="xs" c="dimmed" fw={800} style={{ letterSpacing: "1px" }}>TOTAL PURCHASES</Text>
          <Text size="xl" fw={800}>{purchases.length}</Text>
        </Paper>
        <Paper className="block-card" p="md">
          <Text size="xs" c="dimmed" fw={800} style={{ letterSpacing: "1px" }}>TOTAL SPEND</Text>
          <Text size="xl" fw={800}>{formatCurrency(totalSpend)}</Text>
        </Paper>
        <Paper className="block-card" p="md">
          <Text size="xs" c="dimmed" fw={800} style={{ letterSpacing: "1px" }}>UNITS RECEIVED</Text>
          <Text size="xl" fw={800}>{totalUnits}</Text>
        </Paper>
      </SimpleGrid>

      {/* Search */}
      <Paper className="block-card" p="md" mb="xl">
        <TextInput
          placeholder="Search by supplier or reference..."
          leftSection={<Search size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Paper>

      {/* Table */}
      <Paper className="block-card" p={0} style={{ overflow: "hidden" }}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Supplier</Table.Th>
              <Table.Th>Ref #</Table.Th>
              <Table.Th>Items</Table.Th>
              <Table.Th>Transport</Table.Th>
              <Table.Th>Total Cost</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((p) => (
              <Table.Tr
                key={p.id}
                style={{ cursor: "pointer" }}
                onClick={() => setDetailPurchase(p)}
              >
                <Table.Td style={{ borderBottom: "1px solid black" }}>
                  {format(new Date(p.delivery_date), "MMM dd, yyyy")}
                </Table.Td>
                <Table.Td style={{ borderBottom: "1px solid black" }} fw={700}>
                  {p.supplier}
                </Table.Td>
                <Table.Td style={{ borderBottom: "1px solid black" }}>
                  {p.reference_number ?? <Text c="dimmed" size="xs">—</Text>}
                </Table.Td>
                <Table.Td style={{ borderBottom: "1px solid black" }}>
                  <Badge variant="light">{p.items.length} line{p.items.length !== 1 ? "s" : ""}</Badge>
                </Table.Td>
                <Table.Td style={{ borderBottom: "1px solid black" }}>
                  {p.transport_cost > 0 ? formatCurrency(p.transport_cost) : <Text c="dimmed" size="xs">—</Text>}
                </Table.Td>
                <Table.Td style={{ borderBottom: "1px solid black" }} fw={800}>
                  {formatCurrency(p.total_cost)}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {filtered.length === 0 && (
          <Text ta="center" py="xl" c="dimmed">No purchases found</Text>
        )}
      </Paper>

      {/* ── Create modal ── */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Purchase"
        size="xl"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Header */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput
                label="Supplier"
                placeholder="e.g. Apple Distribution Ltd"
                required
                {...form.register("supplier")}
                error={form.formState.errors.supplier?.message}
              />
              <TextInput
                label="Reference / Invoice #"
                placeholder="e.g. INV-2024-001"
                {...form.register("reference_number")}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput
                label="Delivery Date"
                type="date"
                {...form.register("delivery_date")}
              />
              <Controller
                name="transport_cost"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Transport / Other Cost"
                    min={0}
                    decimalScale={2}
                    thousandSeparator=","
                    leftSection={CURRENCY_SYMBOL}
                    value={field.value as number}
                    onChange={(v) => field.onChange(Number(v))}
                  />
                )}
              />
            </SimpleGrid>

            <Textarea
              label="Notes"
              placeholder="Optional delivery notes..."
              minRows={2}
              {...form.register("notes")}
            />

            <Divider label="Line Items" labelPosition="left" />

            {/* Line items */}
            {itemFields.map((_, idx) => (
              <LineItemRow
                key={idx}
                index={idx}
                products={products}
                form={form}
                removeItem={removeItem}
              />
            ))}

            <Button
              variant="light"
              leftSection={<Plus size={14} />}
              onClick={() =>
                appendItem({ product_id: "", quantity: 1, unit_cost: 0, units: [] })
              }
            >
              Add Line Item
            </Button>

            {/* Summary */}
            {itemFields.length > 0 && (() => {
              const items = form.watch("items") ?? [];
              const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_cost) || 0), 0);
              const transport = Number(form.watch("transport_cost")) || 0;
              return (
                <Paper withBorder p="sm" bg="gray.0">
                  <Group justify="space-between">
                    <Text size="sm">Subtotal</Text>
                    <Text size="sm" fw={600}>{formatCurrency(subtotal)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Transport</Text>
                    <Text size="sm" fw={600}>{formatCurrency(transport)}</Text>
                  </Group>
                  <Divider my={4} />
                  <Group justify="space-between">
                    <Text fw={700}>Total</Text>
                    <Text fw={700}>{formatCurrency(subtotal + transport)}</Text>
                  </Group>
                </Paper>
              );
            })()}

            <Group justify="flex-end">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                leftSection={<ShoppingCart size={16} />}
              >
                Record Purchase
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* ── Detail modal ── */}
      <Modal
        opened={!!detailPurchase}
        onClose={() => setDetailPurchase(null)}
        title={detailPurchase ? `Purchase — ${detailPurchase.supplier}` : ""}
        size="lg"
      >
        {detailPurchase && (
          <Stack gap="sm">
            <SimpleGrid cols={2}>
              <Box>
                <Text size="xs" c="dimmed">Date</Text>
                <Text fw={600}>{format(new Date(detailPurchase.delivery_date), "MMM dd, yyyy")}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Reference</Text>
                <Text fw={600}>{detailPurchase.reference_number ?? "—"}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Transport Cost</Text>
                <Text fw={600}>{formatCurrency(detailPurchase.transport_cost)}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Total Cost</Text>
                <Text fw={800} size="lg">{formatCurrency(detailPurchase.total_cost)}</Text>
              </Box>
            </SimpleGrid>
            {detailPurchase.notes && (
              <Text size="sm" c="dimmed">{detailPurchase.notes}</Text>
            )}
            <Divider label="Line Items" labelPosition="left" />
            {detailPurchase.items.map((item, i) => (
              <Paper key={item.id} withBorder p="sm">
                <Group justify="space-between">
                  <Box>
                    <Text fw={700} size="sm">{item.product?.name ?? item.product_id}</Text>
                    <Text size="xs" c="dimmed">
                      {item.quantity} × {formatCurrency(item.unit_cost)}
                    </Text>
                  </Box>
                  <Text fw={700}>{formatCurrency(item.subtotal)}</Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
