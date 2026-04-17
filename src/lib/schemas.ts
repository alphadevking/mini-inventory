import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const RepairStatusSchema = z.enum(["pending", "in_progress", "completed", "cancelled"]);
export const ReturnActionSchema = z.enum(["refund", "exchange", "repair", "replacement"]);
export const ReturnStatusSchema = z.enum(["pending", "approved", "rejected", "resolved"]);
export const PaymentStatusSchema = z.enum(["paid", "pending", "partial"]);
export const PaymentMethodSchema = z.enum(["cash", "card", "transfer", "other"]);
// Keep enum order matching backend
export const ExpenseCategorySchema = z.enum(["rent", "utilities", "supplies", "equipment", "marketing", "salary", "other"]);

// ─── Product Schemas ──────────────────────────────────────────────────────────

export const ProductCategoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().or(z.literal("")).optional().nullable(),
  icon: z.string().or(z.literal("")).optional().nullable(),
  color: z.string().or(z.literal("")).optional().nullable(),
});

export const ProductCategoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().or(z.literal("")).optional().nullable(),
  icon: z.string().or(z.literal("")).optional().nullable(),
  color: z.string().or(z.literal("")).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const ProductSubcategoryCreateSchema = z.object({
  name: z.string().min(1, "Subcategory name is required").max(100),
  category_id: z.string().uuid("Invalid category ID"),
  description: z.string().or(z.literal("")).optional().nullable(),
  icon: z.string().or(z.literal("")).optional().nullable(),
});

export const ProductSubcategoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().or(z.literal("")).optional().nullable(),
  icon: z.string().or(z.literal("")).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200),
  // category_id is optional on the backend — don't require it here
  category_id: z.string().uuid("Invalid category ID").optional().nullable(),
  subcategory_id: z.string().uuid("Invalid subcategory ID").optional().nullable(),
  brand: z.string().optional(),
  model: z.string().optional(),
  sku: z.string()
    .min(1, "SKU is required")
    .max(50)
    .regex(/^[A-Z0-9-_]+$/i, "SKU must contain only letters, numbers, hyphens, and underscores"),
  barcode: z.string().optional().nullable(),
  dimensions: z.string().optional(),
  weight: z.number().min(0).optional(),
  weight_unit: z.enum(["g", "kg", "oz", "lb"]).default("g"),
  last_purchase_cost: z.number().min(0, "Purchase cost must be non-negative"),
  suggested_sell_price: z.number().min(0, "Sell price must be non-negative"),
  low_stock_threshold: z.number().int().min(0).default(3),
  current_stock: z.number().int().min(0).default(0),
  status: z.string().default("active"),
  description: z.string().optional(),
  supplier: z.string().optional(),
  image_url: z.string().url("Invalid image URL").optional().nullable(),
  attributes: z.record(z.unknown()).default({}),
  is_active: z.boolean().default(true),
}).refine(
  (d) => d.suggested_sell_price >= d.last_purchase_cost,
  { message: "Sell price should not be less than purchase cost", path: ["suggested_sell_price"] }
);

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category_id: z.string().uuid().optional().nullable(),
  subcategory_id: z.string().uuid().optional().nullable(),
  brand: z.string().optional(),
  model: z.string().optional(),
  sku: z.string().min(1).max(50).regex(/^[A-Z0-9-_]+$/i).optional(),
  barcode: z.string().optional().nullable(),
  dimensions: z.string().optional(),
  weight: z.number().min(0).optional(),
  weight_unit: z.enum(["g", "kg", "oz", "lb"]).optional(),
  last_purchase_cost: z.number().min(0).optional(),
  suggested_sell_price: z.number().min(0).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  current_stock: z.number().int().min(0).optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  supplier: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  attributes: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
}).refine(
  (d) => {
    if (d.suggested_sell_price !== undefined && d.last_purchase_cost !== undefined) {
      return d.suggested_sell_price >= d.last_purchase_cost;
    }
    return true;
  },
  { message: "Sell price should not be less than purchase cost", path: ["suggested_sell_price"] }
);

