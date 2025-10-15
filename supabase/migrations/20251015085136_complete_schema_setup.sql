/*
  # Complete Database Schema Setup for Garment Store
  
  1. New Tables
    - `user_roles`: Stores user role assignments (admin, staff, owner)
    - `categories`: Product categories
    - `sizes`: Available product sizes (XS, S, M, L, XL, XXL, XXXL)
    - `products`: Product inventory with pricing, stock, and details
    - `invoices`: Sales invoices with customer and payment information
    - `invoice_items`: Line items for each invoice
    - `store_settings`: Store configuration and preferences
  
  2. Storage Buckets
    - `product-images`: Public bucket for product images
    - `store-assets`: Public bucket for store logos and assets
  
  3. Security
    - Enable RLS on all tables
    - Authenticated users can manage their store data
    - Public read access to product images
    - Secure policies for data access
  
  4. Key Features
    - Multi-size product support
    - Invoice generation with tax and discount
    - Payment status tracking
    - Low stock threshold monitoring
    - Social media integration (WhatsApp, Instagram)
    - Customizable store branding
*/

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'owner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sizes table
CREATE TABLE IF NOT EXISTS public.sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default sizes
INSERT INTO public.sizes (name, sort_order) VALUES
  ('XS', 1),
  ('S', 2),
  ('M', 3),
  ('L', 4),
  ('XL', 5),
  ('XXL', 6),
  ('XXXL', 7)
ON CONFLICT (name) DO NOTHING;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  size_ids UUID[] DEFAULT '{}',
  price_inr DECIMAL(10, 2) NOT NULL,
  cost_inr DECIMAL(10, 2),
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  sku TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT DEFAULT 'percentage',
  grand_total DECIMAL(10, 2) NOT NULL,
  payment_status TEXT DEFAULT 'done' CHECK (payment_status IN ('done', 'pending')),
  expected_payment_date DATE,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  size_name TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'My Garment Store',
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  logo_url TEXT,
  currency_symbol TEXT DEFAULT '₹',
  invoice_font_family TEXT DEFAULT 'helvetica',
  invoice_primary_color TEXT DEFAULT '#000000',
  invoice_secondary_color TEXT DEFAULT '#666666',
  low_stock_threshold INTEGER DEFAULT 10,
  whatsapp_channel TEXT DEFAULT '',
  instagram_page TEXT DEFAULT '',
  whatsapp_tagline TEXT DEFAULT 'Join our WhatsApp group',
  instagram_tagline TEXT DEFAULT 'Follow us on Instagram',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default store settings if not exists
INSERT INTO public.store_settings (store_name, tax_percentage) 
VALUES ('My Garment Store', 18.00)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Authenticated users can view user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for sizes
CREATE POLICY "Authenticated users can view sizes"
  ON public.sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sizes"
  ON public.sizes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sizes"
  ON public.sizes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sizes"
  ON public.sizes FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for invoices
CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for invoice_items
CREATE POLICY "Authenticated users can view invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create invoice items"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice items"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete invoice items"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for store_settings
CREATE POLICY "Authenticated users can view store settings"
  ON public.store_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update store settings"
  ON public.store_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create store settings"
  ON public.store_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('product-images', 'product-images', true),
  ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Storage policies for store-assets
CREATE POLICY "Authenticated users can upload store assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Anyone can view store assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can update store assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-assets')
  WITH CHECK (bucket_id = 'store-assets');

CREATE POLICY "Authenticated users can delete store assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-assets');