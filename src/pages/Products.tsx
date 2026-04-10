import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFetch, apiRequest } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Button,
  Card,
  Badge,
  Table,
  Group,
  Text,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  SimpleGrid,
  Stack,
  Container,
  Paper,
  Tooltip,
  Box,
  Image
} from "@mantine/core";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import ProductFilters from "@/components/ProductFilters";
import ProductFormZod from "@/components/ProductFormZod";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter
} from "lucide-react";
import { toast } from "../components/Toast";
import { ProductCreateSchema, ProductUpdateSchema, type ProductCreate, type ProductUpdate } from "@/lib/schemas";
import { Product } from "@/types";

export default function Products() {
  const { user } = useAuth();
  const { data: products, loading, error, refetch } = useFetch<Product[]>("/api/products");
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price" | "sku">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleCreateProduct = async (data: ProductCreate | ProductUpdate) => {
    // Cast to ProductCreate since this is the create modal
    const createData = data as ProductCreate;
    try {
      await apiRequest("/api/products", {
        method: "POST",
        body: JSON.stringify(createData)
      });

      toast.success("Product created successfully!");
      setIsCreateModalOpen(false);
      refetch();
    } catch (error: unknown) {
      console.error("Failed to create product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create product. Please try again.");
    }
  };

  const handleEditProduct = async (data: ProductCreate | ProductUpdate) => {
    if (!editingProduct) return;
    // Cast to ProductUpdate since this is the edit modal
    const updateData = data as ProductUpdate;
    try {
      await apiRequest(`/api/products/id/${editingProduct.id}`, {
        method: "PUT",
        body: JSON.stringify(updateData)
      });

      toast.success("Product updated successfully!");
      setIsEditModalOpen(false);
      setEditingProduct(null);
      refetch();
    } catch (error: unknown) {
      console.error("Failed to update product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update product. Please try again.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      await apiRequest(`/api/products/id/${id}`, {
        method: "DELETE"
      });

      toast.success("Product deleted successfully!");
      refetch();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product. Please check the console for details.");
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleSort = (field: "name" | "stock" | "price" | "sku") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

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
      let aValue: string | number, bValue: string | number;
      switch (sortBy) {
        case "name": aValue = a.name.toLowerCase(); bValue = b.name.toLowerCase(); break;
        case "stock": aValue = a.current_stock; bValue = b.current_stock; break;
        case "price": aValue = a.suggested_sell_price; bValue = b.suggested_sell_price; break;
        case "sku": aValue = a.sku.toLowerCase(); bValue = b.sku.toLowerCase(); break;
        default: return 0;
      }
      if (sortOrder === "asc") return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    });

  const totalValue = products?.reduce((sum, p) => sum + (p.current_stock * p.last_purchase_cost), 0) || 0;
  const lowStockProducts = products?.filter(p => p.current_stock <= p.low_stock_threshold).length || 0;
  const outOfStockProducts = products?.filter(p => p.current_stock === 0).length || 0;

  if (loading) return <LoadingState message="Loading your product inventory..." />;
  if (error) return <ErrorDisplay title="Error Loading Products" message={error.message} onRetry={refetch} />;

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Products"
        description="Manage your product inventory and stock levels"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetch)}
      >
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Button onClick={() => setIsCreateModalOpen(true)} leftSection={<Plus size={16} />}>
            Add Product
          </Button>
        )}
      </PageHeader>

      {(user?.role === 'manager' || user?.role === 'admin') ? (
        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="lg" mb="xl">
          <Paper className="block-card" p="md">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>TOTAL PRODUCTS</Text>
            <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{products?.length || 0}</Text>
          </Paper>
          <Paper className="block-card" p="md">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>TOTAL VALUE</Text>
            <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{formatCurrency(totalValue)}</Text>
          </Paper>
          <Paper className="block-card" p="md">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>LOW STOCK</Text>
            <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{lowStockProducts}</Text>
          </Paper>
          <Paper className="block-card" p="md">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>OUT OF STOCK</Text>
            <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{outOfStockProducts}</Text>
          </Paper>
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mb="xl">
          <Paper className="block-card" p="md">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>LOW STOCK</Text>
            <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{lowStockProducts}</Text>
            <Text size="xs" color="dimmed" fw={500}>PARTS NEEDING REORDER</Text>
          </Paper>
          <Paper className="block-card" p="md">
            <Text size="xs" color="dimmed" fw={800} style={{ letterSpacing: '1px' }}>OUT OF STOCK</Text>
            <Text size="xl" fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{outOfStockProducts}</Text>
            <Text size="xs" color="dimmed" fw={500}>UNAVAILABLE FOR USE</Text>
          </Paper>
        </SimpleGrid>
      )}

      <ProductFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSubcategoryChange={setSelectedSubcategory}
        filteredProducts={filteredAndSortedProducts}
      />

      <Paper className="block-card" mt="xl" p={0} style={{ overflow: 'hidden' }}>
        <Table verticalSpacing="sm" style={{ borderCollapse: 'collapse' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th onClick={() => handleSort("name")} style={{ cursor: 'pointer' }}>
                <Group gap={4}>Product <ArrowUpDown size={14} /></Group>
              </Table.Th>
              <Table.Th onClick={() => handleSort("sku")} style={{ cursor: 'pointer' }}>
                <Group gap={4}>SKU <ArrowUpDown size={14} /></Group>
              </Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th onClick={() => handleSort("stock")} style={{ cursor: 'pointer' }}>
                <Group gap={4}>Stock <ArrowUpDown size={14} /></Group>
              </Table.Th>
              <Table.Th onClick={() => handleSort("price")} style={{ cursor: 'pointer' }}>
                <Group gap={4}>Price <ArrowUpDown size={14} /></Group>
              </Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredAndSortedProducts.map((product) => (
              <Table.Tr key={product.id}>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Group gap="sm">
                    {product.image_url ? (
                      <Image src={product.image_url} w={40} h={40} radius={0} style={{ border: '1px solid black' }} />
                    ) : (
                      <Box w={40} h={40} bg="white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid black' }}>
                        <Package size={20} color="black" />
                      </Box>
                    )}
                    <div>
                      <Text size="sm" fw={800}>{product.name}</Text>
                      <Text size="xs" color="dimmed" fw={500}>{product.brand}</Text>
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="xs" ff="monospace" fw={700}>{product.sku}</Text></Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Text size="sm" fw={700}>{product.category?.name}</Text>
                  <Text size="xs" color="dimmed" fw={500}>{product.subcategory?.name}</Text>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Group gap="xs">
                    <Text size="sm" fw={800}>{product.current_stock}</Text>
                    {product.current_stock <= product.low_stock_threshold && (
                      <Badge color="orange.6" variant="outline" size="xs" style={{ border: '1px solid var(--accent-orange)' }}>LOW STOCK</Badge>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}><Text size="sm" fw={800}>{formatCurrency(product.suggested_sell_price)}</Text></Table.Td>
                <Table.Td style={{ borderBottom: '1px solid black' }}>
                  <Menu position="bottom-end">
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="dark"><MoreVertical size={16} /></ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <Menu.Item leftSection={<Edit size={14} />} onClick={() => openEditDialog(product)} fw={700}>Edit</Menu.Item>
                      )}
                      {user?.role === 'admin' && (
                        <Menu.Item color="black" leftSection={<Trash2 size={14} />} onClick={() => handleDeleteProduct(product.id)} fw={700} style={{ background: '#fff0f0' }}>Delete</Menu.Item>
                      )}
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {filteredAndSortedProducts.length === 0 && (
          <Stack align="center" py="xl" gap="xs">
            <Package size={48} color="gray" />
            <Text color="dimmed">No products found</Text>
          </Stack>
        )}
      </Paper>

      <Modal opened={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add New Product" size="xl">
        <ProductFormZod
          onSubmit={handleCreateProduct}
          onCancel={() => setIsCreateModalOpen(false)}
          submitLabel="Create Product"
          isEdit={false}
        />
      </Modal>

      <Modal opened={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Product" size="xl">
        <ProductFormZod
          onSubmit={handleEditProduct}
          onCancel={() => setIsEditModalOpen(false)}
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
      </Modal>
    </Container>
  );
}
