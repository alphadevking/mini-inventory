/**
 * ProductUnitsPanel
 * =================
 * Shows the serialized unit inventory for a single Product.
 * Rendered inside the Products page when a user opens the "Units" drawer/modal.
 *
 * Features:
 *  - List all physical units with status badges
 *  - Intake a single unit (form)
 *  - Bulk intake via CSV-style text area
 *  - Filter by status
 */
import React, { useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Tabs,
  ActionIcon,
  Tooltip,
  CopyButton,
} from "@mantine/core";
import { Plus, RefreshCw, Copy, Check } from "lucide-react";
import { useFetch, apiRequest } from "@/lib/api";
import { Product, ProductUnit, ProductUnitCreate, UnitStatus } from "@/types";
import { toast } from "./Toast";

// ── Status badge helper ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<UnitStatus, string> = {
  in_stock: "green",
  sold: "blue",
  returned: "orange",
  in_repair: "yellow",
  reserved: "grape",
};

const STATUS_LABELS: Record<UnitStatus, string> = {
  in_stock: "In Stock",
  sold: "Sold",
  returned: "Returned",
  in_repair: "In Repair",
  reserved: "Reserved",
};

function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return (
    <Badge color={STATUS_COLORS[status]} variant="light" size="sm">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// ── Single-unit intake form ────────────────────────────────────────────────────

interface IntakeFormProps {
  product: Product;
  onSuccess: () => void;
}

function IntakeForm({ product, onSuccess }: IntakeFormProps) {
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [color, setColor] = useState("");
  const [storage, setStorage] = useState("");
  const [condition, setCondition] = useState<string>("New");
  const [cost, setCost] = useState<number | string>(product.last_purchase_cost);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) {
      toast.error("Serial number is required");
      return;
    }
    if (!cost || Number(cost) <= 0) {
      toast.error("Purchase cost must be greater than 0");
      return;
    }

    setLoading(true);
    try {
      const payload: ProductUnitCreate = {
        serial_number: serial.trim(),
        imei: imei.trim() || undefined,
        color: color.trim() || undefined,
        storage: storage.trim() || undefined,
        condition,
        purchase_cost: Number(cost),
        notes: notes.trim() || undefined,
      };
      await apiRequest(`/api/products/${product.id}/units`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(`Unit SN: ${serial} added to stock`);
      setSerial("");
      setImei("");
      setColor("");
      setNotes("");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add unit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="Serial Number"
            placeholder="e.g. C8XH2XXXXXX"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            required
          />
          <TextInput
            label="IMEI (optional)"
            placeholder="15-digit IMEI"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
          />
        </Group>
        <Group grow>
          <TextInput
            label="Color"
            placeholder="e.g. Natural Titanium"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <TextInput
            label="Storage"
            placeholder="e.g. 256GB"
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
          />
        </Group>
        <Group grow>
          <Select
            label="Condition"
            value={condition}
            onChange={(v) => setCondition(v ?? "New")}
            data={["New", "Used", "Refurbished"]}
          />
          <NumberInput
            label="Purchase Cost"
            value={cost}
            onChange={setCost}
            prefix="₦"
            thousandSeparator=","
            min={0}
            required
          />
        </Group>
        <TextInput
          label="Notes"
          placeholder="Optional notes about this unit"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button type="submit" loading={loading} leftSection={<Plus size={16} />}>
          Add Unit to Stock
        </Button>
      </Stack>
    </form>
  );
}

// ── Bulk intake via text area ─────────────────────────────────────────────────

interface BulkIntakeFormProps {
  product: Product;
  onSuccess: () => void;
}

function BulkIntakeForm({ product, onSuccess }: BulkIntakeFormProps) {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);

  const PLACEHOLDER = `One unit per line. Columns: serial,imei,color,storage,condition,cost
C8XH200001,354123456789012,Black,128GB,New,350000
C8XH200002,,Gold,256GB,New,420000
C8XH200003,354123456789013,White,128GB,Refurbished,280000`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.toLowerCase().startsWith("serial"));

    if (lines.length === 0) {
      toast.error("No valid rows found");
      return;
    }

    const units: ProductUnitCreate[] = [];
    for (const line of lines) {
      const [sn, imei, color, storage, condition, costStr] = line.split(",").map((c) => c.trim());
      if (!sn) continue;
      const cost = parseFloat(costStr || String(product.last_purchase_cost));
      units.push({
        serial_number: sn,
        imei: imei || undefined,
        color: color || undefined,
        storage: storage || undefined,
        condition: condition || "New",
        purchase_cost: isNaN(cost) ? product.last_purchase_cost : cost,
      });
    }

    setLoading(true);
    try {
      const result = await apiRequest<ProductUnit[]>(
        `/api/products/${product.id}/units/batch`,
        {
          method: "POST",
          body: JSON.stringify({ units }),
        }
      );
      toast.success(`${result.length} units added to stock`);
      setRawText("");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Batch intake failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          Paste one unit per line. Columns: <code>serial, imei, color, storage, condition, cost</code>
          <br />
          IMEI and other fields are optional. Default cost = product's last purchase cost.
        </Text>
        <Textarea
          rows={10}
          placeholder={PLACEHOLDER}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
        />
        <Button type="submit" loading={loading} leftSection={<Plus size={16} />}>
          Import {rawText.split("\n").filter((l) => l.trim() && !l.startsWith("#") && !l.toLowerCase().startsWith("serial")).length || 0} Units
        </Button>
      </Stack>
    </form>
  );
}

