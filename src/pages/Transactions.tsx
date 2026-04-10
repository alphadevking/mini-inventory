import React, { useState, useEffect } from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetch, apiRequest } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
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
  Card,
  Table,
  Badge,
  Modal,
  Group,
  Stack,
  SimpleGrid,
  Title,
  Text,
  ActionIcon,
  Container,
  Paper
} from "@mantine/core";
import { DateInput } from '@mantine/dates';
import { Plus, Search, Filter, Edit, Trash } from "lucide-react";
import { format } from "date-fns";
import { toast } from "../components/Toast";
import { formatCurrency } from "@/lib/utils";
import { TransactionCreateSchema, TransactionUpdateSchema, type TransactionCreate, type TransactionUpdate } from "@/lib/schemas";
import { Transaction, Product } from "@/types";

export default function Transactions() {
  const { user } = useAuth();
  const { data: transactionsData, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useFetch<Transaction[]>("/api/transactions");
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useFetch<Product[]>("/api/products");
  const { isRefreshing, handleRefresh } = usePageState();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const form = useForm({
    resolver: zodResolver(editingTransaction ? TransactionUpdateSchema : TransactionCreateSchema),
    defaultValues: {
      product_id: "",
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: "purchase",
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
      party_name: "",
      transport_other_cost: 0,
      reference_number: "",
      notes: ""
    }
  });

  useEffect(() => {
    if (transactionsData) {
      setTransactions(transactionsData);
      setFilteredTransactions(transactionsData);
    }
  }, [transactionsData]);

  useEffect(() => {
    if (productsData) {
      setProducts(productsData);
    }
  }, [productsData]);

  useEffect(() => {
    if (transactions.length > 0) {
      const filtered = transactions.filter(transaction => {
        const matchesSearch =
          transaction.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.product?.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.product?.subcategory?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === "all" || transaction.transaction_type === filterType;

        const tDate = new Date(transaction.transaction_date);
        const matchesDate = (!startDate || tDate >= startDate) &&
          (!endDate || tDate <= endDate);

        return matchesSearch && matchesType && matchesDate;
      });
      setFilteredTransactions(filtered);
    }
  }, [searchTerm, filterType, startDate, endDate, transactions]);

  const handleSubmit = async (data: TransactionCreate | TransactionUpdate) => {
    try {
      const url = editingTransaction
        ? `/api/transactions/${editingTransaction.id}`
        : "/api/transactions";

      const method = editingTransaction ? "PUT" : "POST";

      const calculatedTotal = data.transaction_type === "purchase"
        ? ((data.unit_cost || 0) * (data.quantity || 0)) + (data.transport_other_cost || 0)
        : (data.unit_price || 0) * (data.quantity || 0);

      const submitData = {
        ...data,
        total_amount: calculatedTotal,
        party_name: data.party_name === "" ? null : data.party_name,
        reference_number: data.reference_number === "" ? null : data.reference_number,
        notes: data.notes === "" ? null : data.notes
      };

      await apiRequest(url, {
        method,
        body: JSON.stringify(submitData)
      });

      toast.success(editingTransaction ? "Transaction updated successfully!" : "Transaction created successfully!");
      setIsModalOpen(false);
      setEditingTransaction(null);
      resetForm();
      refetchTransactions();
    } catch (err: unknown) {
      console.error("Failed to save transaction:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save transaction. Please try again.");
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.reset({
      product_id: transaction.product_id,
      transaction_date: transaction.transaction_date,
      transaction_type: transaction.transaction_type,
      quantity: transaction.quantity,
      unit_cost: transaction.unit_cost || 0,
      unit_price: transaction.unit_price || 0,
      party_name: transaction.party_name || "",
      transport_other_cost: transaction.transport_other_cost || 0,
      reference_number: transaction.reference_number || "",
      notes: transaction.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await apiRequest(`/api/transactions/${id}`, {
          method: "DELETE"
        });
        refetchTransactions();
        toast.success("Transaction deleted successfully!");
      } catch (err) {
        console.error("Failed to delete transaction:", err);
      }
    }
  };

  const resetForm = () => {
    form.reset({
      product_id: "",
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: "purchase",
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
      party_name: "",
      transport_other_cost: 0,
      reference_number: "",
      notes: ""
    });
  };

  const getTransactionTypeColor = (type: string) => {
    return type === "sale" ? "green" : "blue";
  };

  const totalPurchases = transactions
    .filter(t => t.transaction_type === "purchase")
    .reduce((sum, t) => {
      const unitCost = t.unit_cost || 0;
      const quantity = t.quantity || 0;
      const transportCost = t.transport_other_cost || 0;
      return sum + (unitCost * quantity) + transportCost;
    }, 0);

  const totalSales = transactions
    .filter(t => t.transaction_type === "sale")
    .reduce((sum, t) => {
      const unitPrice = t.unit_price || 0;
      const quantity = t.quantity || 0;
      return sum + (unitPrice * quantity);
    }, 0);

  if (transactionsLoading || productsLoading) {
    return <LoadingState message="Loading your transaction history..." />;
  }

  if (transactionsError || productsError) {
    return (
      <ErrorDisplay
        title="Error Loading Transactions"
        message={(transactionsError || productsError)?.message}
        onRetry={() => {
          refetchTransactions();
          refetchProducts();
        }}
      />
    );
  }

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} - ${p.category?.name || 'Uncategorized'}`
  }));

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Transactions"
        description="Manage all inventory transactions"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetchTransactions, refetchProducts)}
      >
        <Button onClick={() => { setEditingTransaction(null); resetForm(); setIsModalOpen(true); }} leftSection={<Plus size={16} />}>
          Add Transaction
        </Button>
      </PageHeader>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
        <Paper className="block-card" p="md">
          <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>TOTAL TRANSACTIONS</Text>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{transactions.length}</Text>
          <Text size="xs" color="dimmed" fw={500}>
            {transactions.filter(t => t.transaction_type === "purchase").length} purchases, {transactions.filter(t => t.transaction_type === "sale").length} sales
          </Text>
        </Paper>
        <Paper className="block-card" p="md">
          <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>TOTAL PURCHASES</Text>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(totalPurchases)}</Text>
        </Paper>
        <Paper className="block-card" p="md">
          <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>TOTAL SALES</Text>
          <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(totalSales)}</Text>
        </Paper>
      </SimpleGrid>

      <Paper className="block-card" p="md" mb="xl">
        <Group align="flex-end">
          <TextInput
            label="Search"
            placeholder="Search by party, product..."
            leftSection={<Search size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
            className="block-input"
          />
          <Select
            label="Type"
            data={[
              { value: 'all', label: 'All Types' },
              { value: 'purchase', label: 'Purchase' },
              { value: 'sale', label: 'Sale' }
            ]}
            value={filterType}
            onChange={(val) => setFilterType(val || 'all')}
            className="block-input"
          />
          <DateInput
            label="Start Date"
            placeholder="From"
            value={startDate}
            onChange={(val) => setStartDate(val as Date | null)}
            clearable
            className="block-input"
          />
          <DateInput
            label="End Date"
            placeholder="To"
            value={endDate}
            onChange={(val) => setEndDate(val as Date | null)}
            clearable
            className="block-input"
          />
        </Group>
      </Paper>

      <Paper className="block-card" p={0} style={{ overflow: 'hidden' }}>
        <Table verticalSpacing="sm" style={{ borderCollapse: 'collapse' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Product</Table.Th>
              <Table.Th>Qty</Table.Th>
              <Table.Th>Party</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredTransactions.map((transaction) => (
              <Table.Tr key={transaction.id}>
                <Table.Td style={{ borderBottom: '1px solid black' }}>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Badge color="dark" variant="outline" style={{ borderRadius: 0, border: '1px solid black' }}>
                    {transaction.transaction_type}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={800}>{transaction.product?.name || 'Unknown'}</Text>
                  <Text size="xs" color="dimmed" fw={500}>{transaction.product?.category?.name}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }} fw={700}>{transaction.quantity}</Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }} fw={700}>{transaction.party_name || '-'}</Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={800}>
                    {transaction.transaction_type === 'purchase'
                      ? formatCurrency(((transaction.unit_cost || 0) * (transaction.quantity || 0)) + (transaction.transport_other_cost || 0))
                      : formatCurrency((transaction.unit_price || 0) * (transaction.quantity || 0))}
                  </Text>
                  <Text size="xs" color="dimmed" fw={500}>
                    {transaction.transaction_type === 'purchase'
                      ? `${transaction.quantity} × ${formatCurrency(transaction.unit_cost || 0)}${(transaction.transport_other_cost ?? 0) > 0 ? ` + ${formatCurrency(transaction.transport_other_cost || 0)} transport` : ''}`
                      : `${transaction.quantity} × ${formatCurrency(transaction.unit_price || 0)}`}
                  </Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="dark" onClick={() => handleEdit(transaction)}>
                      <Edit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="dark" onClick={() => handleDelete(transaction.id)}>
                      <Trash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {filteredTransactions.length === 0 && (
          <Text ta="center" py="xl" color="dimmed">No transactions found</Text>
        )}
      </Paper>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTransaction ? "Edit Transaction" : "Add New Transaction"}
        size="lg"
      >
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack>
            <SimpleGrid cols={2}>
              <Controller
                name="product_id"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="PRODUCT"
                    placeholder="SELECT PRODUCT"
                    required
                    data={productOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={form.formState.errors.product_id?.message as string}
                    searchable
                    className="block-input"
                  />
                )}
              />
              <Controller
                name="transaction_type"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="TYPE"
                    required
                    data={[{ value: 'purchase', label: 'PURCHASE' }, { value: 'sale', label: 'SALE' }]}
                    value={field.value}
                    onChange={field.onChange}
                    error={form.formState.errors.transaction_type?.message as string}
                    className="block-input"
                  />
                )}
              />
            </SimpleGrid>

            <SimpleGrid cols={2}>
              <TextInput
                label="DATE"
                type="date"
                required
                {...form.register("transaction_date")}
                error={form.formState.errors.transaction_date?.message as string}
                className="block-input"
              />
              <NumberInput
                label="QUANTITY"
                required
                min={1}
                value={form.watch("quantity")}
                onChange={(val) => form.setValue("quantity", Number(val))}
                error={form.formState.errors.quantity?.message as string}
                className="block-input"
              />
            </SimpleGrid>

            <SimpleGrid cols={2}>
              {form.watch("transaction_type") === "purchase" ? (
                <NumberInput
                  label="UNIT COST"
                  required
                  min={0}
                  decimalScale={2}
                  leftSection={CURRENCY_SYMBOL}
                  value={form.watch("unit_cost")}
                  onChange={(val) => form.setValue("unit_cost", Number(val))}
                  className="block-input"
                />
              ) : (
                <NumberInput
                  label="UNIT PRICE"
                  required
                  min={0}
                  decimalScale={2}
                  leftSection={CURRENCY_SYMBOL}
                  value={form.watch("unit_price")}
                  onChange={(val) => form.setValue("unit_price", Number(val))}
                  className="block-input"
                />
              )}
              <TextInput
                label={form.watch("transaction_type") === "purchase" ? "SUPPLIER" : "CUSTOMER"}
                required
                placeholder="NAME"
                {...form.register("party_name")}
                error={form.formState.errors.party_name?.message as string}
                className="block-input"
              />
            </SimpleGrid>

            {form.watch("transaction_type") === "purchase" && (
              <NumberInput
                label="TRANSPORT & OTHER COSTS"
                min={0}
                decimalScale={2}
                leftSection={CURRENCY_SYMBOL}
                value={form.watch("transport_other_cost")}
                onChange={(val) => form.setValue("transport_other_cost", Number(val))}
                className="block-input"
              />
            )}

            <TextInput
              label="REFERENCE NUMBER"
              placeholder="INVOICE/RECEIPT #"
              {...form.register("reference_number")}
              className="block-input"
            />

            <Textarea
              label="NOTES"
              placeholder="ADDITIONAL NOTES..."
              {...form.register("notes")}
              minRows={3}
              className="block-input"
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" color="gray" onClick={() => setIsModalOpen(false)}>CANCEL</Button>
              <Button type="submit" className="block-button">
                {editingTransaction ? "UPDATE" : "CREATE"} TRANSACTION
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
