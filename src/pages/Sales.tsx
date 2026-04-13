import React, { useState, useMemo } from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import { useFetch, salesApi } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Button, TextInput, Textarea, Group, Text, SimpleGrid,
  Stack, Table, Modal, Select, NumberInput, Paper, Box,
  Pagination, Badge, Divider, ActionIcon, Tooltip, Collapse,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import { Plus, Search, Download, Trash2, ChevronDown, ChevronUp, Eye, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Sale, Product } from "@/types";
import { useForm, Controller, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SaleCreateSchema, type SaleCreate } from "@/lib/schemas";
import { toast } from "../components/Toast";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

export default function Sales() {
  const { user } = useAuth();
  const { data: salesData, loading, error, refetch } = useFetch<Sale[]>("/api/sales?limit=200");
  const { data: productsData } = useFetch<Product[]>("/api/products?limit=500");
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [activePage, setPage] = useState(1);
  const itemsPerPage = 15;

  const products = productsData || [];
  const sales = salesData || [];

  const form = useForm<SaleCreate>({
    resolver: zodResolver(SaleCreateSchema) as Resolver<SaleCreate>,
    defaultValues: {
      sale_date: new Date().toISOString().split('T')[0],
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      discount_amount: 0,
      tax_amount: 0,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 0,
      notes: "",
      items: [{ product_id: "", quantity: 1, discount_per_item: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = form.watch("items");
  const discountAmount = form.watch("discount_amount") || 0;
  const taxAmount = form.watch("tax_amount") || 0;

  // Compute live totals from cart
  const lineItems = useMemo(() => {
    return watchedItems.map((item) => {
      const product = products.find(p => p.id === item.product_id);
      const unitPrice = product?.suggested_sell_price || 0;
      const discount = item.discount_per_item || 0;
      const lineTotal = (unitPrice - discount) * (item.quantity || 0);
      return { product, unitPrice, lineTotal };
    });
  }, [watchedItems, products]);

  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const grandTotal = subtotal - discountAmount + taxAmount;

  const filteredSales = sales.filter(s =>
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.sale_number).includes(searchTerm)
  );

  const paginatedSales = filteredSales.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const totalRevenue = sales.reduce((s, sale) => s + (sale.total_amount ?? 0), 0);
  // Use local date (not UTC) so "today" matches the operator's timezone
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todaySales = sales.filter(s => s.sale_date === todayStr);
  const todayRevenue = todaySales.reduce((s, sale) => s + (sale.total_amount ?? 0), 0);
  const pendingPayments = sales.filter(s => s.payment_status !== 'paid').length;

  const handleSubmit = async (data: SaleCreate) => {
    try {
      const idempotencyKey = uuidv4();
      const payload = {
        ...data,
        customer_email: (data.customer_email == null || data.customer_email === "") ? undefined : data.customer_email,
        notes: data.notes === "" ? undefined : data.notes,
        sale_date: data.sale_date || new Date().toISOString().split('T')[0],
      };

      await salesApi.create(payload, idempotencyKey);
      toast.success("Sale recorded successfully!");
      setIsModalOpen(false);
      form.reset();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record sale.");
    }
  };

  const openModal = () => {
    form.reset({
      sale_date: new Date().toISOString().split('T')[0],
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      discount_amount: 0,
      tax_amount: 0,
      payment_method: "cash",
      payment_status: "paid",
      amount_paid: 0,
      notes: "",
      items: [{ product_id: "", quantity: 1, discount_per_item: 0 }],
    });
    setIsModalOpen(true);
  };

  if (loading && !salesData) return <LoadingState message="Loading sales..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Sales"
        description="Immutable sales records — corrections go through Returns"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetch)}
      >
        <Button onClick={openModal} leftSection={<Plus size={16} />}>New Sale</Button>
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        {isManager ? (
          <>
            <Paper className="block-card" p="md">
              <Text size="xs" fw={800} color="dimmed" style={{ letterSpacing: 1 }}>TOTAL REVENUE</Text>
              <Text size="xl" fw={800} ff="'Manrope', sans-serif">{formatCurrency(totalRevenue)}</Text>
              <Text size="xs" color="dimmed" fw={500}>{sales.length} SALES</Text>
            </Paper>
            <Paper className="block-card" p="md">
              <Text size="xs" fw={800} color="dimmed" style={{ letterSpacing: 1 }}>TODAY'S REVENUE</Text>
              <Text size="xl" fw={800} ff="'Manrope', sans-serif">{formatCurrency(todayRevenue)}</Text>
              <Text size="xs" color="dimmed" fw={500}>{todaySales.length} SALES TODAY</Text>
            </Paper>
            <Paper className="block-card" p="md">
              <Text size="xs" fw={800} color="dimmed" style={{ letterSpacing: 1 }}>AVG SALE VALUE</Text>
              <Text size="xl" fw={800} ff="'Manrope', sans-serif">
                {sales.length > 0 ? formatCurrency(totalRevenue / sales.length) : formatCurrency(0)}
              </Text>
            </Paper>
          </>
        ) : (
          <>
            <Paper className="block-card" p="md">
              <Text size="xs" fw={800} color="dimmed" style={{ letterSpacing: 1 }}>TODAY'S SALES</Text>
              <Text size="xl" fw={800} ff="'Manrope', sans-serif">{todaySales.length}</Text>
              <Text size="xs" color="dimmed" fw={500}>TRANSACTIONS TODAY</Text>
            </Paper>
            <Paper className="block-card" p="md">
              <Text size="xs" fw={800} color="dimmed" style={{ letterSpacing: 1 }}>TODAY'S REVENUE</Text>
              <Text size="xl" fw={800} ff="'Manrope', sans-serif">{formatCurrency(todayRevenue)}</Text>
              <Text size="xs" color="dimmed" fw={500}>FROM TODAY'S SALES</Text>
            </Paper>
            <Paper className="block-card" p="md">
              <Text size="xs" fw={800} color="dimmed" style={{ letterSpacing: 1 }}>PENDING PAYMENTS</Text>
              <Text size="xl" fw={800} ff="'Manrope', sans-serif">{pendingPayments}</Text>
              <Text size="xs" color="dimmed" fw={500}>AWAITING COLLECTION</Text>
            </Paper>
          </>
        )}
      </SimpleGrid>

      <Paper className="block-card" p={0} style={{ overflow: 'hidden' }}>
        <Box p="md" style={{ borderBottom: '1px solid var(--echo-border)' }}>
          <Group justify="space-between">
            <TextInput
              placeholder="Search by customer, phone, sale #..."
              leftSection={<Search size={16} />}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, maxWidth: 400 }}
              className="block-input"
            />
            <Button variant="outline" color="dark" size="sm" className="block-button" leftSection={<Download size={16} />}>
              Export
            </Button>
          </Group>
        </Box>

        <Table verticalSpacing="sm" style={{ borderCollapse: 'collapse' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>SALE #</Table.Th>
              <Table.Th>DATE</Table.Th>
              <Table.Th>CUSTOMER</Table.Th>
              <Table.Th>ITEMS</Table.Th>
              <Table.Th>TOTAL</Table.Th>
              <Table.Th>PAYMENT</Table.Th>
              <Table.Th>ACTIONS</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedSales.map(sale => (
              <Table.Tr key={sale.id}>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" ff="monospace" fw={800}>SALE-{String(sale.sale_number).padStart(5, '0')}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={500}>{format(new Date(sale.sale_date), 'MMM dd, yyyy')}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={800}>{sale.customer_name || '—'}</Text>
                  <Text size="xs" color="dimmed">{sale.customer_phone}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={600}>{sale.items.length} item{sale.items.length !== 1 ? 's' : ''}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={800}>{formatCurrency(sale.total_amount)}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Badge
                    color={sale.payment_status === 'paid' ? 'teal' : sale.payment_status === 'partial' ? 'orange' : 'red'}
                    variant="outline"
                    style={{ borderRadius: 0 }}
                  >
                    {sale.payment_status.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Button
                    variant="outline" color="dark" size="xs" className="block-button"
                    leftSection={<Eye size={12} />}
                    onClick={() => setViewingSale(sale)}
                  >
                    View
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {filteredSales.length === 0 && (
          <Stack align="center" py="xl" gap="sm">
            <ShoppingCart size={48} color="gray" />
            <Text color="dimmed">No sales found</Text>
          </Stack>
        )}

        {filteredSales.length > itemsPerPage && (
          <Box p="md">
            <Pagination total={totalPages} value={activePage} onChange={setPage} />
          </Box>
        )}
      </Paper>

      {/* ── New Sale Modal ── */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Sale"
        size="xl"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Customer */}
            <Text fw={800} size="sm" style={{ letterSpacing: 1 }}>CUSTOMER</Text>
            <Group grow>
              <TextInput label="Name" placeholder="Customer name" {...form.register("customer_name")} className="block-input" />
              <TextInput label="Phone" placeholder="080..." {...form.register("customer_phone")} className="block-input" />
            </Group>
            <Controller
              name="sale_date"
              control={form.control}
              render={({ field }) => (
                <DateInput
                  label="Sale Date"
                  value={field.value || new Date().toISOString().split('T')[0]}
                  onChange={(val: string | null) => field.onChange(val ?? new Date().toISOString().split('T')[0])}
                  className="block-input"
                  style={{ maxWidth: 220 }}
                />
              )}
            />

            <Divider label="ITEMS" labelPosition="left" my="xs" />

            {/* Cart items */}
            {fields.map((field, index) => {
              const lineItem = lineItems[index];
              return (
                <Paper key={field.id} p="sm" style={{ border: '1px solid black' }}>
                  <Group align="flex-start" gap="sm">
                    <Controller
                      name={`items.${index}.product_id`}
                      control={form.control}
                      render={({ field: f }) => (
                        <Select
                          label="Product"
                          placeholder="Select product"
                          required
                          data={products.map(p => ({
                            value: p.id,
                            label: `${p.name} (Stock: ${p.current_stock})`,
                            disabled: p.current_stock === 0,
                          }))}
                          value={f.value}
                          onChange={f.onChange}
                          searchable
                          style={{ flex: 2 }}
                          className="block-input"
                        />
                      )}
                    />
                    <Controller
                      name={`items.${index}.quantity`}
                      control={form.control}
                      render={({ field: f }) => (
                        <NumberInput
                          label="Qty"
                          min={1}
                          max={lineItem.product?.current_stock}
                          value={f.value}
                          onChange={v => f.onChange(Number(v))}
                          style={{ width: 80 }}
                          className="block-input"
                        />
                      )}
                    />
                    <Controller
                      name={`items.${index}.discount_per_item`}
                      control={form.control}
                      render={({ field: f }) => (
                        <NumberInput
                          label="Disc/unit"
                          min={0}
                          decimalScale={2}
                          leftSection={CURRENCY_SYMBOL}
                          value={f.value}
                          onChange={v => f.onChange(Number(v))}
                          style={{ width: 110 }}
                          className="block-input"
                        />
                      )}
                    />
                    <Stack gap={0} style={{ minWidth: 100 }}>
                      <Text size="xs" fw={700} color="dimmed">LINE TOTAL</Text>
                      <Text size="sm" fw={800}>{formatCurrency(lineItem.lineTotal)}</Text>
                      {lineItem.product && (
                        <Text size="xs" color="dimmed">@ {formatCurrency(lineItem.unitPrice)}</Text>
                      )}
                    </Stack>
                    {fields.length > 1 && (
                      <ActionIcon color="red" variant="subtle" mt={22} onClick={() => remove(index)}>
                        <Trash2 size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </Paper>
              );
            })}

            <Button
              variant="outline" color="dark" size="sm"
              onClick={() => append({ product_id: "", quantity: 1, discount_per_item: 0 })}
              leftSection={<Plus size={14} />}
              style={{ alignSelf: 'flex-start' }}
            >
              Add Item
            </Button>

            <Divider label="TOTALS & PAYMENT" labelPosition="left" my="xs" />

            <Group grow>
              <Controller
                name="discount_amount"
                control={form.control}
                render={({ field }) => (
                  <NumberInput label={`Order Discount (${CURRENCY_SYMBOL})`} min={0} decimalScale={2} leftSection={CURRENCY_SYMBOL}
                    value={field.value} onChange={v => field.onChange(Number(v))} className="block-input" />
                )}
              />
              <Controller
                name="tax_amount"
                control={form.control}
                render={({ field }) => (
                  <NumberInput label={`Tax (${CURRENCY_SYMBOL})`} min={0} decimalScale={2} leftSection={CURRENCY_SYMBOL}
                    value={field.value} onChange={v => field.onChange(Number(v))} className="block-input" />
                )}
              />
            </Group>

            <Paper p="sm" style={{ backgroundColor: 'var(--echo-surface-2)', border: '1px solid var(--echo-border)' }}>
              <Group justify="space-between">
                <Text fw={700}>SUBTOTAL</Text><Text fw={700}>{formatCurrency(subtotal)}</Text>
              </Group>
              {discountAmount > 0 && (
                <Group justify="space-between">
                  <Text size="sm">Discount</Text><Text size="sm">-{formatCurrency(discountAmount)}</Text>
                </Group>
              )}
              {taxAmount > 0 && (
                <Group justify="space-between">
                  <Text size="sm">Tax</Text><Text size="sm">+{formatCurrency(taxAmount)}</Text>
                </Group>
              )}
              <Divider color="gray.7" my="xs" />
              <Group justify="space-between">
                <Text fw={800} size="lg">TOTAL</Text><Text fw={800} size="lg">{formatCurrency(grandTotal)}</Text>
              </Group>
            </Paper>

            <Group grow>
              <Controller
                name="payment_method"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Payment Method"
                    data={[
                      { value: 'cash', label: 'Cash' },
                      { value: 'card', label: 'Card' },
                      { value: 'transfer', label: 'Transfer' },
                      { value: 'other', label: 'Other' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    className="block-input"
                  />
                )}
              />
              <Controller
                name="payment_status"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Payment Status"
                    data={[
                      { value: 'paid', label: 'Paid' },
                      { value: 'partial', label: 'Partial' },
                      { value: 'pending', label: 'Pending' },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    className="block-input"
                  />
                )}
              />
              <Controller
                name="amount_paid"
                control={form.control}
                render={({ field }) => (
                  <NumberInput label={`Amount Paid (${CURRENCY_SYMBOL})`} min={0} decimalScale={2} leftSection={CURRENCY_SYMBOL}
                    value={field.value} onChange={v => field.onChange(Number(v))} className="block-input" />
                )}
              />
            </Group>

            <Textarea label="Notes" placeholder="Optional notes..." minRows={2} {...form.register("notes")} className="block-input" />

            {form.formState.errors.items && (
              <Text color="red" size="sm">{form.formState.errors.items.root?.message || form.formState.errors.items.message}</Text>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="light" color="gray" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="block-button" loading={form.formState.isSubmitting}>
                Record Sale
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* ── Sale Detail Modal ── */}
      <Modal
        opened={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={viewingSale ? `Sale SALE-${String(viewingSale.sale_number).padStart(5, '0')}` : 'Sale Details'}
        size="lg"
      >
        {viewingSale && (
          <Stack gap="md">
            <Group>
              <Stack gap={2} style={{ flex: 1 }}>
                <Text size="xs" color="dimmed" fw={700}>CUSTOMER</Text>
                <Text fw={800}>{viewingSale.customer_name || '—'}</Text>
                <Text size="sm" color="dimmed">{viewingSale.customer_phone}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" color="dimmed" fw={700}>DATE</Text>
                <Text fw={700}>{format(new Date(viewingSale.sale_date), 'MMM dd, yyyy')}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" color="dimmed" fw={700}>PAYMENT</Text>
                <Badge color={viewingSale.payment_status === 'paid' ? 'teal' : 'orange'} variant="outline" style={{ borderRadius: 0 }}>
                  {viewingSale.payment_status.toUpperCase()}
                </Badge>
              </Stack>
            </Group>

            <Divider label="LINE ITEMS" labelPosition="left" />

            <Table style={{ borderCollapse: 'collapse' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Unit Price</Table.Th>
                  <Table.Th>Line Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {viewingSale.items.map(item => (
                  <Table.Tr key={item.id}>
                    <Table.Td style={{ borderBottom: '1px solid black' }}>
                      <Text size="sm" fw={700}>{item.product_id}</Text>
                    </Table.Td>
                    <Table.Td style={{ borderBottom: '1px solid black' }}>{item.quantity}</Table.Td>
                    <Table.Td style={{ borderBottom: '1px solid black' }}>{formatCurrency(item.unit_price)}</Table.Td>
                    <Table.Td style={{ borderBottom: '1px solid black' }} fw={800}>{formatCurrency(item.line_total)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Paper p="sm" style={{ border: '1px solid var(--echo-border)' }}>
              <Group justify="space-between"><Text>Subtotal</Text><Text>{formatCurrency(viewingSale.subtotal)}</Text></Group>
              {viewingSale.discount_amount > 0 && (
                <Group justify="space-between"><Text>Discount</Text><Text>-{formatCurrency(viewingSale.discount_amount)}</Text></Group>
              )}
              {viewingSale.tax_amount > 0 && (
                <Group justify="space-between"><Text>Tax</Text><Text>+{formatCurrency(viewingSale.tax_amount)}</Text></Group>
              )}
              <Divider my="xs" />
              <Group justify="space-between">
                <Text fw={800} size="lg">TOTAL</Text>
                <Text fw={800} size="lg">{formatCurrency(viewingSale.total_amount)}</Text>
              </Group>
            </Paper>

            <Text size="xs" color="dimmed" style={{ fontStyle: 'italic' }}>
              Sales are immutable. To correct this sale, create a Return.
            </Text>
          </Stack>
        )}
      </Modal>
    </>
  );
}
