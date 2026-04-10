import React from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  TextInput,
  NumberInput,
  Textarea,
  Select,
  Stack,
  Group,
  Title,
  Box,
  Grid,
  ThemeIcon,
  Paper
} from "@mantine/core";
import { CategorySelector } from "./CategorySelector";
import { ProductCreateSchema, ProductUpdateSchema, type ProductCreate, type ProductUpdate } from "@/lib/schemas";

interface ProductFormProps {
  onSubmit: (data: ProductCreate | ProductUpdate) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  defaultValues?: Partial<ProductCreate>;
  isEdit?: boolean;
}

export default function ProductFormZod({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Create Product",
  cancelLabel = "Cancel",
  defaultValues,
  isEdit = false
}: ProductFormProps) {
  const form = useForm<ProductCreate | ProductUpdate>({
    resolver: zodResolver(isEdit ? ProductUpdateSchema : ProductCreateSchema),
    defaultValues: defaultValues || {
      name: "",
      category_id: "",
      subcategory_id: null,
      brand: "",
      model: "",
      sku: "",
      barcode: null,
      dimensions: "",
      weight: undefined,
      weight_unit: "kg",
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

  const handleSubmit = (data: ProductCreate | ProductUpdate) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Stack gap="xl">
        {/* Section 1: Basic Info */}
        <Box>
          <Group mb="md">
            <ThemeIcon size={32} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'indigo' }}>
              1
            </ThemeIcon>
            <Title order={4}>Basic Information</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Product Name"
                placeholder="Enter product name"
                required
                {...form.register("name")}
                error={form.formState.errors.name?.message}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="SKU"
                placeholder="Stock keeping unit"
                required
                {...form.register("sku")}
                error={form.formState.errors.sku?.message}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Brand"
                placeholder="Brand name"
                {...form.register("brand")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Model"
                placeholder="Model number"
                {...form.register("model")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Barcode"
                placeholder="Barcode"
                {...form.register("barcode")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Dimensions"
                placeholder="e.g., 10x5x2 cm"
                {...form.register("dimensions")}
              />
            </Grid.Col>
          </Grid>
        </Box>

        {/* Section 2: Category */}
        <Box>
          <Group mb="md">
            <ThemeIcon size={32} radius="md" variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
              2
            </ThemeIcon>
            <Title order={4}>Category & Classification</Title>
          </Group>

          <CategorySelector
            selectedCategoryId={form.watch("category_id") || ""}
            selectedSubcategoryId={form.watch("subcategory_id") || ""}
            onCategoryChange={(categoryId) => {
              form.setValue("category_id", categoryId);
              form.setValue("subcategory_id", "");
            }}
            onSubcategoryChange={(subcategoryId) => form.setValue("subcategory_id", subcategoryId || "")}
            required
          />
        </Box>

        {/* Section 3: Pricing */}
        <Box>
          <Group mb="md">
            <ThemeIcon size={32} radius="md" variant="gradient" gradient={{ from: 'purple', to: 'pink' }}>
              3
            </ThemeIcon>
            <Title order={4}>Pricing & Inventory</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="last_purchase_cost"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Purchase Cost"
                    required
                    min={0}
                    decimalScale={2}
                    leftSection={CURRENCY_SYMBOL}
                    value={field.value}
                    onChange={(val) => field.onChange(Number(val))}
                    error={form.formState.errors.last_purchase_cost?.message}
                  />
                )}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="suggested_sell_price"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Sell Price"
                    required
                    min={0}
                    decimalScale={2}
                    leftSection={CURRENCY_SYMBOL}
                    value={field.value}
                    onChange={(val) => field.onChange(Number(val))}
                    error={form.formState.errors.suggested_sell_price?.message}
                  />
                )}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="current_stock"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Initial Stock"
                    required
                    min={0}
                    value={field.value}
                    onChange={(val) => field.onChange(Number(val))}
                  />
                )}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="low_stock_threshold"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Low Stock Threshold"
                    required
                    min={0}
                    value={field.value}
                    onChange={(val) => field.onChange(Number(val))}
                  />
                )}
              />
            </Grid.Col>
          </Grid>
        </Box>

        {/* Section 4: Additional */}
        <Box>
          <Group mb="md">
            <ThemeIcon size={32} radius="md" variant="gradient" gradient={{ from: 'orange', to: 'red' }}>
              4
            </ThemeIcon>
            <Title order={4}>Additional Details</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Supplier"
                placeholder="Supplier name"
                {...form.register("supplier")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Image URL"
                placeholder="https://example.com/image.jpg"
                {...form.register("image_url")}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Description"
                placeholder="Product description..."
                minRows={3}
                {...form.register("description")}
              />
            </Grid.Col>
          </Grid>
        </Box>

        <Group justify="flex-end" mt="xl">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.formState.isValid}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
