import { z } from "zod";

// === Enums ===
export const TransactionTypeSchema = z.enum(["purchase", "sale"]);
export const RepairStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
export const ReturnActionSchema = z.enum(["refund", "exchange", "repair", "replacement"]);
export const ReturnStatusSchema = z.enum(["pending", "approved", "rejected", "resolved"]);
export const PaymentStatusSchema = z.enum(["paid", "pending", "partial"]);
export const ExpenseCategorySchema = z.enum(["supplies", "equipment", "utilities", "rent", "marketing", "salary", "other"]);

// === Product Schemas ===
export const ProductCategoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Category name too long"),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const ProductCategoryUpdateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Category name too long").optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const ProductSubcategoryCreateSchema = z.object({
  name: z.string().min(1, "Subcategory name is required").max(100, "Subcategory name too long"),
  category_id: z.string().uuid("Invalid category ID"),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const ProductSubcategoryUpdateSchema = z.object({
  name: z.string().min(1, "Subcategory name is required").max(100, "Subcategory name too long").optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200, "Product name too long"),
  category_id: z.string().uuid("Invalid category ID"),
  subcategory_id: z.string().uuid("Invalid subcategory ID").optional().nullable(),
  brand: z.string().optional(),
  model: z.string().optional(),
  sku: z.string()
    .min(1, "SKU is required")
    .max(50, "SKU too long")
    .regex(/^[A-Z0-9-_]+$/i, "SKU must contain only letters, numbers, hyphens, and underscores"),
  barcode: z.string().optional().nullable(),
  dimensions: z.string().optional(),
  weight: z.number().min(0, "Weight must be positive").optional(),
  weight_unit: z.enum(["g", "kg", "oz", "lb"]).default("kg"),
  last_purchase_cost: z.number().min(0, "Purchase cost must be positive"),
  suggested_sell_price: z.number().min(0, "Sell price must be positive"),
  low_stock_threshold: z.number().int().min(0, "Low stock threshold must be non-negative"),
  current_stock: z.number().int().min(0, "Current stock must be non-negative"),
  status: z.string().default("active"),
  description: z.string().optional(),
  supplier: z.string().optional(),
  image_url: z.string().url("Invalid image URL").optional().nullable(),
  attributes: z.record(z.any()).default({}),
  is_active: z.boolean().default(true),
}).refine(
  (data) => data.suggested_sell_price >= data.last_purchase_cost,
  {
    message: "Sell price should not be less than purchase cost",
    path: ["suggested_sell_price"],
  }
);

export const ProductUpdateSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200, "Product name too long").optional(),
  category_id: z.string().uuid("Invalid category ID").optional(),
  subcategory_id: z.string().uuid("Invalid subcategory ID").optional().nullable(),
  brand: z.string().optional(),
  model: z.string().optional(),
  sku: z.string()
    .min(1, "SKU is required")
    .max(50, "SKU too long")
    .regex(/^[A-Z0-9-_]+$/i, "SKU must contain only letters, numbers, hyphens, and underscores")
    .optional(),
  barcode: z.string().optional().nullable(),
  dimensions: z.string().optional(),
  weight: z.number().min(0, "Weight must be positive").optional(),
  weight_unit: z.enum(["g", "kg", "oz", "lb"]).optional(),
  last_purchase_cost: z.number().min(0, "Purchase cost must be positive").optional(),
  suggested_sell_price: z.number().min(0, "Sell price must be positive").optional(),
  low_stock_threshold: z.number().int().min(0, "Low stock threshold must be non-negative").optional(),
  current_stock: z.number().int().min(0, "Current stock must be non-negative").optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  supplier: z.string().optional(),
  image_url: z.string().url("Invalid image URL").optional().nullable(),
  attributes: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.suggested_sell_price && data.last_purchase_cost) {
      return data.suggested_sell_price >= data.last_purchase_cost;
    }
    return true;
  },
  {
    message: "Sell price should not be less than purchase cost",
    path: ["suggested_sell_price"],
  }
);

// === Transaction Schemas ===
export const TransactionCreateSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  transaction_type: TransactionTypeSchema,
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.number().min(0, "Unit cost must be positive").optional(),
  unit_price: z.number().min(0, "Unit price must be positive").optional(),
  party_name: z.string().min(1, "Party name is required").max(200, "Party name too long"),
  transport_other_cost: z.number().min(0, "Transport cost must be non-negative").optional().default(0),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.transaction_type === "purchase") {
      return data.unit_cost !== undefined && data.unit_cost >= 0;
    } else {
      return data.unit_price !== undefined && data.unit_price >= 0;
    }
  },
  {
    message: "Unit cost is required for purchases, unit price is required for sales",
    path: ["unit_cost", "unit_price"],
  }
);

