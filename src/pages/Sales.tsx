import React, { useState, useEffect } from "react";
import { useFetch } from "@/lib/api";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { usePageState } from "@/hooks/usePageState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { Transaction, Product } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TransactionCreateSchema, type TransactionCreate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Sales() {
  const { data: transactionsData, loading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useFetch<Transaction[]>("/api/transactions");
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useFetch<Product[]>("/api/products");
  const { isRefreshing, handleRefresh } = usePageState();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // React Hook Form with Zod validation
  const form = useForm({
    resolver: zodResolver(TransactionCreateSchema),
    defaultValues: {
      product_id: "",
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: "sale" as const,
      quantity: 1,
      unit_cost: undefined,
      unit_price: undefined, // Start with undefined to trigger validation
      party_name: "",
      transport_other_cost: 0,
      reference_number: "",
      notes: ""
    }
  });

  // Watch for product selection changes to auto-fill unit price
  const selectedProductId = form.watch("product_id");
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Auto-fill unit price and cost when product is selected
  useEffect(() => {
    if (selectedProduct) {
      // Auto-fill unit price with suggested sell price
      if (selectedProduct.suggested_sell_price) {
        form.setValue("unit_price", selectedProduct.suggested_sell_price);
      }
      // Auto-fill unit cost with last purchase cost
      if (selectedProduct.last_purchase_cost) {
        form.setValue("unit_cost", selectedProduct.last_purchase_cost);
      }
    }
  }, [selectedProduct, form]);

  useEffect(() => {
    if (transactionsData) {
      // Filter for sales transactions only
      const salesTransactions = transactionsData.filter(t => t.transaction_type === "sale");
      setTransactions(salesTransactions);
      setFilteredTransactions(salesTransactions);
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
          transaction.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });
      setFilteredTransactions(filtered);
    }
  }, [searchTerm, transactions]);

  const handleSubmit = async (data: TransactionCreate) => {
    try {
      // Ensure unit_price is set for sales
      if (!data.unit_price || data.unit_price <= 0) {
        toast.error("Please enter a valid unit price");
        return;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("Sale recorded successfully!");
        setIsAddDialogOpen(false);
        form.reset();
        refetchTransactions();
      } else {
        const errorData = await response.json();
        console.error("Failed to record sale:", errorData);
        toast.error(`Failed to record sale: ${errorData.detail || "Please try again."}`);
      }
    } catch (err) {
      console.error("Failed to record sale:", err);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const resetForm = () => {
    form.reset({
      product_id: "",
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: "sale",
      quantity: 1,
      unit_cost: undefined,
      unit_price: undefined,
      party_name: "",
      transport_other_cost: 0,
      reference_number: "",
      notes: ""
    });
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

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


  const totalSales = transactions.reduce((sum, t) => {
    const unitPrice = t.unit_price || 0;
    const quantity = t.quantity || 0;
    return sum + (unitPrice * quantity);
  }, 0);

  const todaySales = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return transactionDate === today;
  }).reduce((sum, t) => {
    const unitPrice = t.unit_price || 0;
    const quantity = t.quantity || 0;
    return sum + (unitPrice * quantity);
  }, 0);

  const totalTransactions = transactions.length;
  const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  if (transactionsError || productsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error Loading Sales"
          description={`Failed to load sales: ${(transactionsError || productsError)?.message}`}
          onRetry={() => {
            refetchTransactions();
            refetchProducts();
          }}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  if (transactionsLoading || productsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState
          title="Sales"
          description="Loading your sales transactions..."
          cardCount={3}
          showCharts={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
      <PageHeader
        title="Sales"
        description="Manage your sales transactions"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Sale
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Sale</DialogTitle>
              <DialogDescription>
                Record a new sales transaction
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
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {product.category?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="unit_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder={selectedProduct?.last_purchase_cost ? `Cost: $${selectedProduct.last_purchase_cost.toFixed(2)}` : "Enter cost"}
                          />
                        </FormControl>
                        {selectedProduct?.last_purchase_cost && (
                          <p className="text-xs text-muted-foreground">
                            Last cost: ${selectedProduct.last_purchase_cost.toFixed(2)} (editable)
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder={selectedProduct?.suggested_sell_price ? `Suggested: $${selectedProduct.suggested_sell_price.toFixed(2)}` : "Enter price"}
                          />
                        </FormControl>
                        {selectedProduct?.suggested_sell_price && (
                          <p className="text-xs text-muted-foreground">
                            Suggested price: ${selectedProduct.suggested_sell_price.toFixed(2)} (editable)
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="party_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!form.formState.isValid}>
                    Add Sale
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Badge variant="secondary">{totalTransactions} transactions</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average: ${averageOrderValue.toFixed(2)} per order
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <Badge variant="secondary">Today</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todaySales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Sales revenue today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <Badge variant="secondary">Avg</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${transactions.length > 0 ? (totalSales / transactions.length).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average transaction value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle className="text-lg sm:text-xl">Sales Transactions</CardTitle>
              <CardDescription className="text-sm">
                View and manage all sales transactions
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <Download className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <Filter className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Filter</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 sm:max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[150px]">Product</TableHead>
                  <TableHead className="min-w-[80px]">Qty</TableHead>
                  <TableHead className="min-w-[100px]">Unit Price</TableHead>
                  <TableHead className="min-w-[100px]">Total</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Payment</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Reference</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="py-3 sm:py-4 text-sm">{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <div>
                        <div className="font-medium text-sm sm:text-base truncate">{transaction.product?.name || 'Unknown Product'}</div>
                        <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">{transaction.product?.category?.name || 'No Category'}</div>
                        <div className="text-xs text-gray-500 sm:hidden">Qty: {transaction.quantity}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4 text-sm font-medium hidden sm:table-cell">{transaction.quantity}</TableCell>
                    <TableCell className="py-3 sm:py-4 text-sm">${(transaction.unit_price || 0).toFixed(2)}</TableCell>
                    <TableCell className="py-3 sm:py-4 font-medium text-sm">${((transaction.unit_price || 0) * transaction.quantity).toFixed(2)}</TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs">Cash</Badge>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4 font-mono text-xs hidden sm:table-cell">{transaction.reference_number}</TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="hidden sm:inline">View</span>
                        <span className="sm:hidden">👁️</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {renderPagination()}

          {currentItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No sales transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}