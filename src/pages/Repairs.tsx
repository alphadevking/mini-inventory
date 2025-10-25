import React, { useState, useEffect } from "react";
import { useFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { ErrorDisplay } from "@/components/ui/error-display";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
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
import { Plus, Edit, Trash2, Eye, MoreHorizontal, Wrench, Clock, CheckCircle, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RepairCreateSchema, RepairUpdateSchema, type RepairCreate, type RepairUpdate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

interface Repair {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  phone_model: string;
  issue_description: string;
  repair_status: "pending" | "in_progress" | "completed" | "cancelled";
  estimated_cost?: number;
  estimated_days?: number;
  notes?: string;
  created_at: string;
}

export default function Repairs() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [filteredRepairs, setFilteredRepairs] = useState<Repair[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { data, loading, error, refetch } = useFetch<Repair[]>("/api/repairs");
  const { isRefreshing, handleRefresh } = usePageState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);

  // React Hook Form with Zod validation
  const form = useForm({
    resolver: zodResolver(RepairCreateSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      phone_model: "",
      issue_description: "",
      status: "pending" as const,
      estimated_cost: 0,
      estimated_days: 1,
      notes: ""
    }
  });

  useEffect(() => {
    if (data) {
      setRepairs(data);
      setFilteredRepairs(data);
    }
  }, [data]);

  // Filter repairs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRepairs(repairs);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = repairs.filter(repair =>
      repair.customer_name.toLowerCase().includes(lowercasedSearch) ||
      repair.customer_phone.toLowerCase().includes(lowercasedSearch) ||
      repair.phone_model.toLowerCase().includes(lowercasedSearch) ||
      repair.repair_status.toLowerCase().includes(lowercasedSearch) ||
      repair.issue_description.toLowerCase().includes(lowercasedSearch)
    );

    setFilteredRepairs(filtered);
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, repairs]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRepairs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);

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

  const handleSubmit = async (data: RepairCreate) => {
    const url = editingRepair
      ? `/api/repairs/${editingRepair.id}`
      : "/api/repairs";

    const method = editingRepair ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingRepair ? "Repair updated successfully!" : "Repair created successfully!");
        setIsDialogOpen(false);
        form.reset();
        refetch();
      } else {
        const errorData = await response.json();
        toast.error("Failed to save repair. Please try again.");
        console.error("Error saving repair:", errorData);
      }
    } catch (error) {
      console.error("Error saving repair:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleEdit = (repair: Repair) => {
    setEditingRepair(repair);
    form.reset({
      customer_name: repair.customer_name,
      customer_phone: repair.customer_phone,
      customer_email: repair.customer_email || "",
      phone_model: repair.phone_model,
      issue_description: repair.issue_description,
      status: repair.repair_status as "pending" | "in_progress" | "completed" | "cancelled",
      estimated_cost: 0,
      estimated_days: 1,
      notes: ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this repair?")) {
      try {
        const response = await fetch(`/api/repairs/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          refetch();
        }
      } catch (error) {
        console.error("Error deleting repair:", error);
      }
    }
  };

  const resetForm = () => {
    form.reset();
    setEditingRepair(null);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      in_progress: "default",
      completed: "default",
      cancelled: "destructive"
    } as const;

    const icons = {
      pending: Clock,
      in_progress: Wrench,
      completed: CheckCircle,
      cancelled: CheckCircle
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error Loading Repairs"
          description={`Failed to load repairs: ${error.message}`}
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
          title="Repairs"
          description="Loading your repair records..."
          cardCount={3}
          showCharts={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Repairs"
        description="Manage customer repairs and service requests"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <div className="flex gap-2 space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search repairs..."
                className="pl-8 w-[200px] md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Repair
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRepair ? "Edit Repair" : "New Repair"}
                </DialogTitle>
                <DialogDescription>
                  {editingRepair ? "Update repair information" : "Create a new repair record"}
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
                  <FormField
                    control={form.control}
                    name="phone_model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Model *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone model" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="issue_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Description *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the issue" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Repair Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estimated_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Cost</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimated_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                          <Textarea placeholder="Additional notes" rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRepair ? "Update" : "Create"} Repair
                  </Button>
                </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      {/* Overview Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex gap-2 flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repairs.length}</div>
            <p className="text-xs text-muted-foreground">
              All repair records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex gap-2 flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Repairs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repairs.filter(r => r.repair_status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex gap-2 flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Repairs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {repairs.filter(r => r.repair_status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex gap-2 flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">💰</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${repairs.reduce((sum, r) => sum + (r.estimated_cost || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From estimated costs
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repair Records</CardTitle>
          <CardDescription>
            {filteredRepairs.length} repair records found {searchTerm && `for "${searchTerm}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Estimated Days</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((repair) => (
                <TableRow key={repair.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{repair.customer_name}</div>
                      <div className="text-sm text-gray-500">{repair.customer_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{repair.phone_model}</TableCell>
                  <TableCell>{getStatusBadge(repair.repair_status)}</TableCell>
                  <TableCell>
                    ${(repair.estimated_cost || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {repair.estimated_days || 1} days
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(repair)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(repair.id)}
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
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  );
}