export const TransactionUpdateSchema = z.object({
  product_id: z.string().uuid("Invalid product ID").optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  transaction_type: TransactionTypeSchema.optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").optional(),
  unit_cost: z.number().min(0, "Unit cost must be positive").optional(),
  unit_price: z.number().min(0, "Unit price must be positive").optional(),
  party_name: z.string().min(1, "Party name is required").max(200, "Party name too long").optional(),
  transport_other_cost: z.number().min(0, "Transport cost must be non-negative").optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

// === Repair Schemas ===
export const RepairCreateSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required").max(200, "Customer name too long"),
  customer_phone: z.string().min(1, "Customer phone is required").max(20, "Phone number too long"),
  customer_email: z.string().email("Invalid email format").optional(),
  phone_model: z.string().min(1, "Phone model is required").max(100, "Phone model too long"),
  issue_description: z.string().min(1, "Issue description is required").max(1000, "Description too long"),
  status: RepairStatusSchema.default("pending"),
  estimated_cost: z.number().min(0, "Estimated cost must be positive").optional(),
  estimated_days: z.number().int().min(1, "Estimated days must be at least 1").optional(),
  notes: z.string().optional(),
});

export const RepairUpdateSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required").max(200, "Customer name too long").optional(),
  customer_phone: z.string().min(1, "Customer phone is required").max(20, "Phone number too long").optional(),
  customer_email: z.string().email("Invalid email format").optional(),
  phone_model: z.string().min(1, "Phone model is required").max(100, "Phone model too long").optional(),
  issue_description: z.string().min(1, "Issue description is required").max(1000, "Description too long").optional(),
  estimated_cost: z.number().min(0, "Estimated cost must be positive").optional(),
  estimated_days: z.number().int().min(1, "Estimated days must be at least 1").optional(),
  actual_cost: z.number().min(0, "Actual cost must be positive").optional(),
  status: RepairStatusSchema.optional(),
  notes: z.string().optional(),
});

// === Return Schemas ===
export const ReturnCreateSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  customer_name: z.string().min(1, "Customer name is required").max(200, "Customer name too long"),
  customer_phone: z.string().min(1, "Customer phone is required").max(20, "Phone number too long"),
  customer_email: z.string().email("Invalid email format").optional(),
  reason: z.string().min(1, "Return reason is required").max(500, "Return reason too long"),
  status: ReturnStatusSchema.optional(),
  action_taken: ReturnActionSchema,
  refund_amount: z.number().min(0, "Refund amount must be non-negative").optional(),
  notes: z.string().optional(),
});

export const ReturnUpdateSchema = z.object({
  product_id: z.string().uuid("Invalid product ID").optional(),
  customer_name: z.string().min(1, "Customer name is required").max(200, "Customer name too long").optional(),
  customer_phone: z.string().min(1, "Customer phone is required").max(20, "Phone number too long").optional(),
  customer_email: z.string().email("Invalid email format").optional(),
  reason: z.string().min(1, "Return reason is required").max(500, "Return reason too long").optional(),
  status: ReturnStatusSchema.optional(),
  action_taken: ReturnActionSchema.optional(),
  refund_amount: z.number().min(0, "Refund amount must be non-negative").optional(),
  notes: z.string().optional(),
});

// === Expense Schemas ===
export const ExpenseCreateSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  amount: z.number().min(0.01, "Amount must be positive"),
  category: ExpenseCategorySchema,
  reference_number: z.string().optional(),
  vendor: z.string().max(200, "Vendor name too long").optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  receipt_url: z.string().url("Invalid URL").optional(),
});

export const ExpenseUpdateSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  description: z.string().min(1, "Description is required").max(500, "Description too long").optional(),
  amount: z.number().min(0.01, "Amount must be positive").optional(),
  category: ExpenseCategorySchema.optional(),
  reference_number: z.string().optional(),
  vendor: z.string().max(200, "Vendor name too long").optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  receipt_url: z.string().url("Invalid URL").optional(),
});

// === Type Exports ===
export type ProductCategoryCreate = z.infer<typeof ProductCategoryCreateSchema>;
export type ProductCategoryUpdate = z.infer<typeof ProductCategoryUpdateSchema>;
export type ProductSubcategoryCreate = z.infer<typeof ProductSubcategoryCreateSchema>;
export type ProductSubcategoryUpdate = z.infer<typeof ProductSubcategoryUpdateSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type TransactionCreate = z.infer<typeof TransactionCreateSchema>;
export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;
export type RepairCreate = z.infer<typeof RepairCreateSchema>;
export type RepairUpdate = z.infer<typeof RepairUpdateSchema>;
export type ReturnCreate = z.infer<typeof ReturnCreateSchema>;
export type ReturnUpdate = z.infer<typeof ReturnUpdateSchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;