// ─── Purchase Schemas (supplier intake) ──────────────────────────────────────

export const ProductUnitSpecSchema = z.object({
  serial_number: z.string().min(1, "Serial number is required"),
  imei: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  storage: z.string().optional().nullable(),
  condition: z.string().default("New"),
  notes: z.string().optional().nullable(),
});

export const PurchaseItemCreateSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.number().min(0, "Unit cost must be non-negative"),
  units: z.array(ProductUnitSpecSchema).default([]),
}).refine(
  (d) => d.units.length === 0 || d.units.length === d.quantity,
  { message: "Number of unit specs must equal quantity for serialized products", path: ["units"] }
);

export const PurchaseCreateSchema = z.object({
  supplier: z.string().min(1, "Supplier is required").max(200),
  reference_number: z.string().or(z.literal("")).optional().nullable(),
  delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)").optional(),
  transport_cost: z.number().min(0).default(0),
  notes: z.string().or(z.literal("")).optional().nullable(),
  items: z.array(PurchaseItemCreateSchema).min(1, "At least one item is required"),
});

// ─── Sale Schemas (new first-class entity) ────────────────────────────────────

export const SaleItemInputSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  discount_per_item: z.number().min(0).default(0),
  // Serialized inventory: the specific physical unit being sold (optional for bulk items)
  unit_id: z.string().uuid().optional().nullable(),
});

export const SaleCreateSchema = z.object({
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)").optional(),
  customer_name: z.string().max(200).optional(),
  customer_phone: z.string().max(20).optional(),
  customer_email: z.string().email().or(z.literal("")).optional().nullable(),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  payment_method: PaymentMethodSchema.default("cash"),
  payment_status: PaymentStatusSchema.default("paid"),
  amount_paid: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(SaleItemInputSchema).min(1, "At least one item is required"),
});

// ─── Repair Schemas ───────────────────────────────────────────────────────────

export const RepairCreateSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required").max(200),
  customer_phone: z.string().min(1, "Phone is required").max(20),
  customer_email: z.string().email().or(z.literal("")).optional().nullable(),
  phone_model: z.string().min(1, "Phone model is required").max(100),
  issue_description: z.string().min(1, "Issue description is required").max(1000),
  technician_notes: z.string().optional(),
  // repair_status is NOT here — set on creation as "pending", changed via PATCH /status
  payment_status: PaymentStatusSchema.default("pending"),
  date_received: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)").optional(),
  estimated_completion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional().nullable(),
  labor_cost: z.number().min(0).default(0),
  // parts_cost and total_amount are NOT here — computed from RepairPart records server-side
  amount_paid: z.number().min(0).default(0),
  warranty_period: z.number().int().min(0).optional(),
  assigned_technician: z.string().uuid().optional().nullable(),
});

export const RepairUpdateSchema = z.object({
  customer_name: z.string().min(1).max(200).optional(),
  customer_phone: z.string().min(1).max(20).optional(),
  customer_email: z.string().email().or(z.literal("")).optional().nullable(),
  phone_model: z.string().min(1).max(100).optional(),
  issue_description: z.string().min(1).max(1000).optional(),
  technician_notes: z.string().optional(),
  // repair_status intentionally excluded — use PATCH /repairs/:id/status
  payment_status: PaymentStatusSchema.optional(),
  estimated_completion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional().nullable(),
  labor_cost: z.number().min(0).optional(),
  // total_amount is computed server-side — not accepted as input
  amount_paid: z.number().min(0).optional(),
  warranty_period: z.number().int().min(0).optional(),
  warranty_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  assigned_technician: z.string().uuid().optional().nullable(),
});

export const RepairStatusTransitionSchema = z.object({
  new_status: RepairStatusSchema,
  notes: z.string().optional(),
  expected_version: z.number().int().optional(),
});

