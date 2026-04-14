import React from "react";
import { CURRENCY_SYMBOL } from '../config/app';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
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
  Text,
  Paper,
} from "@mantine/core";
import { Info, Cpu, Package, Tag, DollarSign, Layers } from "lucide-react";
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
  isEdit = false,
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
      weight_unit: "g",
      last_purchase_cost: 0,
      suggested_sell_price: 0,
      low_stock_threshold: 3,
      current_stock: 0,
      status: "active",
      description: "",
      supplier: "",
      image_url: null,
      attributes: {},
      is_active: true,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Stack gap="xl">

        {/* Model vs Unit callout — only on create */}
        {!isEdit && (
          <Alert
            icon={<Info size={16} />}
            color="blue"
            variant="light"
            title="You are creating a Product Model"
          >
            <Text size="sm">
              This form describes <strong>what the product is</strong> — its name, barcode, price, and category.
              It does <strong>not</strong> represent a specific physical device.
            </Text>
            <Text size="sm" mt={4}>
              After saving, open the product's <strong>View Units</strong> menu to register individual devices
              with their serial numbers and IMEIs.
            </Text>
          </Alert>
        )}

        {/* ── Section 1: Identity ── */}
        <Box>
          <Group mb="sm">
            <ThemeIcon size={28} radius="sm" color="blue"><Tag size={14} /></ThemeIcon>
            <Title order={5}>Model Identity</Title>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Fields that identify the product model — shared by every physical unit of this model.
          </Text>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Product Name"
                placeholder='e.g. "iPhone 15 Pro 256GB Natural Titanium"'
                required
                {...form.register("name")}
                error={form.formState.errors.name?.message}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="SKU"
                description="Internal reference code — must be unique"
                placeholder="e.g. IPH15PRO-256-NT"
                required
                {...form.register("sku")}
                error={(form.formState.errors as Record<string, { message?: string }>).sku?.message}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Brand"
                placeholder="e.g. Apple"
                {...form.register("brand")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Model Name"
                placeholder='e.g. "iPhone 15 Pro"'
                {...form.register("model")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Barcode / EAN / UPC"
                description="Manufacturer barcode that identifies this model — not a device serial number"
                placeholder="e.g. 194253714743"
                {...form.register("barcode")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Status"
                    description="Inactive products cannot be sold"
                    data={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "discontinued", label: "Discontinued" },
                    ]}
                    value={field.value as string ?? "active"}
                    onChange={field.onChange}
                  />
                )}
              />
            </Grid.Col>
          </Grid>
        </Box>

        {/* ── Section 2: Category ── */}
        <Box>
          <Group mb="sm">
            <ThemeIcon size={28} radius="sm" color="teal"><Layers size={14} /></ThemeIcon>
            <Title order={5}>Category</Title>
          </Group>

          <CategorySelector
            selectedCategoryId={form.watch("category_id") || ""}
            selectedSubcategoryId={form.watch("subcategory_id") || ""}
            onCategoryChange={(categoryId) => {
              form.setValue("category_id", categoryId);
              form.setValue("subcategory_id", "");
            }}
            onSubcategoryChange={(subcategoryId) =>
              form.setValue("subcategory_id", subcategoryId || "")
            }
            required
          />
        </Box>

        {/* ── Section 3: Pricing ── */}
        <Box>
          <Group mb="sm">
            <ThemeIcon size={28} radius="sm" color="violet"><DollarSign size={14} /></ThemeIcon>
            <Title order={5}>Pricing</Title>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Reference prices for this model. For serialized units, purchase cost is locked per unit at intake time.
          </Text>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="last_purchase_cost"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Default Purchase Cost"
                    description="Reference cost — overridable per unit at intake"
                    required
                    min={0}
                    decimalScale={2}
                    thousandSeparator=","
                    leftSection={CURRENCY_SYMBOL}
                    value={field.value as number}
                    onChange={(val) => field.onChange(Number(val))}
                    error={(form.formState.errors as Record<string, { message?: string }>).last_purchase_cost?.message}
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
                    label="Selling Price"
                    required
                    min={0}
                    decimalScale={2}
                    thousandSeparator=","
                    leftSection={CURRENCY_SYMBOL}
                    value={field.value as number}
                    onChange={(val) => field.onChange(Number(val))}
                    error={(form.formState.errors as Record<string, { message?: string }>).suggested_sell_price?.message}
                  />
                )}
              />
            </Grid.Col>
          </Grid>
        </Box>

        {/* ── Section 4: Stock Settings ── */}
        <Box>
          <Group mb="sm">
            <ThemeIcon size={28} radius="sm" color="orange"><Package size={14} /></ThemeIcon>
            <Title order={5}>Stock Settings</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Controller
                name="low_stock_threshold"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Low Stock Alert Threshold"
                    description="Get alerted when stock falls at or below this number"
                    required
                    min={0}
                    value={field.value as number}
                    onChange={(val) => field.onChange(Number(val))}
                  />
                )}
              />
            </Grid.Col>
            {isEdit && (
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Controller
                  name="current_stock"
                  control={form.control}
                  render={({ field }) => (
                    <NumberInput
                      label="Current Stock (bulk adjustment)"
                      description="Only use for non-serialized bulk items. Serialized stock is managed via units."
                      min={0}
                      value={field.value as number}
                      onChange={(val) => field.onChange(Number(val))}
                    />
                  )}
                />
              </Grid.Col>
            )}
          </Grid>

          {!isEdit && (
            <Paper p="sm" mt="sm" withBorder style={{ borderStyle: "dashed" }}>
              <Group gap="xs">
                <Cpu size={14} />
                <Text size="sm" fw={500}>Serialized stock is added after creating the product</Text>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Once this product is saved, use <strong>View Units → Receive Units</strong> to register
                each physical device with its serial number and IMEI. The stock count will update automatically.
              </Text>
            </Paper>
          )}
        </Box>

        {/* ── Section 5: Physical Attributes ── */}
        <Box>
          <Group mb="sm">
            <ThemeIcon size={28} radius="sm" color="gray"><Package size={14} /></ThemeIcon>
            <Title order={5}>Physical Attributes</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <TextInput
                label="Dimensions"
                description='Overall box or device dimensions'
                placeholder="e.g. 146.6 x 70.6 x 8.25 mm"
                {...form.register("dimensions")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Controller
                name="weight"
                control={form.control}
                render={({ field }) => (
                  <NumberInput
                    label="Weight"
                    placeholder="0"
                    min={0}
                    decimalScale={2}
                    value={field.value as number | undefined}
                    onChange={(val) => field.onChange(val === "" ? undefined : Number(val))}
                  />
                )}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 2 }}>
              <Controller
                name="weight_unit"
                control={form.control}
                render={({ field }) => (
                  <Select
                    label="Unit"
                    data={["g", "kg", "oz", "lb"]}
                    value={field.value as string ?? "g"}
                    onChange={field.onChange}
                  />
                )}
              />
            </Grid.Col>
          </Grid>
        </Box>

        {/* ── Section 6: Additional Details ── */}
        <Box>
          <Group mb="sm">
            <ThemeIcon size={28} radius="sm" color="pink"><Info size={14} /></ThemeIcon>
            <Title order={5}>Additional Details</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Supplier"
                placeholder="Primary supplier name"
                {...form.register("supplier")}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label="Image URL"
                placeholder="https://..."
                {...form.register("image_url")}
                error={(form.formState.errors as Record<string, { message?: string }>).image_url?.message}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Textarea
                label="Description"
                description="Visible to staff — storage, colour options, key specs"
                placeholder="e.g. Apple iPhone 15 Pro in Natural Titanium. Available in 128GB, 256GB, 512GB, 1TB."
                minRows={3}
                {...form.register("description")}
              />
            </Grid.Col>
          </Grid>
        </Box>

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" loading={isSubmitting || form.formState.isSubmitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
