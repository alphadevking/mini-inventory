import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToExcel, exportToCSV, exportToPDF } from "@/lib/exportUtils";

interface Product {
  id: string;
  phone_model: string;
  part_type: string;
  variant: string;
  last_purchase_cost: number;
  suggested_sell_price: number;
  low_stock_threshold: number;
  current_stock: number;
  status: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    phone_model: "",
    part_type: "",
    variant: "",
    last_purchase_cost: "",
    suggested_sell_price: "",
    low_stock_threshold: "3"
  });

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products/");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Add product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/products/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          last_purchase_cost: parseFloat(formData.last_purchase_cost),
          suggested_sell_price: parseFloat(formData.suggested_sell_price),
          low_stock_threshold: parseInt(formData.low_stock_threshold)
        })
      });
      if (response.ok) {
        setIsAddDialogOpen(false);
        setFormData({
          phone_model: "",
          part_type: "",
          variant: "",
          last_purchase_cost: "",
          suggested_sell_price: "",
          low_stock_threshold: "3"
        });
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  };

  // Edit product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          last_purchase_cost: parseFloat(formData.last_purchase_cost),
          suggested_sell_price: parseFloat(formData.suggested_sell_price),
          low_stock_threshold: parseInt(formData.low_stock_threshold)
        })
      });
      if (response.ok) {
        setIsEditDialogOpen(false);
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  // Open edit dialog
  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      phone_model: product.phone_model,
      part_type: product.part_type,
      variant: product.variant,
      last_purchase_cost: product.last_purchase_cost.toString(),
      suggested_sell_price: product.suggested_sell_price.toString(),
      low_stock_threshold: product.low_stock_threshold.toString()
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Button onClick={() => exportToExcel(products, "products")}>Export Excel</Button>
          <Button onClick={() => exportToCSV(products, "products")}>Export CSV</Button>
          <Button onClick={() => exportToPDF(products, [
            { header: "Phone Model", dataKey: "phone_model" },
            { header: "Part Type", dataKey: "part_type" },
            { header: "Variant", dataKey: "variant" },
            { header: "Purchase Cost", dataKey: "last_purchase_cost" },
            { header: "Sell Price", dataKey: "suggested_sell_price" },
            { header: "Stock", dataKey: "current_stock" },
            { header: "Status", dataKey: "status" },
          ], "products")}>Export PDF</Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <Input
                  placeholder="Phone Model"
                  value={formData.phone_model}
                  onChange={(e) => setFormData({...formData, phone_model: e.target.value})}
                  required
                />
                <Input
                  placeholder="Part Type"
                  value={formData.part_type}
                  onChange={(e) => setFormData({...formData, part_type: e.target.value})}
                  required
                />
                <Input
                  placeholder="Variant"
                  value={formData.variant}
                  onChange={(e) => setFormData({...formData, variant: e.target.value})}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Last Purchase Cost"
                  value={formData.last_purchase_cost}
                  onChange={(e) => setFormData({...formData, last_purchase_cost: e.target.value})}
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Suggested Sell Price"
                  value={formData.suggested_sell_price}
                  onChange={(e) => setFormData({...formData, suggested_sell_price: e.target.value})}
                  required
                />
                <Input
                  type="number"
                  placeholder="Low Stock Threshold"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
                  required
                />
                <Button type="submit" className="w-full">Add Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Model</TableHead>
              <TableHead>Part Type</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Purchase Cost</TableHead>
              <TableHead>Sell Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.phone_model}</TableCell>
                  <TableCell>{product.part_type}</TableCell>
                  <TableCell>{product.variant}</TableCell>
                  <TableCell>${product.last_purchase_cost}</TableCell>
                  <TableCell>${product.suggested_sell_price}</TableCell>
                  <TableCell>{product.current_stock}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.status === "LOW" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                    }`}>
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4">
            <Input
              placeholder="Phone Model"
              value={formData.phone_model}
              onChange={(e) => setFormData({...formData, phone_model: e.target.value})}
              required
            />
            <Input
              placeholder="Part Type"
              value={formData.part_type}
              onChange={(e) => setFormData({...formData, part_type: e.target.value})}
              required
            />
            <Input
              placeholder="Variant"
              value={formData.variant}
              onChange={(e) => setFormData({...formData, variant: e.target.value})}
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Last Purchase Cost"
              value={formData.last_purchase_cost}
              onChange={(e) => setFormData({...formData, last_purchase_cost: e.target.value})}
              required
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Suggested Sell Price"
              value={formData.suggested_sell_price}
              onChange={(e) => setFormData({...formData, suggested_sell_price: e.target.value})}
              required
            />
            <Input
              type="number"
              placeholder="Low Stock Threshold"
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({...formData, low_stock_threshold: e.target.value})}
              required
            />
            <Button type="submit" className="w-full">Update Product</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}