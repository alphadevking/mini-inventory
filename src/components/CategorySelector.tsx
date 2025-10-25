import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/lib/api";

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface ProductSubcategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category_id: string;
}

interface CategorySelectorProps {
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  selectedSubcategoryId?: string;
  onSubcategoryChange?: (subcategoryId: string) => void;
  showSubcategories?: boolean;
  required?: boolean;
  placeholder?: string;
  subcategoryPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  allowEmptySubcategory?: boolean;
}

// Cache for subcategories to avoid redundant API calls
const subcategoryCache = new Map<string, ProductSubcategory[]>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Debounce utility
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Cache cleanup utility
const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, expiry] of cacheExpiry.entries()) {
    if (now > expiry) {
      subcategoryCache.delete(key);
      cacheExpiry.delete(key);
    }
  }
};

export default function CategorySelector({
  selectedCategoryId,
  onCategoryChange,
  selectedSubcategoryId = "",
  onSubcategoryChange,
  showSubcategories = true,
  required = false,
  placeholder = "Select category",
  subcategoryPlaceholder = "Select subcategory",
  className = "",
  disabled = false,
  allowEmptySubcategory = true
}: CategorySelectorProps) {
  const { data: categories, loading: categoriesLoading } = useFetch<ProductCategory[]>("/api/categories");

  // Optimized subcategory fetching with caching
  const fetchSubcategories = useCallback(async (categoryId: string): Promise<ProductSubcategory[]> => {
    // Clean up expired cache entries
    cleanupExpiredCache();

    // Check cache first
    const cached = subcategoryCache.get(categoryId);
    const expiry = cacheExpiry.get(categoryId);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    try {
      const response = await fetch(`/api/categories/${categoryId}/subcategories`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const subcategories = data || [];

      // Cache the result
      subcategoryCache.set(categoryId, subcategories);
      cacheExpiry.set(categoryId, Date.now() + CACHE_DURATION);

      return subcategories;
    } catch (error) {
      return [];
    }
  }, []);

  // Debounced fetch function
  const debouncedFetchSubcategories = useMemo(
    () => debounce(fetchSubcategories, 300),
    [fetchSubcategories]
  );

  // Fetch subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId && selectedCategoryId !== "all" && selectedCategoryId !== "placeholder" && showSubcategories) {
      setSubcategoriesLoading(true);

      fetchSubcategories(selectedCategoryId)
        .then(subcategoriesData => {
          setSubcategories(subcategoriesData);
          setSubcategoriesLoading(false);

          // Don't auto-select subcategory - let user choose
          // This prevents unwanted auto-selection behavior
        })
        .catch(error => {
          setSubcategories([]);
          setSubcategoriesLoading(false);
        });
    } else {
      setSubcategories([]);
      setSubcategoriesLoading(false);
    }
  }, [selectedCategoryId, showSubcategories, fetchSubcategories]);

  const [subcategories, setSubcategories] = useState<ProductSubcategory[]>([]);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);



  const handleCategoryChange = (value: string) => {
    // Don't allow selecting the placeholder option
    if (value === "placeholder") {
      return;
    }

    onCategoryChange(value);

    // Reset subcategory when category changes
    if (onSubcategoryChange) {
      onSubcategoryChange("");
    }

    // Immediately fetch subcategories for the new category using optimized fetch
    if (value && value !== "all" && value !== "placeholder" && showSubcategories) {
      setSubcategoriesLoading(true);

      fetchSubcategories(value)
        .then(subcategoriesData => {
          setSubcategories(subcategoriesData);
          setSubcategoriesLoading(false);

          // Don't auto-select subcategory - let user choose
          // This prevents unwanted auto-selection behavior
        })
        .catch(error => {
          setSubcategories([]);
          setSubcategoriesLoading(false);
        });
    } else {
      setSubcategories([]);
      setSubcategoriesLoading(false);
    }
  };

  const handleSubcategoryChange = (value: string) => {
    // Don't allow selecting the placeholder option
    if (value === "placeholder") {
      return;
    }

    if (onSubcategoryChange) {
      // Convert "none" back to empty string for the parent component
      onSubcategoryChange(value === "none" ? "" : value);
    }
  };

  if (categoriesLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label>Category</Label>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </div>
        {showSubcategories && (
          <div>
            <Label>Subcategory</Label>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }



  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label htmlFor="category">
          Category {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={selectedCategoryId || undefined} onValueChange={handleCategoryChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {categories?.filter((category) => category.id && category.id.trim() !== "").map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  {category.icon && <span>{category.icon}</span>}
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSubcategories && (
        <div>
          <Label htmlFor="subcategory">Subcategory</Label>
          <Select
            value={selectedSubcategoryId === "" ? "none" : selectedSubcategoryId || undefined}
            onValueChange={handleSubcategoryChange}
            disabled={disabled || subcategoriesLoading || subcategories.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  subcategoriesLoading
                    ? "Loading subcategories..."
                    : subcategories.length === 0
                      ? "No subcategories available"
                      : subcategoryPlaceholder
                }
              />
            </SelectTrigger>
            <SelectContent>
              {allowEmptySubcategory && (
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <span>No subcategory</span>
                  </div>
                </SelectItem>
              )}
              {subcategories.length > 0 ? (
                subcategories
                  .filter((subcategory) => subcategory.id && subcategory.id.trim() !== "")
                  .map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      <div className="flex items-center gap-2">
                        {subcategory.icon && <span>{subcategory.icon}</span>}
                        <span>{subcategory.name}</span>
                      </div>
                    </SelectItem>
                  ))
              ) : (
                <SelectItem value="no-subcategories" disabled>
                  No subcategories available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
