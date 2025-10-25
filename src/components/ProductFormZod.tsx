import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import CategorySelector from "./CategorySelector";
import { ProductCreateSchema, ProductUpdateSchema, type ProductCreate, type ProductUpdate } from "@/lib/schemas";

interface ProductFormProps {
  onSubmit: (data: ProductCreate | ProductUpdate) => void;
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="space-y-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">1</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter product name"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Stock keeping unit"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Brand name"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Model number"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Barcode"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., 10x5x2 cm"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="oz">Ounces (oz)</SelectItem>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">2</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category & Classification</h3>
          </div>

          <CategorySelector
            selectedCategoryId={form.watch("category_id") || ""}
            selectedSubcategoryId={form.watch("subcategory_id") || ""}
            onCategoryChange={(categoryId) => {
              form.setValue("category_id", categoryId);
              // Reset subcategory when category changes
              form.setValue("subcategory_id", "");
            }}
            onSubcategoryChange={(subcategoryId) => form.setValue("subcategory_id", subcategoryId || "")}
            allowEmptySubcategory={true}
            required={true}
          />

          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">3</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing & Inventory</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="last_purchase_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Cost *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="suggested_sell_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sell Price *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="current_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Stock *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      step="1"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="low_stock_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Stock Threshold *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      step="1"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      placeholder="5"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">4</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Supplier name"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="https://example.com/image.jpg"
                      className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Product description..."
                    rows={4}
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-6 py-2 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isValid}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </div>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
