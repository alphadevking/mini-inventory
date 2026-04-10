import React from 'react';
import { Group, TextInput, Select, Paper } from '@mantine/core';
import { Search } from 'lucide-react';
import { useFetch } from "@/lib/api";
import { ProductCategory, ProductSubcategory, Product } from "@/types";

interface ProductFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (value: string) => void;
  filteredProducts: Product[];
}

export default function ProductFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  filteredProducts
}: ProductFiltersProps) {
  const { data: categoriesData } = useFetch<ProductCategory[]>('/api/categories');
  const { data: subcategoriesData } = useFetch<ProductSubcategory[]>('/api/subcategories');

  const categories = categoriesData || [];
  const subcategories = subcategoriesData || [];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat.id.toString(), label: cat.name }))
  ];

  const subcategoryOptions = [
    { value: 'all', label: 'All Subcategories' },
    ...subcategories
      .filter(sub => selectedCategory === 'all' || sub.category_id.toString() === selectedCategory)
      .map(sub => ({ value: sub.id.toString(), label: sub.name }))
  ];

  return (
    <Paper className="block-card" p="md">
      <Group align="flex-end">
        <TextInput
          label="SEARCH"
          placeholder="Product name, SKU, brand..."
          leftSection={<Search size={16} />}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ flex: 1 }}
          className="block-input"
          styles={{ label: { fontFamily: "'Manrope', sans-serif", fontWeight: 700 } }}
        />
        <Select
          label="CATEGORY"
          data={categoryOptions}
          value={selectedCategory}
          onChange={(val) => {
            onCategoryChange(val || 'all');
            onSubcategoryChange('all');
          }}
          searchable
          className="block-input"
          styles={{ label: { fontFamily: "'Manrope', sans-serif", fontWeight: 700 } }}
        />
        <Select
          label="SUBCATEGORY"
          data={subcategoryOptions}
          value={selectedSubcategory}
          onChange={(val) => onSubcategoryChange(val || 'all')}
          disabled={selectedCategory === 'all'}
          searchable
          className="block-input"
          styles={{ label: { fontFamily: "'Manrope', sans-serif", fontWeight: 700 } }}
        />
      </Group>
    </Paper>
  );
}
