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
  Box,
  Paper
} from "@mantine/core";
import { LoadingState } from "@/components/LoadingState";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { PageHeader } from "@/components/PageHeader";
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
import { Link, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "../components/Toast";
import { ProductCategory, ProductSubcategory } from "@/types";
import { ProductSubcategoryCreateSchema, type ProductSubcategoryCreate } from "@/lib/schemas";

export default function Subcategories() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { user } = useAuth();
  const { data: category, loading: categoryLoading, error: categoryError } = useFetch<ProductCategory>(`/api/categories/${categoryId}`);
  const { data: subcategories, loading: subcategoriesLoading, error: subcategoriesError, refetch } = useFetch<ProductSubcategory[]>(`/api/categories/${categoryId}/subcategories`);
  const { isRefreshing, handleRefresh } = usePageState();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProductSubcategory | null>(null);

  const form = useForm<ProductSubcategoryCreate>({
    resolver: zodResolver(ProductSubcategoryCreateSchema),
    defaultValues: {
      name: "",
      category_id: categoryId || "",
      description: "",
      icon: ""
    }
  });

  const handleCreateSubcategory = async (data: ProductSubcategoryCreate) => {
    try {
      // Sanitize data
      const submissionData = {
        ...data,
        description: data.description === "" ? null : data.description,
        icon: data.icon === "" ? null : data.icon
      };

      await apiRequest(`/api/categories/${categoryId}/subcategories`, {
        method: "POST",
        body: JSON.stringify(submissionData),
      });

      toast.success("Subcategory created successfully!");
      refetch();
      setIsModalOpen(false);
      form.reset();
    } catch (error: unknown) {
      console.error("Error creating subcategory:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create subcategory. Please try again.");
    }
  };

  const handleEditSubcategory = async (data: ProductSubcategoryCreate) => {
    if (!selectedSubcategory) return;

    try {
      // Sanitize data
      const submissionData = {
        ...data,
        description: data.description === "" ? null : data.description,
        icon: data.icon === "" ? null : data.icon
      };

      await apiRequest(`/api/categories/subcategories/${selectedSubcategory.id}`, {
        method: "PUT",
        body: JSON.stringify(submissionData),
      });

      toast.success("Subcategory updated successfully!");
      refetch();
      setIsModalOpen(false);
      setSelectedSubcategory(null);
    } catch (error: unknown) {
      console.error("Error updating subcategory:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update subcategory. Please try again.");
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedSubcategory(null);
    form.reset({
      name: "",
      category_id: categoryId || "",
      description: "",
      icon: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (subcategory: ProductSubcategory) => {
    setIsEditMode(true);
    setSelectedSubcategory(subcategory);
    form.reset({
      name: subcategory.name,
      category_id: categoryId || "",
      description: subcategory.description || "",
      icon: subcategory.icon || ""
    });
    setIsModalOpen(true);
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    try {
      await apiRequest(`/api/categories/subcategories/${subcategoryId}`, {
        method: "DELETE",
      });
      toast.success("Subcategory deleted successfully!");
      refetch();
    } catch (error: unknown) {
      console.error("Failed to delete subcategory:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete subcategory. Please try again.");
    }
  };

  const filteredSubcategories = subcategories?.filter(subcategory =>
    subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subcategory.description && subcategory.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (categoryLoading || subcategoriesLoading) return <LoadingState message="Loading subcategories..." />;
  if (categoryError || subcategoriesError) return <ErrorDisplay message={(categoryError || subcategoriesError)?.message} onRetry={refetch} />;

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title={`${category?.name || 'Category'} Subcategories`}
        description={`Manage subcategories for ${category?.name || 'this category'}`}
        showRefresh={true}
        isRefreshing={isRefreshing}
        onRefresh={() => handleRefresh(refetch)}
        showBack={true}
        onBack={() => window.history.back()}
      >
        <Group>
          <Button variant="light" color="gray" component={Link} to="/categories" leftSection={<ArrowLeft size={16} />}>
            Back to Categories
          </Button>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Button onClick={openCreateModal} leftSection={<Plus size={16} />} className="block-button">
              Create Subcategory
            </Button>
          )}
        </Group>
      </PageHeader>

      <Stack gap="lg">
        <TextInput
          placeholder="Search subcategories..."
          leftSection={<Search size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: 400 }}
          className="block-input"
        />

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {filteredSubcategories.map((subcategory) => (
            <Card key={subcategory.id} className="block-card" padding="lg">
              <Group justify="space-between" mb="xs">
                <Group gap="sm">
                  {subcategory.icon && <Text size="xl">{subcategory.icon}</Text>}
                  <Title order={4} fw={800} style={{ fontFamily: "'Manrope', sans-serif" }}>{subcategory.name}</Title>
                </Group>
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="dark"><MoreVertical size={16} /></ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<Settings size={14} />} component={Link} to={`/subcategories/${subcategory.id}/attributes`} fw={700}>
                      Manage Attributes
                    </Menu.Item>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <Menu.Item leftSection={<Edit size={14} />} onClick={() => openEditModal(subcategory)} fw={700}>Edit</Menu.Item>
                    )}
                    {user?.role === 'admin' && (
                      <Menu.Item color="black" leftSection={<Trash2 size={14} />} onClick={() => handleDeleteSubcategory(subcategory.id)} fw={700} style={{ background: '#fff0f0' }}>Delete</Menu.Item>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Text size="sm" color="dimmed" mb="md" lineClamp={2} fw={500}>
                {subcategory.description || "No description available"}
              </Text>

              <Badge color="dark" variant="outline" style={{ borderRadius: 0, border: '1px solid black' }}>Active</Badge>
            </Card>
          ))}
        </SimpleGrid>

        {filteredSubcategories.length === 0 && (
          <Paper withBorder p="xl" radius="md">
            <Stack align="center" gap="xs">
              <Settings size={48} color="gray" />
              <Text color="dimmed">No subcategories found</Text>
              {!searchTerm && (
                <Button onClick={openCreateModal} variant="outline" mt="md">
                  Create your first subcategory
                </Button>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>

      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "Edit Subcategory" : "Create New Subcategory"} centered>
        <form onSubmit={form.handleSubmit(isEditMode ? handleEditSubcategory : handleCreateSubcategory)}>
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="Enter subcategory name"
              required
              {...form.register("name")}
              error={form.formState.errors.name?.message}
              className="block-input"
            />
            <Textarea
              label="Description"
              placeholder="Enter subcategory description"
              minRows={3}
              {...form.register("description")}
              className="block-input"
            />
            <TextInput
              label="Icon"
              placeholder="📱"
              {...form.register("icon")}
              className="block-input"
            />
            <Group justify="flex-end" mt="xl">
              <Button variant="light" color="gray" onClick={() => setIsModalOpen(false)}>CANCEL</Button>
              <Button type="submit" className="block-button" loading={form.formState.isSubmitting}>
                {isEditMode ? "UPDATE SUBCATEGORY" : "CREATE SUBCATEGORY"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
