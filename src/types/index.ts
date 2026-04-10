// Shared types for the application — kept in sync with api/models.py

// ─── Enums ────────────────────────────────────────────────────────────────────

export type TransactionType = "purchase" | "sale";
export type RepairStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type PaymentStatus = "paid" | "pending" | "partial";
export type PaymentMethod = "cash" | "card" | "transfer" | "other";
export type ReturnAction = "refund" | "exchange" | "repair" | "replacement";
export type ReturnStatus = "pending" | "approved" | "rejected" | "resolved";
export type ExpenseCategory = "rent" | "utilities" | "supplies" | "equipment" | "marketing" | "salary" | "other";
export type UserRole = "admin" | "manager" | "technician" | "cashier";
export type StockMovementType = "purchase" | "sale" | "repair_part" | "repair_part_removed" | "return_in" | "return_out" | "adjustment" | "initial";
export type AuditAction = "create" | "update" | "delete" | "status_change";

// ─── Product ──────────────────────────────────────────────────────────────────

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSubcategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category_id: string;
  is_active?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  brand?: string | null;
  model?: string | null;
  sku: string;
  barcode?: string | null;
  dimensions?: string | null;
  weight?: number | null;
  weight_unit?: string;
  attributes: Record<string, unknown>;
  last_purchase_cost: number;
  suggested_sell_price: number;
  low_stock_threshold: number;
  current_stock: number;
  version: number;
  status: string;
  description?: string | null;
  supplier?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ProductCategory | null;
  subcategory?: ProductSubcategory | null;
}

// ─── Stock Movement Ledger ────────────────────────────────────────────────────

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_delta: number;    // positive = in, negative = out
  balance_after: number;
  movement_type: StockMovementType;
  reference_type: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  changed_by?: string;
  timestamp: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
}

// ─── Transaction (purchases only going forward; legacy sales data) ────────────

export interface Transaction {
  id: string;
  product_id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_cost?: number;
  unit_price?: number;
  party_name?: string;
  transport_other_cost?: number;
  reference_number?: string;
  notes?: string;
  created_at: string;
  product?: Product;
}

// ─── Sale (immutable, first-class) ───────────────────────────────────────────

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;   // locked at point of sale
  unit_cost: number;    // locked at point of sale (for COGS)
  discount_per_item: number;
  line_total: number;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_number: number;
  sale_date: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_paid: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  items: SaleItem[];
}

export interface SaleItemInput {
  product_id: string;
  quantity: number;
  discount_per_item?: number;
}

export interface SaleCreateInput {
  sale_date?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  discount_amount?: number;
  tax_amount?: number;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  amount_paid?: number;
  notes?: string;
  items: SaleItemInput[];
}

// ─── Repair ───────────────────────────────────────────────────────────────────

export interface RepairPart {
  id: string;
  repair_id: string;
  product_id: string;
  quantity_used: number;
  unit_cost: number;   // locked at time of use
  total_cost: number;
  added_by?: string;
  added_at: string;
  stock_movement_id?: string;
}

export interface RepairStatusLog {
  id: string;
  repair_id: string;
  from_status: RepairStatus | null;
  to_status: RepairStatus;
  changed_by?: string;
  timestamp: string;
  notes?: string;
}

export interface Repair {
  id: string;
  version: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  phone_model: string;
  issue_description: string;
  technician_notes?: string;
  repair_status: RepairStatus;
  payment_status: PaymentStatus;
  date_received: string;
  estimated_completion?: string;
  date_completed?: string;
  labor_cost: number;
  parts_cost: number;    // computed from RepairPart records — read-only
  total_amount: number;
  amount_paid: number;
  warranty_period?: number;
  warranty_expiry?: string;
  assigned_technician?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  parts_used: RepairPart[];
  status_log: RepairStatusLog[];
}

export interface RepairStatusTransitionInput {
  new_status: RepairStatus;
  notes?: string;
  expected_version?: number;   // optimistic lock
}

export interface AddRepairPartInput {
  product_id: string;
  quantity_used: number;
  unit_cost_override?: number;
}

// ─── Return ───────────────────────────────────────────────────────────────────

export interface Return {
  id: string;
  product_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  reason: string;
  action_taken: ReturnAction;
  status: ReturnStatus;
  return_date: string;
  original_sale_id?: string;
  original_sale_item_id?: string;
  original_transaction_id?: string;
  refund_amount?: number;
  replacement_product_id?: string;
  notes?: string;
  stock_movement_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  reference_number?: string;
  vendor?: string;
  payment_method?: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_products: number;
  low_stock_products: number;
  total_repairs: number;
  pending_repairs: number;
  completed_repairs: number;
  total_transactions: number;
  total_expenses: number;
  monthly_revenue: number;
  monthly_profit: number;
}

/** V2 — sales and repair revenue always separated */
export interface FinancialSummary {
  sales_revenue: number;
  sales_cogs: number;
  sales_gross_profit: number;
  repair_revenue: number;
  repair_parts_cost: number;
  repair_labor_cost: number;
  repair_gross_profit: number;
  total_expenses: number;
  transport_costs: number;
  net_profit: number;
  profit_margin: number;
  inventory_value_at_cost: number;
}
