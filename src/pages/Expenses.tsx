import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit, Trash2, MoreHorizontal, DollarSign, Calendar, FileText, Search } from "lucide-react";
import { useFetch } from "@/lib/api";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { usePageState } from "@/hooks/usePageState";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExpenseCreateSchema, ExpenseUpdateSchema, type ExpenseCreate, type ExpenseUpdate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { data, loading, error, refetch } = useFetch<Expense[]>("/api/expenses");
  const { isRefreshing, handleRefresh } = usePageState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // React Hook Form with Zod validation
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

  useEffect(() => {
    if (data) {
      setExpenses(data);
      setFilteredExpenses(data);
    }
  }, [data]);

  // Filter expenses based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredExpenses(expenses);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = expenses.filter(expense =>
      expense.description.toLowerCase().includes(lowercasedSearch) ||
      expense.category.toLowerCase().includes(lowercasedSearch) ||
      (expense.vendor && expense.vendor.toLowerCase().includes(lowercasedSearch)) ||
      (expense.payment_method && expense.payment_method.toLowerCase().includes(lowercasedSearch))
    );

    setFilteredExpenses(filtered);
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, expenses]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const handleSubmit = async (data: ExpenseCreate) => {
    const url = editingExpense
      ? `/api/expenses/${editingExpense.id}`
      : "/api/expenses";

    const method = editingExpense ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingExpense ? "Expense updated successfully!" : "Expense created successfully!");
        setIsDialogOpen(false);
        form.reset();
        refetch();
      } else {
        const errorData = await response.json();
        toast.error("Failed to save expense. Please try again.");
        console.error("Error saving expense:", errorData);
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    form.reset({
      expense_date: expense.expense_date,
      description: expense.description,
      amount: expense.amount,
      category: expense.category as "supplies" | "equipment" | "utilities" | "rent" | "other",
      reference_number: expense.reference_number || "",
      vendor: expense.vendor || "",
      notes: expense.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        const response = await fetch(`/api/expenses/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          refetch();
        }
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingExpense(null);
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      rent: "default",
      utilities: "secondary",
      supplies: "outline",
      equipment: "destructive",
      marketing: "default",
      salary: "secondary",
      other: "outline"
    } as const;

    return (
      <Badge variant={variants[category as keyof typeof variants]}>
        {category}
      </Badge>
    );
  };

  const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
    const data = expenses.map(expense => ({
      ID: expense.id,
      'Expense Date': expense.expense_date,
      'Description': expense.description,
      'Amount': expense.amount,
      'Category': expense.category,
      'Reference Number': expense.reference_number || '',
      'Vendor': expense.vendor || '',
      'Payment Method': expense.payment_method || '',
      'Notes': expense.notes || '',
      'Created At': expense.created_at
    }));

    const columns = [
      { header: 'ID', dataKey: 'ID' },
      { header: 'Expense Date', dataKey: 'Expense Date' },
      { header: 'Description', dataKey: 'Description' },
      { header: 'Amount', dataKey: 'Amount' },
      { header: 'Category', dataKey: 'Category' },
      { header: 'Vendor', dataKey: 'Vendor' },
      { header: 'Payment Method', dataKey: 'Payment Method' }
    ];

    switch (type) {
      case 'excel':
        exportToExcel(data, 'expenses');
        break;
      case 'csv':
        exportToCSV(data, 'expenses');
        break;
      case 'pdf':
        exportToPDF(data, columns, 'expenses');
        break;
    }
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalExpenseCount = expenses.length;
  const averageExpense = totalExpenseCount > 0 ? totalExpenses / totalExpenseCount : 0;

  // Calculate expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category || 'uncategorized';
    acc[category] = (acc[category] || 0) + (expense.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Get top expense category
  const topCategory = Object.entries(expensesByCategory).reduce((max, [category, amount]) =>
    amount > max.amount ? { category, amount } : max,
    { category: 'None', amount: 0 }
  );

  // Pagination controls
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex gap-2 items-center justify-center space-x-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <div className="flex gap-2 items-center space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(page)}
              className="w-8 h-8 p-0"
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error Loading Expenses"
          description={`Failed to load expenses: ${error.message}`}
          onRetry={refetch}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState
          title="Expenses"
          description="Loading your expense records..."
          cardCount={3}
          showCharts={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <PageHeader
        title="Expenses"
        description="Track and manage business expenses"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <div className="flex gap-2 space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search expenses..."
                className="pl-8 w-[200px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Expense
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? "Edit Expense" : "New Expense"}
                </DialogTitle>
                <DialogDescription>
                  {editingExpense ? "Update expense information" : "Add a new expense record"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="expense_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter expense description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rent">Rent</SelectItem>
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="supplies">Supplies</SelectItem>
                            <SelectItem value="equipment">Equipment</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="salary">Salary</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter vendor name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reference_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter reference number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter additional notes" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!form.formState.isValid}>
                    {editingExpense ? "Update" : "Create"} Expense
                  </Button>
                </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {expenses.length} expense records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${expenses
                .filter(expense => {
                  const expenseDate = new Date(expense.expense_date);
                  const now = new Date();
                  return expenseDate.getMonth() === now.getMonth() &&
                         expenseDate.getFullYear() === now.getFullYear();
                })
                .reduce((sum, expense) => sum + (expense.amount || 0), 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${averageExpense.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Top category: {topCategory.category} (${topCategory.amount.toFixed(2)})
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Expense Records</CardTitle>
          <CardDescription className="text-sm">
            {filteredExpenses.length} expense records found {searchTerm && `for "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[150px]">Description</TableHead>
                  <TableHead className="min-w-[100px]">Category</TableHead>
                  <TableHead className="min-w-[120px] hidden sm:table-cell">Vendor</TableHead>
                  <TableHead className="min-w-[100px]">Amount</TableHead>
                  <TableHead className="min-w-[120px] hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="py-3 sm:py-4 text-sm">{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <div>
                        <div className="font-medium text-sm sm:text-base truncate">{expense.description}</div>
                        {expense.reference_number && (
                          <div className="text-xs sm:text-sm text-gray-500">Ref: {expense.reference_number}</div>
                        )}
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {expense.vendor || "No vendor"} • {expense.payment_method || "No method"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4">{getCategoryBadge(expense.category)}</TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell">{expense.vendor || "-"}</TableCell>
                    <TableCell className="py-3 sm:py-4 font-medium text-sm">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell text-sm">{expense.payment_method || "-"}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  );
}