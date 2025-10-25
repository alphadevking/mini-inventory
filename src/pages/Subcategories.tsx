import React, { useState } from "react";
import { useParams, Link } from "react-router";
import { useFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { usePageState } from "@/hooks/usePageState";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ArrowLeft,
  Search,
  Settings
} from "lucide-react";
import { ProductCategory, ProductSubcategory } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProductSubcategoryCreateSchema, ProductSubcategoryUpdateSchema, type ProductSubcategoryCreate, type ProductSubcategoryUpdate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

interface ProductAttributeDefinition {
  id: string;
  name: string;
  display_name: string;
  data_type: string;
  required: boolean;
  default_value?: string;
  options?: string;
  unit?: string;
  order: number;
  is_active: boolean;
}

export default function Subcategories() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { data: category, loading: categoryLoading, error: categoryError } = useFetch<ProductCategory>(`/api/categories/${categoryId}`);
  const { data: subcategories, loading: subcategoriesLoading, error: subcategoriesError, refetch } = useFetch<ProductSubcategory[]>(`/api/categories/${categoryId}/subcategories`);
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProductSubcategory | null>(null);

  // React Hook Form with Zod validation
  const createForm = useForm<ProductSubcategoryCreate>({
    resolver: zodResolver(ProductSubcategoryCreateSchema),
    defaultValues: {
      name: "",
      category_id: categoryId || "",
      description: "",
      icon: ""
    }
  });

  const editForm = useForm<ProductSubcategoryUpdate>({
    resolver: zodResolver(ProductSubcategoryUpdateSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: ""
    }
  });

  const handleCreateSubcategory = async (data: ProductSubcategoryCreate) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}/subcategories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("Subcategory created successfully!");
        refetch();
        setIsCreateDialogOpen(false);
        createForm.reset();
      } else {
        const errorData = await response.json();
        toast.error("Failed to create subcategory. Please try again.");
        console.error("Error creating subcategory:", errorData);
      }
    } catch (error) {
      console.error("Error creating subcategory:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleEditSubcategory = async (data: ProductSubcategoryUpdate) => {
    if (!selectedSubcategory) return;

    try {
      const response = await fetch(`/api/categories/subcategories/${selectedSubcategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("Subcategory updated successfully!");
        refetch();
        setIsEditDialogOpen(false);
        editForm.reset();
        setSelectedSubcategory(null);
      } else {
        const errorData = await response.json();
        toast.error("Failed to update subcategory. Please try again.");
        console.error("Error updating subcategory:", errorData);
      }
    } catch (error) {
      console.error("Error updating subcategory:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    try {
      const response = await fetch(`/api/categories/subcategories/${subcategoryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error("Failed to delete subcategory:", error);
    }
  };

  const openEditDialog = (subcategory: ProductSubcategory) => {
    setSelectedSubcategory(subcategory);
    editForm.reset({
      name: subcategory.name,
      description: subcategory.description || "",
      icon: subcategory.icon || ""
    });
    setIsEditDialogOpen(true);
  };

  const filteredSubcategories = subcategories?.filter(subcategory =>
    subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subcategory.description && subcategory.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (categoryError || subcategoriesError) {
    return (
      <Container>
        <ErrorState
          title="Error Loading Subcategories"
          description={`Failed to load subcategories: ${(categoryError || subcategoriesError)?.message}`}
          onRetry={() => {
            refetch();
          }}
          isRetrying={isRefreshing}
        />
      </Container>
    );
  }

  if (categoryLoading || subcategoriesLoading) {
    return (
      <Container>
        <LoadingState
          title="Subcategories"
          description="Loading subcategories..."
          cardCount={3}
          showCharts={false}
        />
      </Container>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <PageHeader
        title={`${category?.name || 'Category'} Subcategories`}
        description={`Manage subcategories for ${category?.name || 'this category'}`}
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <div className="flex gap-2 space-x-2">
            <Button variant="outline" asChild>
              <Link to="/categories">
                Back to Categories
              </Link>
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Subcategory
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Search Bar */}
        <div className="flex gap-4 flex-col sm:flex-row mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search subcategories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Subcategories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredSubcategories.map((subcategory) => (
            <Card key={subcategory.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex gap-2 items-center justify-between">
                  <CardTitle className="flex gap-2 items-center space-x-2 text-lg">
                    {subcategory.icon && <span className="text-2xl">{subcategory.icon}</span>}
                    <span>{subcategory.name}</span>
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/subcategories/${subcategory.id}/attributes`}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Attributes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(subcategory)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSubcategory(subcategory.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  {subcategory.description || "No description available"}
                </p>
                <div className="flex gap-2 items-center justify-between">
                  <Badge variant="default">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSubcategories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Settings className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 mb-2">No subcategories found</p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Create your first subcategory to get started"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Subcategory
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Subcategory Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Subcategory</DialogTitle>
            <DialogDescription>
              Add a new subcategory under the {category?.name} category.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubcategory)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter subcategory description" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder="📱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!createForm.formState.isValid}>
                  Create Subcategory
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>
              Update the subcategory information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubcategory)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter subcategory description" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder="📱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!editForm.formState.isValid}>
                  Update Subcategory
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