// ── Units table ───────────────────────────────────────────────────────────────

interface UnitsTableProps {
  units: ProductUnit[];
}

function UnitsTable({ units }: UnitsTableProps) {
  if (units.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No units found for this filter.
      </Text>
    );
  }

  return (
    <Table striped highlightOnHover withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Serial Number</Table.Th>
          <Table.Th>IMEI</Table.Th>
          <Table.Th>Color / Storage</Table.Th>
          <Table.Th>Condition</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Cost</Table.Th>
          <Table.Th>Received</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {units.map((unit) => (
          <Table.Tr key={unit.id}>
            <Table.Td>
              <Group gap={4}>
                <Text size="sm" ff="monospace">
                  {unit.serial_number}
                </Text>
                <CopyButton value={unit.serial_number} timeout={1500}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copied" : "Copy"}>
                      <ActionIcon size="xs" variant="subtle" onClick={copy} color={copied ? "teal" : "gray"}>
                        {copied ? <Check size={10} /> : <Copy size={10} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="sm" ff="monospace" c={unit.imei ? undefined : "dimmed"}>
                {unit.imei ?? "—"}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">
                {[unit.color, unit.storage].filter(Boolean).join(" / ") || "—"}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm">{unit.condition ?? "—"}</Text>
            </Table.Td>
            <Table.Td>
              <UnitStatusBadge status={unit.status} />
            </Table.Td>
            <Table.Td>
              <Text size="sm">₦{unit.purchase_cost.toLocaleString()}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="xs" c="dimmed">
                {new Date(unit.purchased_at).toLocaleDateString()}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface ProductUnitsPanelProps {
  product: Product;
  opened: boolean;
  onClose: () => void;
}

export default function ProductUnitsPanel({
  product,
  opened,
  onClose,
}: ProductUnitsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [intakeModalOpen, setIntakeModalOpen] = useState(false);

  const url =
    statusFilter === "all"
      ? `/api/products/${product.id}/units?limit=500`
      : `/api/products/${product.id}/units?status_filter=${statusFilter}&limit=500`;

  const { data: units, loading, refetch } = useFetch<ProductUnit[]>(url);

  const inStock = units?.filter((u) => u.status === "in_stock").length ?? 0;
  const sold = units?.filter((u) => u.status === "sold").length ?? 0;
  const total = units?.length ?? 0;

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Stack gap={2}>
            <Text fw={600}>{product.name}</Text>
            <Text size="xs" c="dimmed">
              Serialized Unit Inventory
            </Text>
          </Stack>
        }
        size="90%"
        styles={{ body: { padding: 0 } }}
      >
        {/* Summary bar */}
        <Paper p="md" withBorder radius={0}>
          <Group justify="space-between">
            <Group gap="xl">
              <Stack gap={2} align="center">
                <Text fw={700} size="xl" c="green">
                  {inStock}
                </Text>
                <Text size="xs" c="dimmed">
                  In Stock
                </Text>
              </Stack>
              <Stack gap={2} align="center">
                <Text fw={700} size="xl" c="blue">
                  {sold}
                </Text>
                <Text size="xs" c="dimmed">
                  Sold
                </Text>
              </Stack>
              <Stack gap={2} align="center">
                <Text fw={700} size="xl">
                  {total}
                </Text>
                <Text size="xs" c="dimmed">
                  Total
                </Text>
              </Stack>
            </Group>
            <Group>
              <Tooltip label="Refresh">
                <ActionIcon variant="subtle" onClick={refetch} loading={loading}>
                  <RefreshCw size={16} />
                </ActionIcon>
              </Tooltip>
              <Button
                leftSection={<Plus size={16} />}
                onClick={() => setIntakeModalOpen(true)}
                size="sm"
              >
                Receive Units
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Filter */}
        <Paper p="md" withBorder radius={0}>
          <Select
            label="Filter by status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v ?? "all")}
            data={[
              { value: "all", label: "All Units" },
              { value: "in_stock", label: "In Stock" },
              { value: "sold", label: "Sold" },
              { value: "returned", label: "Returned" },
              { value: "in_repair", label: "In Repair" },
              { value: "reserved", label: "Reserved" },
            ]}
            w={200}
          />
        </Paper>

        {/* Table */}
        <Paper p="md">
          {loading ? (
            <Text c="dimmed" ta="center" py="xl">
              Loading units...
            </Text>
          ) : (
            <UnitsTable units={units ?? []} />
          )}
        </Paper>
      </Modal>

      {/* Intake modal */}
      <Modal
        opened={intakeModalOpen}
        onClose={() => setIntakeModalOpen(false)}
        title="Receive New Units into Stock"
        size="lg"
      >
        <Tabs defaultValue="single">
          <Tabs.List>
            <Tabs.Tab value="single">Single Unit</Tabs.Tab>
            <Tabs.Tab value="bulk">Bulk Import</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="single" pt="md">
            <IntakeForm
              product={product}
              onSuccess={() => {
                refetch();
                setIntakeModalOpen(false);
              }}
            />
          </Tabs.Panel>
          <Tabs.Panel value="bulk" pt="md">
            <BulkIntakeForm
              product={product}
              onSuccess={() => {
                refetch();
                setIntakeModalOpen(false);
              }}
            />
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}
