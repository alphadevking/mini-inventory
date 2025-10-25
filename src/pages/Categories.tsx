import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProductCategoryCreateSchema, ProductCategoryUpdateSchema, type ProductCategoryCreate, type ProductCategoryUpdate } from "@/lib/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ProductCategory as ProductCategoryType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
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
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter
} from "lucide-react";
import { Link } from "react-router";



export default function Categories() {
  const { data: categories, loading, error, refetch } = useFetch<ProductCategoryType[]>("/api/categories");
  const { isRefreshing, handleRefresh } = usePageState();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryType | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // React Hook Form with Zod validation
  const form = useForm<ProductCategoryCreate>({
    resolver: zodResolver(ProductCategoryCreateSchema),
    defaultValues: {
    name: "",
    description: "",
    icon: "",
    color: "#3B82F6"
    }
  });

  const handleInitializeCategories = async () => {
    try {
      const response = await fetch("/api/categories/initialize", {
        method: "POST"
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully initialized ${result.categories_created} categories and ${result.subcategories_created} subcategories!`);
        refetch();
      } else {
        const error = await response.json();
        toast.error(`Failed to initialize categories: ${error.detail}`);
      }
    } catch (error) {
      console.error("Failed to initialize categories:", error);
      toast.error("Failed to initialize categories. Please try again.");
    }
  };

  const handleResetCategories = async () => {
    if (confirm("Are you sure you want to reset all categories and subcategories? This action cannot be undone.")) {
      try {
        const response = await fetch("/api/categories/reset", {
          method: "POST"
        });
        if (response.ok) {
          toast.success("All categories and subcategories have been reset!");
          refetch();
        } else {
          const error = await response.json();
          toast.error(`Failed to reset categories: ${error.detail}`);
        }
      } catch (error) {
        console.error("Failed to reset categories:", error);
        toast.error("Failed to reset categories. Please try again.");
      }
    }
  };

  const handleSubmit = async (data: ProductCategoryCreate) => {
    try {
      const url = isEditMode && selectedCategory
        ? `/api/categories/${selectedCategory.id}`
        : "/api/categories";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(isEditMode ? "Category updated successfully!" : "Category created successfully!");
        refetch();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setIsEditMode(false);
        setSelectedCategory(null);
        form.reset();
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} category. Please try again.`);
      }
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} category:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} category. Please check the console for details.`);
    }
  };

  const handleEdit = (category: ProductCategoryType) => {
    setSelectedCategory(category);
    setIsEditMode(true);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color || "#3B82F6"
    });
    setIsEditDialogOpen(true);
  };


  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Category deleted successfully!");
        refetch();
      } else {
        toast.error("Failed to delete category. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category. Please check the console for details.");
    }
  };

  const openEditDialog = (category: ProductCategoryType) => {
    setSelectedCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color || "#3B82F6"
    });
    setIsEditDialogOpen(true);
  };

  const filteredCategories = categories?.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (loading) {
    return (
      <Container>
        <LoadingState
          title="Categories"
          description="Loading your product categories..."
          cardCount={0}
          showCharts={false}
        />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState
          title="Error Loading Categories"
          description={`Failed to load categories: ${error.message}`}
          onRetry={refetch}
          isRetrying={isRefreshing}
        />
      </Container>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <PageHeader
        title="Product Categories"
        description="Manage your product categories and their organization"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create Category</span>
            <span className="sm:hidden">Create</span>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col space-y-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleInitializeCategories} className="text-xs sm:text-sm">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Initialize Default Categories</span>
              <span className="sm:hidden">Initialize</span>
            </Button>
            <Button variant="outline" onClick={handleResetCategories} className="text-red-600 hover:text-red-700 text-xs sm:text-sm">
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Reset All</span>
              <span className="sm:hidden">Reset</span>
            </Button>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex gap-2 items-center justify-between">
                  <CardTitle className="flex gap-2 items-center space-x-2 text-lg">
                    {category.icon && <span className="text-2xl">{category.icon}</span>}
                    <span>{category.name}</span>
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/categories/${category.id}/subcategories`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Subcategories
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(category)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteCategory(category.id)}
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
                  {category.description || "No description available"}
                </p>
                <div className="flex gap-2 items-center justify-between">
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {category.color && (
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Settings className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 mb-2">No categories found</p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Create your first category to get started"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Category
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new product category to organize your inventory.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Category description" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="flex gap-2 justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
                <Button type="submit" disabled={!form.formState.isValid}>
                  Create Category
                </Button>
            </div>
          </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Category description" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <div className="flex gap-2 justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
                <Button type="submit" disabled={!form.formState.isValid}>
                  Update Category
                </Button>
            </div>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
