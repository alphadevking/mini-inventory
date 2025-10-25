import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CategorySelector from "./CategorySelector";

interface ProductFormData {
  name: string;
  category_id: string;
  subcategory_id: string;
  brand: string;
  model: string;
  sku: string;
  barcode: string;
  dimensions: string;
  weight: string;
  weight_unit: string;
  last_purchase_cost: string;
  suggested_sell_price: string;
  low_stock_threshold: string;
  current_stock: string;
  status: string;
  description: string;
  supplier: string;
  image_url: string;
  attributes: Record<string, any>;
}

interface ProductFormProps {
  formData: ProductFormData;
  onFormDataChange: (data: ProductFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

export default function ProductForm({
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Create Product",
  cancelLabel = "Cancel"
}: ProductFormProps) {
  const updateFormData = (field: keyof ProductFormData, value: string) => {
    onFormDataChange({
      ...formData,
      [field]: value
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    const newFormData = {
      ...formData,
      category_id: categoryId,
      subcategory_id: "" // Reset subcategory when category changes
    };

    onFormDataChange(newFormData);
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    onFormDataChange({
      ...formData,
      subcategory_id: subcategoryId
    });
  };

  // Form validation function
  const isFormValid = () => {
    return formData.name.trim() !== "" &&
           formData.sku.trim() !== "" &&
           formData.category_id !== "" &&
           formData.last_purchase_cost !== "" &&
           formData.suggested_sell_price !== "" &&
           formData.low_stock_threshold !== "" &&
           formData.current_stock !== "" &&
           parseFloat(formData.last_purchase_cost) >= 0 &&
           parseFloat(formData.suggested_sell_price) >= 0 &&
           parseInt(formData.low_stock_threshold) >= 0 &&
           parseInt(formData.current_stock) >= 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if form is valid before submission
    if (!isFormValid()) {
      // Focus on first invalid field
      const firstInvalidField = document.querySelector('input:invalid, select:invalid');
      if (firstInvalidField) {
        (firstInvalidField as HTMLElement).focus();
      }
      return;
    }

    onSubmit(e);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8" noValidate>
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">1</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h3>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="Enter product name"
                required
                minLength={1}
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="sku" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SKU *
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => updateFormData("sku", e.target.value)}
                placeholder="Stock keeping unit"
                required
                minLength={1}
                pattern="[A-Za-z0-9-_]+"
                title="SKU must contain only letters, numbers, hyphens, and underscores"
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

          <div>
            <Label htmlFor="brand" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Brand
            </Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => updateFormData("brand", e.target.value)}
              placeholder="Product brand"
              className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          </div>

          <div className="space-y-6">
            <CategorySelector
              selectedCategoryId={formData.category_id}
              onCategoryChange={handleCategoryChange}
              selectedSubcategoryId={formData.subcategory_id}
              onSubcategoryChange={handleSubcategoryChange}
              allowEmptySubcategory={true}
              required
            />

          <div>
            <Label htmlFor="model" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Model
            </Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => updateFormData("model", e.target.value)}
              placeholder="Product model"
              className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">2</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Additional Details
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
            <div>
              <Label htmlFor="barcode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Barcode
              </Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => updateFormData("barcode", e.target.value)}
                placeholder="Product barcode"
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="image_url" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Image URL
              </Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => updateFormData("image_url", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

              <div>
                <Label htmlFor="current_stock" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Initial Stock *
                </Label>
                <Input
                  id="current_stock"
                  type="number"
                  value={formData.current_stock}
                  onChange={(e) => updateFormData("current_stock", e.target.value)}
                  placeholder="0"
                  required
                  min="0"
                  step="1"
                  className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="low_stock_threshold" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Low Stock Threshold *
                </Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) => updateFormData("low_stock_threshold", e.target.value)}
                  placeholder="5"
                  required
                  min="0"
                  step="1"
                  className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
          </div>

            <div className="space-y-6">
          <div>
            <Label htmlFor="last_purchase_cost" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Purchase Cost *
            </Label>
            <Input
              id="last_purchase_cost"
              type="number"
              step="0.01"
              min="0"
              value={formData.last_purchase_cost}
              onChange={(e) => updateFormData("last_purchase_cost", e.target.value)}
              placeholder="0.00"
              required
              className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="suggested_sell_price" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sell Price *
            </Label>
            <Input
              id="suggested_sell_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.suggested_sell_price}
              onChange={(e) => updateFormData("suggested_sell_price", e.target.value)}
              placeholder="0.00"
              required
              className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <Label htmlFor="supplier" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Supplier
            </Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => updateFormData("supplier", e.target.value)}
              placeholder="Supplier name"
              className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-semibold">3</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Additional Information
          </h3>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData("description", e.target.value)}
            placeholder="Product description"
            rows={4}
            className="mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
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
          disabled={isSubmitting || !isFormValid()}
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
  );
}
