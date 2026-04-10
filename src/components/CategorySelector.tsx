import React from 'react';
import { Select, Stack } from '@mantine/core';
import { useFetch } from '../lib/api';
import { ProductCategory, ProductSubcategory } from '../types';

interface CategorySelectorProps {
  selectedCategoryId: string;
  onCategoryChange: (value: string) => void;
  selectedSubcategoryId: string;
  onSubcategoryChange: (value: string) => void;
  allowEmptySubcategory?: boolean;
  required?: boolean;
  error?: string;
  clearable?: boolean;
  disabled?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategoryChange,
  selectedSubcategoryId,
  onSubcategoryChange,
  required = false,
  error,
  clearable = true,
  disabled = false
}) => {
  const { data: categoriesData, loading: categoriesLoading } = useFetch<ProductCategory[]>('/api/categories');
  const { data: subcategoriesData, loading: subcategoriesLoading } = useFetch<ProductSubcategory[]>('/api/subcategories');

  const categories = categoriesData || [];
  const allSubcategories = subcategoriesData || [];

  // Filter subcategories based on selected category
  const filteredSubcategories = allSubcategories.filter(
    sub => sub.category_id === selectedCategoryId
  );

  const categoryOptions = categories.map(category => ({
    value: category.id.toString(),
    label: category.name
  }));

  const subcategoryOptions = filteredSubcategories.map(sub => ({
    value: sub.id.toString(),
    label: sub.name
  }));

  return (
    <Stack gap="md">
      <Select
        label="Category"
        placeholder="Select category"
        value={selectedCategoryId || null}
        onChange={(val) => onCategoryChange(val || '')}
        data={categoryOptions}
        required={required}
        disabled={disabled || categoriesLoading}
        searchable
        clearable={clearable}
        error={error}
        nothingFoundMessage="No categories found"
      />

      <Select
        label="Subcategory"
        placeholder={selectedCategoryId ? "Select subcategory" : "Select category first"}
        value={selectedSubcategoryId || null}
        onChange={(val) => onSubcategoryChange(val || '')}
        data={subcategoryOptions}
        disabled={disabled || !selectedCategoryId || subcategoriesLoading}
        searchable
        clearable={clearable}
        nothingFoundMessage="No subcategories found"
      />
    </Stack>
  );
};
