import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/lib/api";
import { Search, Filter, Download, Settings } from "lucide-react";
import { Link } from "react-router";
import { exportToExcel } from "@/lib/exportUtils";
import { Product, ProductCategory, ProductSubcategory } from "@/types";

interface ProductFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (value: string) => void;
  filteredProducts: Product[];
  className?: string;
}

export default function ProductFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  filteredProducts,
  className = ""
}: ProductFiltersProps) {
  const { data: categories } = useFetch<ProductCategory[]>("/api/categories");
  const [subcategories, setSubcategories] = React.useState<ProductSubcategory[]>([]);

  // Fetch subcategories when category changes
  React.useEffect(() => {
    if (selectedCategory && selectedCategory !== "all") {
      fetch(`/api/categories/${selectedCategory}/subcategories`)
        .then(response => response.json())
        .then(data => setSubcategories(data))
        .catch(error => console.error("Failed to fetch subcategories:", error));
    } else {
      setSubcategories([]);
    }
  }, [selectedCategory]);

  const handleCategoryChange = (value: string) => {
    onCategoryChange(value);
    onSubcategoryChange("all"); // Reset subcategory when category changes
    setSubcategories([]); // Clear subcategories when category changes
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters & Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSubcategory || "all"} onValueChange={onSubcategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Subcategories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory.id} value={subcategory.id}>
                  <div className="flex items-center gap-2">
                    {subcategory.icon && <span>{subcategory.icon}</span>}
                    <span>{subcategory.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToExcel(filteredProducts, "products")}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/categories">
                <Settings className="w-4 h-4 mr-2" />
                Categories
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
