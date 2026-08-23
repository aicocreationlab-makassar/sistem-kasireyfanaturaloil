export type Role = "owner" | "admin" | "cashier";
export type PaymentMethod = "cash" | "transfer" | "qris" | "other";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  variant: "Murni" | "Bakar" | "Hitam";
  size_ml: number;
  sku: string;
  barcode_value: string | null;
  barcode_type: "qr" | "ean13" | "ean8" | "code128" | "custom" | null;
  selling_price: number;
  hpp: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  transaction_code: string;
  cashier_id: string;
  payment_method: PaymentMethod | null;
  subtotal: number;
  total_amount: number;
  amount_received: number | null;
  change_amount: number | null;
  total_cogs: number | null;
  gross_profit: number | null;
  status: "completed" | "voided";
  note: string | null;
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string;
  variant_snapshot: string;
  size_ml_snapshot: number;
  quantity: number;
  unit_selling_price: number;
  unit_hpp: number | null;
  line_revenue: number;
  line_cogs: number | null;
  line_gross_profit: number | null;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: "sale" | "stock_in" | "adjustment_in" | "adjustment_out" | "return" | "initial";
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reference_note: string | null;
  unit_cost: number | null;
  created_at: string;
  products?: Pick<Product, "name" | "size_ml"> | null;
  profiles?: { full_name: string } | null;
}

export interface CartItem { product: Product; quantity: number }

export interface ReportRow extends SaleItem {
  sales: Pick<Sale, "transaction_code" | "created_at" | "payment_method" | "status"> & {
    profiles?: { full_name: string } | null;
  };
}
