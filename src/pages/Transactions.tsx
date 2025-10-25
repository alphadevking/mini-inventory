import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetch } from "@/lib/api";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { usePageState } from "@/hooks/usePageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TransactionCreateSchema, TransactionUpdateSchema, type TransactionCreate, type TransactionUpdate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Transaction, Product } from "@/types";


export default function Transactions() {
  const { data: transactionsData, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useFetch<Transaction[]>("/api/transactions");
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useFetch<Product[]>("/api/products");
  const { isRefreshing, handleRefresh } = usePageState();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  // React Hook Form with Zod validation
  const form = useForm({
    resolver: zodResolver(TransactionCreateSchema),
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

        const matchesDate = (!startDate || transaction.transaction_date >= startDate) &&
                           (!endDate || transaction.transaction_date <= endDate);

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

      // Calculate total_amount based on transaction type
      const calculatedTotal = data.transaction_type === "purchase"
        ? ((data.unit_cost || 0) * (data.quantity || 0)) + (data.transport_other_cost || 0)
        : (data.unit_price || 0) * (data.quantity || 0);

      const submitData = {
        ...data,
        total_amount: calculatedTotal
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        toast.success(editingTransaction ? "Transaction updated successfully!" : "Transaction created successfully!");
        setIsDialogOpen(false);
        setEditingTransaction(null);
        resetForm();
        refetchTransactions();
      } else {
        const errorData = await response.json();
        console.error("Failed to save transaction:", errorData);

        // Enhanced error handling
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorData.detail.forEach((error: any) => {
              toast.error(`${error.loc?.join('.')}: ${error.msg}`);
            });
          } else {
            toast.error(`Error: ${errorData.detail}`);
          }
        } else {
          toast.error("Failed to save transaction. Please try again.");
        }
      }
    } catch (err) {
      console.error("Failed to save transaction:", err);
      toast.error("Network error. Please check your connection and try again.");
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
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const response = await fetch(`/api/transactions/${id}`, {
          method: "DELETE"
        });
        if (response.ok) {
          refetchTransactions();
        }
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
    return type === "sale" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
  };

  const getTransactionTypeLabel = (type: string) => {
    return type === "sale" ? "Sale" : "Purchase";
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

  const totalTransactions = transactions.length;
  const purchaseCount = transactions.filter(t => t.transaction_type === "purchase").length;
  const salesCount = transactions.filter(t => t.transaction_type === "sale").length;

  if (transactionsLoading || productsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState
          title="Transactions"
          description="Loading your transaction history..."
          cardCount={3}
          showCharts={false}
        />
      </div>
    );
  }

  if (transactionsError || productsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error Loading Transactions"
          description={`Failed to load transactions: ${(transactionsError || productsError)?.message}`}
          onRetry={() => {
            refetchTransactions();
            refetchProducts();
          }}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <PageHeader
        title="Transactions"
        description="Manage all inventory transactions"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingTransaction(null);
                resetForm();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction ? "Update transaction details" : "Create a new inventory transaction"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                        </FormControl>
                                            <SelectContent>
                          {products.length === 0 ? (
                            <SelectItem value="no-products" disabled>
                              No products available
                            </SelectItem>
                          ) : (
                            products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {product.category?.name} ({product.subcategory?.name})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                  </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transaction_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                        </FormControl>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="sale">Sale</SelectItem>
                    </SelectContent>
                  </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transaction_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                  <Input
                    type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                  <Input
                    type="number"
                    min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {form.watch("transaction_type") === "purchase" ? (
                  <FormField
                    control={form.control}
                    name="unit_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="unit_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price *</FormLabel>
                        <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="party_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("transaction_type") === "purchase" ? "Supplier" : "Customer"} *
                      </FormLabel>
                      <FormControl>
                  <Input
                          {...field}
                          placeholder={form.watch("transaction_type") === "purchase" ? "Supplier name" : "Customer name"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("transaction_type") === "purchase" && (
                <FormField
                  control={form.control}
                  name="transport_other_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport & Other Costs</FormLabel>
                      <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                <Input
                        {...field}
                  placeholder="Invoice/Receipt number"
                />
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
                <Textarea
                        {...field}
                  placeholder="Additional notes..."
                  rows={3}
                />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!form.formState.isValid}>
                  {editingTransaction ? "Update" : "Create"} Transaction
                </Button>
              </div>
            </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Overview Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Badge variant="secondary">{totalTransactions}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {purchaseCount} purchases, {salesCount} sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Badge variant="secondary">Purchase</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPurchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.transaction_type === "purchase").length} purchase transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Badge variant="secondary">Sale</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {transactions.filter(t => t.transaction_type === "sale").length} sale transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex gap-2 items-center text-lg sm:text-xl">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by party, reference, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filter-type">Transaction Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="sale">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">All Transactions</CardTitle>
          <CardDescription className="text-sm">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[80px]">Type</TableHead>
                  <TableHead className="min-w-[150px]">Product</TableHead>
                  <TableHead className="min-w-[80px]">Qty</TableHead>
                  <TableHead className="min-w-[120px] hidden sm:table-cell">Party</TableHead>
                  <TableHead className="min-w-[100px]">Amount</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Reference</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="py-3 sm:py-4 text-sm">{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <Badge className={`${getTransactionTypeColor(transaction.transaction_type)} text-xs`}>
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4">
                      {transaction.product ? (
                        <div>
                          <div className="font-medium text-sm sm:text-base truncate">{transaction.product.name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                            {transaction.product.category?.name} - {transaction.product.subcategory?.name}
                          </div>
                          <div className="text-xs text-gray-500 sm:hidden">
                            {transaction.party_name || "No party"}
                          </div>
                        </div>
                      ) : (
                        "Unknown Product"
                      )}
                    </TableCell>
                    <TableCell className="py-3 sm:py-4 text-sm font-medium">{transaction.quantity}</TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell">{transaction.party_name || "-"}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      {transaction.transaction_type === "purchase" ? (
                        <div>
                          <div className="text-sm font-medium">${(transaction.unit_cost || 0).toFixed(2)}</div>
                          {(transaction.transport_other_cost || 0) > 0 && (
                            <div className="text-xs text-gray-500">
                              +${(transaction.transport_other_cost || 0).toFixed(2)} transport
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-medium">${(transaction.unit_price || 0).toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell text-sm">{transaction.reference_number || "-"}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                          className="text-xs px-2 py-1 h-8 sm:h-9"
                        >
                          <span className="hidden sm:inline">Edit</span>
                          <span className="sm:hidden">✏️</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-700 text-xs px-2 py-1 h-8 sm:h-9"
                        >
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">🗑️</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
