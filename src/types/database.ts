export type UserRole = 'admin' | 'staff' | 'owner';

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Size {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id?: string;
  size_ids: string[];
  price_inr: number;
  cost_inr?: number;
  quantity_in_stock: number;
  image_url?: string;
  description?: string;
  sku?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  pdf_url?: string;
  created_by?: string;
  payment_status?: string;
  expected_payment_date?: string;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name: string;
  size_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_percentage: number;
  logo_url?: string;
  currency_symbol: string;
  low_stock_threshold?: number;
  whatsapp_channel?: string;
  instagram_page?: string;
  whatsapp_tagline?: string;
  instagram_tagline?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  size?: Size;
  quantity: number;
}
