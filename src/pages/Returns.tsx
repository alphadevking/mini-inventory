import React, { useState, useEffect } from "react";
import { useFetch } from "@/lib/api";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { usePageState } from "@/hooks/usePageState";
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
import { Plus, Edit, Trash2, MoreHorizontal, RotateCcw, DollarSign, User, Package, Search } from "lucide-react";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReturnCreateSchema, ReturnUpdateSchema, type ReturnCreate, type ReturnUpdate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Return } from "@/types";

interface Product {
  id: string;
  phone_model: string;
  part_type: string;
  variant: string;
}

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { data: returnsData, loading: returnsLoading, error: returnsError, refetch: refetchReturns } = useFetch<Return[]>("/api/returns");
  const { data: productsData, loading: productsLoading, error: productsError, refetch: refetchProducts } = useFetch<Product[]>("/api/products/");
  const { isRefreshing, handleRefresh } = usePageState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);

  // React Hook Form with Zod validation
  const form = useForm<ReturnCreate>({
    resolver: zodResolver(ReturnCreateSchema),
    defaultValues: {
      product_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      reason: "",
      action_taken: "refund",
      status: "pending",
      refund_amount: 0,
      notes: ""
    }
  });

  useEffect(() => {
    if (returnsData) {
      setReturns(returnsData);
      setFilteredReturns(returnsData);
    }
  }, [returnsData]);

  useEffect(() => {
    if (productsData) {
      setProducts(productsData);
    }
  }, [productsData]);

  // Filter returns based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReturns(returns);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = returns.filter(returnItem =>
      returnItem.customer_name.toLowerCase().includes(lowercasedSearch) ||
      returnItem.customer_phone.toLowerCase().includes(lowercasedSearch) ||
      ((returnItem.product as any)?.phone_model?.toLowerCase().includes(lowercasedSearch)) ||
      returnItem.action_taken.toLowerCase().includes(lowercasedSearch) ||
      returnItem.status.toLowerCase().includes(lowercasedSearch) ||
      returnItem.reason.toLowerCase().includes(lowercasedSearch)
    );

    setFilteredReturns(filtered);
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, returns]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);

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

  const handleSubmit = async (data: ReturnCreate) => {
    const url = editingReturn
      ? `/api/returns/${editingReturn.id}`
      : "/api/returns/";

    const method = editingReturn ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingReturn ? "Return updated successfully!" : "Return created successfully!");
        setIsDialogOpen(false);
        form.reset();
        refetchReturns();
      } else {
        const errorData = await response.json();
        toast.error("Failed to save return. Please try again.");
        console.error("Error saving return:", errorData);
      }
    } catch (error) {
      console.error("Error saving return:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleEdit = (returnItem: Return) => {
    setEditingReturn(returnItem);
    form.reset({
      product_id: returnItem.product_id,
      customer_name: returnItem.customer_name,
      customer_phone: returnItem.customer_phone,
      customer_email: returnItem.customer_email || "",
      reason: returnItem.reason,
      action_taken: returnItem.action_taken,
      refund_amount: returnItem.refund_amount || 0,
      notes: returnItem.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this return?")) {
      try {
        const response = await fetch(`/api/returns/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          refetchReturns();
        }
      } catch (error) {
        console.error("Error deleting return:", error);
      }
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingReturn(null);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      resolved: "outline"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status}
      </Badge>
    );
  };

  const getActionBadge = (action: string) => {
    const variants = {
      refund: "default",
      repair: "secondary",
      exchange: "outline",
      replacement: "destructive"
    } as const;

    return (
      <Badge variant={variants[action as keyof typeof variants]}>
        {action}
      </Badge>
    );
  };

  const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
    const data = returns.map(returnItem => ({
      ID: returnItem.id,
      'Customer Name': returnItem.customer_name,
      'Customer Phone': returnItem.customer_phone,
      'Customer Email': returnItem.customer_email || '',
      'Product': returnItem.product ?
        `${(returnItem.product as any).phone_model} - ${(returnItem.product as any).part_type} ${(returnItem.product as any).variant}` :
        `Product ID: ${returnItem.product_id}`,
      'Reason': returnItem.reason,
      'Action Taken': returnItem.action_taken,
      'Status': returnItem.status,
      'Return Date': returnItem.return_date,
      'Refund Amount': returnItem.refund_amount || 0,
      'Notes': returnItem.notes || '',
      'Created At': returnItem.created_at
    }));

    const columns = [
      { header: 'ID', dataKey: 'ID' },
      { header: 'Customer Name', dataKey: 'Customer Name' },
      { header: 'Customer Phone', dataKey: 'Customer Phone' },
      { header: 'Product', dataKey: 'Product' },
      { header: 'Action Taken', dataKey: 'Action Taken' },
      { header: 'Status', dataKey: 'Status' },
      { header: 'Refund Amount', dataKey: 'Refund Amount' }
    ];

    switch (type) {
      case 'excel':
        exportToExcel(data, 'returns');
        break;
      case 'csv':
        exportToCSV(data, 'returns');
        break;
      case 'pdf':
        exportToPDF(data, columns, 'returns');
        break;
    }
  };

  const totalRefunds = returns.reduce((sum, returnItem) => sum + (returnItem.refund_amount || 0), 0);
  const totalReturns = returns.length;
  const pendingReturns = returns.filter(returnItem => returnItem.status === "pending").length;
  const resolvedReturns = returns.filter(returnItem => returnItem.status === "resolved").length;
  const averageRefund = totalReturns > 0 ? totalRefunds / totalReturns : 0;

  // Calculate returns by reason
  const returnsByReason = returns.reduce((acc, returnItem) => {
    const reason = returnItem.reason || 'other';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get most common return reason
  const topReason = Object.entries(returnsByReason).reduce((max, [reason, count]) =>
    count > max.count ? { reason, count } : max,
    { reason: 'None', count: 0 }
  );

  const loading = returnsLoading || productsLoading;
  const error = returnsError || productsError;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error Loading Returns"
          description={`Failed to load data: ${error.message}`}
          onRetry={() => {
            refetchReturns();
            refetchProducts();
          }}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  if (loading && (!returnsData || !productsData)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState
          title="Returns"
          description="Loading your return records..."
          cardCount={3}
          showCharts={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <PageHeader
        title="Returns"
        description="Manage product returns and refunds"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <div className="flex gap-2 space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search returns..."
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
                  New Return
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingReturn ? "Edit Return" : "New Return"}
                </DialogTitle>
                <DialogDescription>
                  {editingReturn ? "Update return information" : "Create a new return record"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Phone *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customer_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.phone_model} - {product.part_type} {product.variant}
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
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Return *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter reason for return" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="action_taken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action Taken *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="refund">Refund</SelectItem>
                            <SelectItem value="repair">Repair</SelectItem>
                            <SelectItem value="exchange">Exchange</SelectItem>
                            <SelectItem value="replacement">Replacement</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="refund_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Refund Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter refund amount"
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
                    {editingReturn ? "Update" : "Create"} Return
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
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReturns}</div>
            <p className="text-xs text-muted-foreground">
              {pendingReturns} pending, {resolvedReturns} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRefunds.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total refund amount issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Refund</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageRefund.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Top reason: {topReason.reason} ({topReason.count} cases)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Return Records</CardTitle>
          <CardDescription className="text-sm">
            {filteredReturns.length} return records found {searchTerm && `for "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Customer</TableHead>
                  <TableHead className="min-w-[150px]">Product</TableHead>
                  <TableHead className="min-w-[120px] hidden sm:table-cell">Reason</TableHead>
                  <TableHead className="min-w-[100px]">Action</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Date</TableHead>
                  <TableHead className="min-w-[100px] hidden sm:table-cell">Amount</TableHead>
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="py-3 sm:py-4">
                      <div>
                        <div className="font-medium text-sm sm:text-base">{returnItem.customer_name}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{returnItem.customer_phone}</div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {new Date(returnItem.return_date).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <div className="text-sm sm:text-base">
                        {returnItem.product ?
                          `${(returnItem.product as any).phone_model} - ${(returnItem.product as any).part_type} ${(returnItem.product as any).variant}` :
                          `Product ID: ${returnItem.product_id}`
                        }
                        <div className="text-xs text-gray-500 sm:hidden mt-1 truncate" title={returnItem.reason}>
                          {returnItem.reason}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell">
                      <div className="max-w-xs truncate" title={returnItem.reason}>
                        {returnItem.reason}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 sm:py-4">{getActionBadge(returnItem.action_taken)}</TableCell>
                    <TableCell className="py-3 sm:py-4">{getStatusBadge(returnItem.status)}</TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell text-sm">{new Date(returnItem.return_date).toLocaleDateString()}</TableCell>
                    <TableCell className="py-3 sm:py-4 hidden sm:table-cell text-sm">
                      {returnItem.refund_amount ? `$${returnItem.refund_amount.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="py-3 sm:py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(returnItem)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(returnItem.id)}
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