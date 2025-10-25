import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, Plus } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  title?: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filterable?: boolean;
  filterOptions?: Array<{ value: string; label: string }>;
  onFilter?: (value: string) => void;
  exportable?: boolean;
  onExport?: () => void;
  addable?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  filterable = false,
  filterOptions = [],
  onFilter,
  exportable = false,
  onExport,
  addable = false,
  onAdd,
  addLabel = "Add New",
  loading = false,
  emptyMessage = "No data available",
  className = ""
}: DataTableProps<T>) {
  if (loading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(title || searchable || filterable || exportable || addable) && (
        <CardHeader>
          <div className="flex flex-col space-y-4">
            {title && (
              <div>
                <CardTitle>{title}</CardTitle>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              {searchable && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={searchPlaceholder}
                    onChange={(e) => onSearch?.(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
              {filterable && (
                <Select onValueChange={onFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-2">
                {exportable && (
                  <Button variant="outline" size="sm" onClick={onExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
                {addable && (
                  <Button size="sm" onClick={onAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    {addLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {columns.map((column) => (
                    <th key={String(column.key)} className="text-left p-2 font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="p-2">
                        {column.render
                          ? column.render(item[column.key], item)
                          : String(item[column.key] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
