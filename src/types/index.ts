// Shared types for the application

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
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  subcategory_id: string | null;
  brand?: string | null;
  model?: string | null;
  sku: string;
  barcode?: string | null;
  dimensions?: string | null;
  weight?: number | null;
  weight_unit?: string;
  attributes: Record<string, any>;
  last_purchase_cost: number;
  suggested_sell_price: number;
  low_stock_threshold: number;
  image_url?: string | null;
  current_stock: number;
  status: string;
  description?: string | null;
  supplier?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ProductCategory | null;
  subcategory?: ProductSubcategory | null;
}

export interface Transaction {
  id: string;
  product_id: string;
  transaction_date: string;
  transaction_type: "purchase" | "sale";
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

export interface RepairPart {
  id: string;
  repair_id: string;
  product_id: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface Repair {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  phone_model: string;
  issue_description: string;
  technician_notes?: string;
  repair_status: "pending" | "in_progress" | "completed" | "cancelled";
  payment_status: "paid" | "pending" | "partial";
  date_received: string;
  estimated_completion?: string;
  date_completed?: string;
  labor_cost: number;
  parts_cost: number;
  total_amount: number;
  amount_paid: number;
  warranty_period?: number;
  warranty_expiry?: string;
  created_at: string;
  updated_at: string;
  parts_used?: RepairPart[];
}

export interface Return {
  id: string;
  product_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  reason: string;
  action_taken: "refund" | "exchange" | "repair" | "replacement";
  status: "pending" | "approved" | "rejected" | "resolved";
  return_date: string;
  original_transaction_id?: string;
  refund_amount?: number;
  replacement_product_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  product?: Product | {
    phone_model?: string;
    part_type?: string;
    variant?: string;
  };
}

export interface Expense {
  id: string;
  expense_date: string;
  description: string;
  amount: number;
  category: "supplies" | "equipment" | "utilities" | "rent" | "marketing" | "salary" | "other";
  reference_number?: string;
  vendor?: string;
  payment_method?: string;
  notes?: string;
  receipt_url?: string;
  created_at: string;
}
