import React, { useEffect, useState } from "react";
import { useFetch, apiRequest } from "@/lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Button,
  Card,
  Badge,
  TextInput,
  Textarea,
  Group,
  Title,
  Text,
  SimpleGrid,
  Stack,
  Container,
  ActionIcon,
  Menu,
  Modal,
  ColorInput,
  Box,
  Paper
} from "@mantine/core";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
import { usePageState } from "@/hooks/usePageState";
import {
  Plus,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Search,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "../components/Toast";
import { ProductCategoryCreateSchema, type ProductCategoryCreate } from "@/lib/schemas";
import { ProductCategory as ProductCategoryType } from "@/types";

export default function Categories() {
  const { user } = useAuth();
  const { data: categories, loading, error, refetch } = useFetch<ProductCategoryType[]>("/api/categories");
  const { isRefreshing, handleRefresh } = usePageState();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryType | null>(null);

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
      const result = await apiRequest<{ categories_created: number; subcategories_created: number }>("/api/categories/initialize", {
        method: "POST"
      });
      toast.success(`Successfully initialized ${result.categories_created} categories and ${result.subcategories_created} subcategories!`);
      refetch();
    } catch (error: unknown) {
      console.error("Failed to initialize categories:", error);
      toast.error(error instanceof Error ? error.message : "Failed to initialize categories. Please try again.");
    }
  };

  const handleResetCategories = async () => {
    if (confirm("Are you sure you want to reset all categories and subcategories? This action cannot be undone.")) {
      try {
        await apiRequest("/api/categories/reset", {
          method: "POST"
        });
        toast.success("All categories and subcategories have been reset!");
        refetch();
      } catch (error: unknown) {
        console.error("Failed to reset categories:", error);
        toast.error(error instanceof Error ? error.message : "Failed to reset categories. Please try again.");
      }
    }
  };

  const handleSubmit = async (data: ProductCategoryCreate) => {
    try {
      const url = isEditMode && selectedCategory
        ? `/api/categories/${selectedCategory.id}`
        : "/api/categories";
      const method = isEditMode ? "PUT" : "POST";

      // Sanitize data: convert empty strings to null for optional fields
      const submissionData = {
        ...data,
        description: data.description === "" ? null : data.description,
        icon: data.icon === "" ? null : data.icon,
        color: data.color === "" ? null : data.color
      };

      await apiRequest(url, {
        method,
        body: JSON.stringify(submissionData),
      });

      toast.success(isEditMode ? "Category updated successfully!" : "Category created successfully!");
      refetch();
      setIsModalOpen(false);
      form.reset();
    } catch (error: unknown) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} category:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} category. Please try again.`);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedCategory(null);
    form.reset({
      name: "",
      description: "",
      icon: "",
      color: "#3B82F6"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: ProductCategoryType) => {
    setIsEditMode(true);
    setSelectedCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      color: category.color || "#3B82F6"
    });
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      await apiRequest(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });
      toast.success("Category deleted successfully!");
      refetch();
    } catch (error: unknown) {
      console.error("Failed to delete category:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete category. Please try again.");
    }
  };

  const filteredCategories = categories?.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (loading) return <LoadingState message="Loading your product categories..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Product Categories"
        description="Manage your product categories and their organization"
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetch)}
      >
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Button onClick={openCreateModal} leftSection={<Plus size={16} />}>
            Create Category
          </Button>
        )}
      </PageHeader>

      <Stack gap="lg">
        <Group>
          <TextInput
            placeholder="Search categories..."
            leftSection={<Search size={16} />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1 }}
            className="block-input"
          />
          {user?.role === 'admin' && (
            <Group>
              <Button variant="outline" color="dark" onClick={handleInitializeCategories} leftSection={<Settings size={16} />} className="block-button">
                Initialize
              </Button>
              <Button variant="outline" color="dark" onClick={handleResetCategories} leftSection={<Trash2 size={16} />} className="block-button" style={{ background: '#fff0f0' }}>
                Reset
              </Button>
            </Group>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="block-card" padding="lg">
              <Group justify="space-between" mb="xs">
                <Group gap="sm">
                  {category.icon && <Text size="xl">{category.icon}</Text>}
                  <Title order={4} fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{category.name}</Title>
                </Group>
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="dark"><MoreVertical size={16} /></ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<Eye size={14} />} component={Link} to={`/categories/${category.id}/subcategories`} fw={700}>
                      View Subcategories
                    </Menu.Item>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <Menu.Item leftSection={<Edit size={14} />} onClick={() => openEditModal(category)} fw={700}>Edit</Menu.Item>
                    )}
                    {user?.role === 'admin' && (
                      <Menu.Item color="black" leftSection={<Trash2 size={14} />} onClick={() => handleDeleteCategory(category.id)} fw={700} style={{ background: '#fff0f0' }}>Delete</Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Text size="sm" color="dimmed" mb="md" lineClamp={2} fw={500}>
                {category.description || "No description available"}
              </Text>

              <Group justify="space-between" align="center">
                <Badge color="dark" variant="outline" style={{ borderRadius: 0, border: '1px solid black' }}>
                  {category.is_active ? "Active" : "Inactive"}
                </Badge>
                {category.color && (
                  <Box w={20} h={20} style={{ backgroundColor: category.color, borderRadius: '6px' }} />
                )}
              </Group>
            </Card>
          ))}
        </SimpleGrid>

        {filteredCategories.length === 0 && (
          <Paper className="block-card" p="xl">
            <Stack align="center" gap="xs">
              <Settings size={48} color="black" />
              <Text color="dimmed" fw={700}>No categories found</Text>
              {!searchTerm && (
                <Button onClick={openCreateModal} variant="outline" color="dark" className="block-button" mt="md">
                  Create your first category
                </Button>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Category" : "Create New Category"} centered>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="NAME"
              placeholder="CATEGORY NAME"
              required
              {...form.register("name")}
              error={form.formState.errors.name?.message}
              className="block-input"
            />
            <Textarea
              label="DESCRIPTION"
              placeholder="CATEGORY DESCRIPTION"
              minRows={3}
              {...form.register("description")}
              className="block-input"
            />
            <Group grow align="flex-start">
              <TextInput
                label="ICON"
                placeholder="📱"
                {...form.register("icon")}
                className="block-input"
              />
              <Controller
                name="color"
                control={form.control}
                render={({ field }) => (
                  <ColorInput
                    label="COLOR"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    className="block-input"
                  />
                )}
              />
            </Group>
            <Group justify="flex-end" mt="xl">
              <Button variant="light" color="gray" onClick={() => setIsModalOpen(false)}>CANCEL</Button>
              <Button type="submit" className="block-button" loading={form.formState.isSubmitting}>{isEditMode ? "UPDATE" : "CREATE"} CATEGORY</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
