import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { usePageState } from "@/hooks/usePageState";
import ProductFilters from "@/components/ProductFilters";
import ProductFormZod from "@/components/ProductFormZod";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { ProductCreateSchema, ProductUpdateSchema, type ProductCreate, type ProductUpdate } from "@/lib/schemas";
import { Product } from "@/types";

export default function Products() {
  const { data: products, loading, error, refetch } = useFetch<Product[]>("/api/products");
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price" | "sku">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // React Hook Form with Zod validation
  const form = useForm({
    resolver: zodResolver(ProductCreateSchema),
    defaultValues: {
      name: "",
      category_id: "",
      subcategory_id: null,
      brand: "",
      model: "",
      sku: "",
      barcode: null,
      dimensions: "",
      weight: undefined,
      weight_unit: "kg" as const,
      last_purchase_cost: 0,
      suggested_sell_price: 0,
      low_stock_threshold: 5,
      current_stock: 0,
      status: "active",
      description: "",
      supplier: "",
      image_url: null,
      attributes: {},
      is_active: true
    }
  });



  const handleCreateProduct = async (data: ProductCreate | ProductUpdate) => {
    try {

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success("Product created successfully!");
        setIsCreateDialogOpen(false);
        resetForm();
        refetch();
      } else {
        const errorData = await response.json();
        console.error("Failed to create product:", errorData);

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
          toast.error("Failed to create product. Please try again.");
        }
      }
    } catch (error) {
      console.error("Failed to create product:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleEditProduct = async (data: ProductCreate | ProductUpdate) => {
    if (!editingProduct) return;

    try {
      const response = await fetch(`/api/products/id/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast.success("Product updated successfully!");
        setIsEditDialogOpen(false);
        setEditingProduct(null);
        resetForm();
        refetch();
      } else {
        const errorData = await response.json();
        console.error("Failed to update product:", errorData);

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
          toast.error("Failed to update product. Please try again.");
        }
      }
    } catch (error) {
      console.error("Failed to update product:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
            const response = await fetch(`/api/products/id/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        toast.success("Product deleted successfully!");
        refetch();
      } else {
        toast.error("Failed to delete product. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product. Please check the console for details.");
    }
  };

  const resetForm = () => {
    form.reset({
      name: "",
      category_id: "",
      subcategory_id: null,
      brand: "",
      model: "",
      sku: "",
      barcode: null,
      dimensions: "",
      weight: undefined,
      weight_unit: "kg" as const,
      last_purchase_cost: 0,
      suggested_sell_price: 0,
      low_stock_threshold: 5,
      current_stock: 0,
      status: "active",
      description: "",
      supplier: "",
      image_url: null,
      attributes: {},
      is_active: true
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  // Filter and sort products
  const filteredAndSortedProducts = (products || [])
    .filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.model?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
      const matchesSubcategory = selectedSubcategory === "all" || product.subcategory_id === selectedSubcategory;

      return matchesSearch && matchesCategory && matchesSubcategory;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "stock":
          aValue = a.current_stock;
          bValue = b.current_stock;
          break;
        case "price":
          aValue = a.suggested_sell_price;
          bValue = b.suggested_sell_price;
          break;
        case "sku":
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Calculate statistics
  const totalProducts = products?.length || 0;
  const totalValue = products?.reduce((sum, p) => sum + (p.current_stock * p.suggested_sell_price), 0) || 0;
  const lowStockProducts = products?.filter(p => p.current_stock <= p.low_stock_threshold).length || 0;
  const outOfStockProducts = products?.filter(p => p.current_stock === 0).length || 0;

  // Stock management functions
  const handleCreatePurchaseTransaction = async (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          transaction_type: "purchase",
          quantity: 1,
          unit_cost: product.last_purchase_cost || product.suggested_sell_price * 0.7, // Use last purchase cost or 70% of suggested price
          party_name: "Initial Stock Purchase",
          notes: "Initial stock establishment"
        })
      });

      if (response.ok) {
        toast.success("Purchase transaction created! Stock established.");
        refetch();
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create purchase: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to create purchase transaction:", error);
      toast.error("Failed to create purchase transaction.");
    }
  };

  const handleSort = (field: "name" | "stock" | "price" | "sku") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingState
          title="Products"
          description="Loading your product inventory..."
          cardCount={4}
          showCharts={false}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Error Loading Products"
          description={`Failed to load products: ${error.message}`}
          onRetry={refetch}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <PageHeader
        title="Products"
        description="Manage your product inventory and stock levels"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        children={
          <Button onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current stock value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              Need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              Zero inventory
            </p>
          </CardContent>
        </Card>
      </div>

        {/* Filters and Search */}
        <ProductFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedSubcategory={selectedSubcategory}
          onSubcategoryChange={setSelectedSubcategory}
          filteredProducts={filteredAndSortedProducts}
        />

        {/* Products Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Products ({filteredAndSortedProducts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-semibold text-gray-900 dark:text-white min-w-[200px]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">Product Name</span>
                        <span className="sm:hidden">Product</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-semibold text-gray-900 dark:text-white min-w-[100px]"
                      onClick={() => handleSort("sku")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">SKU</span>
                        <span className="sm:hidden">ID</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-white hidden sm:table-cell min-w-[120px]">Category</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-semibold text-gray-900 dark:text-white min-w-[80px]"
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">Stock</span>
                        <span className="sm:hidden">Qty</span>
                        <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 font-semibold text-gray-900 dark:text-white min-w-[80px]"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center gap-2">
                        Price
                        <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 dark:text-white hidden sm:table-cell min-w-[100px]">Status</TableHead>
                    <TableHead className="text-right font-semibold text-gray-900 dark:text-white min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                  {filteredAndSortedProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all duration-200 border-b border-gray-100 dark:border-gray-700">
                      <TableCell className="py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover shadow-sm border border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                              <Package className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{product.name}</div>
                            {product.brand && (
                              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{product.brand}</div>
                            )}
                            <div className="sm:hidden text-xs text-gray-500 dark:text-gray-400 font-mono">{product.sku}</div>
                          </div>
                        </div>
                  </TableCell>
                      <TableCell className="py-3 sm:py-4 font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{product.sku}</TableCell>
                      <TableCell className="py-3 sm:py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          {product.category?.icon && (
                            <span className="text-lg">{product.category.icon}</span>
                          )}
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {product.category?.name || "Unknown"}
                      </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 sm:py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{product.current_stock}</span>
                          {product.current_stock <= product.low_stock_threshold && (
                            <Badge variant="destructive" className="text-xs font-medium">
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 sm:py-4 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        ${product.suggested_sell_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={
                            product.current_stock === 0
                              ? "destructive"
                              : product.current_stock <= product.low_stock_threshold
                                ? "secondary"
                                : "default"
                          }
                        >
                          {product.current_stock === 0
                            ? "Out of Stock"
                            : product.current_stock <= product.low_stock_threshold
                              ? "Low Stock"
                              : "In Stock"
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3 sm:py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(product)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {product.current_stock === 0 && (
                              <DropdownMenuItem onClick={() => handleCreatePurchaseTransaction(product.id)}>
                                <Package className="w-4 h-4 mr-2" />
                                Establish Stock
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                          onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600"
                        >
                              <Trash2 className="w-4 h-4 mr-2" />
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

            {filteredAndSortedProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Package className="w-16 h-16 mx-auto" />
                </div>
                <p className="text-gray-500 mb-2">No products found</p>
                <p className="text-sm text-gray-400 mb-4">
                  {searchTerm || selectedCategory !== "all" || selectedSubcategory !== "all"
                    ? "Try adjusting your filters or search terms"
                    : "Create your first product to get started"
                  }
                </p>
                {!searchTerm && selectedCategory === "all" && selectedSubcategory === "all" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
          </Button>
                )}
        </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details below to add a new product to your inventory.
            </DialogDescription>
          </DialogHeader>
          <ProductFormZod
            onSubmit={handleCreateProduct}
            onCancel={() => setIsCreateDialogOpen(false)}
            submitLabel="Create Product"
            isEdit={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details below. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <ProductFormZod
            onSubmit={handleEditProduct}
            onCancel={() => setIsEditDialogOpen(false)}
            submitLabel="Update Product"
            isEdit={true}
            defaultValues={editingProduct ? {
              name: editingProduct.name,
              category_id: editingProduct.category_id,
              subcategory_id: editingProduct.subcategory_id,
              brand: editingProduct.brand || "",
              model: editingProduct.model || "",
              sku: editingProduct.sku,
              barcode: editingProduct.barcode,
              dimensions: editingProduct.dimensions || "",
              weight: editingProduct.weight || undefined,
              weight_unit: (editingProduct.weight_unit || "kg") as "g" | "kg" | "oz" | "lb",
              last_purchase_cost: editingProduct.last_purchase_cost,
              suggested_sell_price: editingProduct.suggested_sell_price,
              low_stock_threshold: editingProduct.low_stock_threshold,
              current_stock: editingProduct.current_stock,
              status: editingProduct.status || "active",
              description: editingProduct.description || "",
              supplier: editingProduct.supplier || "",
              image_url: editingProduct.image_url,
              attributes: editingProduct.attributes || {},
              is_active: editingProduct.is_active
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}