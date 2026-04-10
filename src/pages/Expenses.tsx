import React, { useState, useEffect } from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import {
  Button,
  Card,
  Badge,
  TextInput,
  Textarea,
  Group,
  Title,
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
  ActionIcon
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { Plus, Edit, Trash2, MoreVertical, DollarSign, Calendar, FileText, Search, Download } from "lucide-react";
import { useFetch, apiRequest } from "@/lib/api";
import { LoadingState } from "@/components/LoadingState";
import { formatCurrency } from "@/lib/utils";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExpenseCreateSchema, type ExpenseCreate } from "@/lib/schemas";
import { toast } from "../components/Toast";

interface Expense {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  category: "rent" | "utilities" | "supplies" | "equipment" | "marketing" | "salary" | "other";
  reference_number?: string;
  vendor?: string;
  payment_method?: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
}

export default function Expenses() {
  const { data, loading, error, refetch } = useFetch<Expense[]>("/api/expenses");
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setPage] = useState(1);
  const itemsPerPage = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const form = useForm<ExpenseCreate>({
    resolver: zodResolver(ExpenseCreateSchema),
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      description: "",
      amount: 0,
      category: "other",
      reference_number: "",
      vendor: "",
      notes: ""
    }
  });

  const expenses = data || [];
  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (expense.vendor && expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedItems = filteredExpenses.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const handleSubmit = async (formData: ExpenseCreate) => {
    const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
    const method = editingExpense ? "PUT" : "POST";

    try {
      // Sanitize data: convert empty strings to null for optional fields
      const submissionData = {
        ...formData,
        reference_number: formData.reference_number === "" ? null : formData.reference_number,
        vendor: formData.vendor === "" ? null : formData.vendor,
        notes: formData.notes === "" ? null : formData.notes
      };

      await apiRequest(url, {
        method,
        body: JSON.stringify(submissionData),
      });

      toast.success(editingExpense ? "Expense updated successfully!" : "Expense created successfully!");
      setIsModalOpen(false);
      form.reset();
      refetch();
    } catch (error: unknown) {
      console.error("Error saving expense:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save expense. Please try again.");
    }
  };

  const openCreateModal = () => {
      setEditingExpense(null);
      form.reset({
        expense_date: new Date().toISOString().split('T')[0],
        description: "",
        amount: 0,
        category: "other",
        reference_number: "",
        vendor: "",
        notes: ""
      });
      setIsModalOpen(true);
    };

    const openEditModal = (expense: Expense) => {
      setEditingExpense(expense);
      form.reset({
        expense_date: expense.expense_date,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        reference_number: expense.reference_number || "",
        vendor: expense.vendor || "",
        notes: expense.notes || ""
      });
      setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this expense?")) return;
      try {
        await apiRequest(`/api/expenses/${id}`, { method: "DELETE" });
        toast.success("Expense deleted successfully!");
        refetch();
      } catch (error) {
        toast.error("Failed to delete expense.");
      }
    };

    const getCategoryBadge = (category: string) => {
      const colors: Record<string, string> = {
        rent: "blue",
        utilities: "cyan",
        supplies: "teal",
        equipment: "orange",
        marketing: "pink",
        salary: "indigo",
        other: "gray"
      };
      return <Badge color={colors[category] || "gray"} variant="light">{category}</Badge>;
    };

    if (loading && !data) return <LoadingState message="Loading expense records..." />;
    if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    // Compare as YYYY-MM strings to avoid UTC parse edge cases
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthExpenses = expenses
      .filter(e => e.expense_date.startsWith(currentMonth))
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    return (
      <Container size="xl" py="xl">
        <PageHeader
          title="Expenses"
          description="Track and manage business expenses"
          showRefresh={true}
          isRefreshing={isRefreshing}
          onRefresh={() => handleRefresh(refetch)}
        >
          <Button onClick={openCreateModal} leftSection={<Plus size={16} />}>New Expense</Button>
        </PageHeader>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="xl">
          <Paper className="block-card" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>TOTAL EXPENSES</Text>
                <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(totalExpenses)}</Text>
              </Stack>
              <DollarSign size={24} color="black" />
            </Group>
          </Paper>
          <Paper className="block-card" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>THIS MONTH</Text>
                <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(currentMonthExpenses)}</Text>
              </Stack>
              <Calendar size={24} color="black" />
            </Group>
          </Paper>
          <Paper className="block-card" p="md">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>AVG / ENTRY</Text>
                <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>
                  {expenses.length > 0 ? formatCurrency(totalExpenses / expenses.length) : formatCurrency(0)}
                </Text>
              </Stack>
              <FileText size={24} color="black" />
            </Group>
          </Paper>
        </SimpleGrid>

        <Paper className="block-card" p={0} style={{ overflow: 'hidden' }}>
          <Box p="md" style={{ borderBottom: '1px solid var(--echo-border)' }}>
            <Group justify="space-between">
              <TextInput
                placeholder="Search expenses..."
                leftSection={<Search size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, maxWidth: 400 }}
                className="block-input"
              />
              <Button variant="outline" color="dark" className="block-button" size="sm" leftSection={<Download size={16} />}>Export</Button>
            </Group>
          </Box>

          <Table verticalSpacing="sm" style={{ borderCollapse: 'collapse' }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Vendor</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedItems.map((expense) => (
                <Table.Tr key={expense.id}>
                  <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={500}>{new Date(expense.expense_date).toLocaleDateString()}</Text></Table.Td>
                  <Table.Td style={{ borderBottom: '1px solid black' }}>
                    <Text size="sm" fw={800}>{expense.description}</Text>
                    {expense.reference_number && <Text size="xs" color="dimmed" fw={500}>Ref: {expense.reference_number}</Text>}
                  </Table.Td>
                  <Table.Td style={{ borderBottom: '1px solid black' }}>
                    <Badge color="dark" variant="outline" style={{ borderRadius: 0, border: '1px solid black' }}>
                      {expense.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={700}>{expense.vendor || '-'}</Text></Table.Td>
                  <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={800}>{formatCurrency(expense.amount)}</Text></Table.Td>
                  <Table.Td style={{ borderBottom: '1px solid black' }}>
                    <Menu position="bottom-end">
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="dark"><MoreVertical size={16} /></ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Edit size={14} />} onClick={() => openEditModal(expense)} fw={700}>Edit</Menu.Item>
                        <Menu.Item color="black" leftSection={<Trash2 size={14} />} onClick={() => handleDelete(expense.id)} fw={700} style={{ background: '#fff0f0' }}>Delete</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {filteredExpenses.length > 0 && (
            <Group justify="center" p="md">
              <Pagination total={totalPages} value={activePage} onChange={setPage} />
            </Group>
          )}
        </Paper>

        <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Edit Expense" : "New Expense"} size="lg">
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Stack gap="md">
              <Group grow align="flex-start">
                <Controller
                  name="expense_date"
                  control={form.control}
                  render={({ field }) => (
                    <DateInput
                      label="EXPENSE DATE"
                      placeholder="PICK DATE"
                      required
                      value={field.value ? new Date(field.value) : null}
                      onChange={(val: string | Date | null) => {
                        if (val) {
                          const dateStr = typeof val !== 'string'
                            ? val.toISOString().split('T')[0]
                            : val.split('T')[0];
                          field.onChange(dateStr);
                        } else {
                          field.onChange("");
                        }
                      }}
                      className="block-input"
                    />
                  )}
                />
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field }) => (
                    <NumberInput
                      label="AMOUNT"
                      required
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

              <TextInput label="DESCRIPTION" placeholder="WHAT WAS THIS FOR?" required {...form.register("description")} className="block-input" />

              <Group grow align="flex-start">
                <Controller
                  name="category"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      label="CATEGORY"
                      required
                      data={[
                        { value: 'rent', label: 'RENT' },
                        { value: 'utilities', label: 'UTILITIES' },
                        { value: 'supplies', label: 'SUPPLIES' },
                        { value: 'equipment', label: 'EQUIPMENT' },
                        { value: 'marketing', label: 'MARKETING' },
                        { value: 'salary', label: 'SALARY' },
                        { value: 'other', label: 'OTHER' }
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      className="block-input"
                    />
                  )}
                />
                <TextInput label="VENDOR" placeholder="VENDOR NAME" {...form.register("vendor")} className="block-input" />
              </Group>

              <TextInput label="REFERENCE NUMBER" placeholder="INVOICE #, RECEIPT #, ETC." {...form.register("reference_number")} className="block-input" />

              <Textarea label="NOTES" placeholder="ADDITIONAL DETAILS..." minRows={2} {...form.register("notes")} className="block-input" />

              <Group justify="flex-end" mt="xl">
                <Button variant="light" color="gray" onClick={() => setIsModalOpen(false)}>CANCEL</Button>
                <Button type="submit" className="block-button" loading={form.formState.isSubmitting}>{editingExpense ? "UPDATE" : "CREATE"} EXPENSE</Button>
              </Group>
            </Stack>
          </form>
        </Modal>
      </Container>
    );
}