export const AddRepairPartSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity_used: z.number().int().min(1, "Quantity must be at least 1"),
  unit_cost_override: z.number().min(0).optional(),
});

// ─── Return Schemas ───────────────────────────────────────────────────────────

export const ReturnCreateSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  customer_name: z.string().min(1, "Customer name is required").max(200),
  customer_phone: z.string().min(1, "Phone is required").max(20),
  customer_email: z.string().email().or(z.literal("")).optional().nullable(),
  reason: z.string().min(1, "Return reason is required").max(500),
  action_taken: ReturnActionSchema,
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  original_sale_id: z.string().uuid().optional().nullable(),
  original_sale_item_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  refund_amount: z.number().min(0).optional(),
  replacement_product_id: z.string().uuid("Invalid replacement product ID").optional().nullable(),
  notes: z.string().or(z.literal("")).optional().nullable(),
}).refine(
  (d) => {
    if (d.action_taken === "exchange" || d.action_taken === "replacement") {
      return !!d.replacement_product_id;
    }
    return true;
  },
  { message: "Replacement product is required for exchange/replacement actions", path: ["replacement_product_id"] }
);

export const ReturnStatusUpdateSchema = z.object({
  new_status: ReturnStatusSchema,
  notes: z.string().optional(),
});

// ─── Expense Schemas ──────────────────────────────────────────────────────────

export const ExpenseCreateSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)"),
  description: z.string().min(1, "Description is required").max(500),
  amount: z.number().min(0.01, "Amount must be positive"),
  category: ExpenseCategorySchema,
  reference_number: z.string().or(z.literal("")).optional().nullable(),
  vendor: z.string().max(200).or(z.literal("")).optional().nullable(),
  payment_method: z.string().or(z.literal("")).optional().nullable(),
  notes: z.string().or(z.literal("")).optional().nullable(),
  receipt_url: z.string().url("Invalid URL").or(z.literal("")).optional().nullable(),
});

export const ExpenseUpdateSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z.number().min(0.01).optional(),
  category: ExpenseCategorySchema.optional(),
  reference_number: z.string().or(z.literal("")).optional().nullable(),
  vendor: z.string().max(200).or(z.literal("")).optional().nullable(),
  payment_method: z.string().or(z.literal("")).optional().nullable(),
  notes: z.string().or(z.literal("")).optional().nullable(),
  receipt_url: z.string().url().or(z.literal("")).optional().nullable(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type ProductCategoryCreate = z.infer<typeof ProductCategoryCreateSchema>;
export type ProductCategoryUpdate = z.infer<typeof ProductCategoryUpdateSchema>;
export type ProductSubcategoryCreate = z.infer<typeof ProductSubcategoryCreateSchema>;
export type ProductSubcategoryUpdate = z.infer<typeof ProductSubcategoryUpdateSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductUnitSpec = z.infer<typeof ProductUnitSpecSchema>;
export type PurchaseItemCreate = z.infer<typeof PurchaseItemCreateSchema>;
export type PurchaseCreate = z.output<typeof PurchaseCreateSchema>;
export type PurchaseCreateInput = z.input<typeof PurchaseCreateSchema>;
export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;
export type SaleCreate = z.infer<typeof SaleCreateSchema>;
export type RepairCreate = z.infer<typeof RepairCreateSchema>;
export type RepairUpdate = z.infer<typeof RepairUpdateSchema>;
export type RepairStatusTransition = z.infer<typeof RepairStatusTransitionSchema>;
export type AddRepairPart = z.infer<typeof AddRepairPartSchema>;
export type ReturnCreate = z.infer<typeof ReturnCreateSchema>;
export type ReturnStatusUpdate = z.infer<typeof ReturnStatusUpdateSchema>;
export type ExpenseCreate = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdate = z.infer<typeof ExpenseUpdateSchema>;
