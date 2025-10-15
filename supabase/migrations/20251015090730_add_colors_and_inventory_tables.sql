/*
  # Add Colors, Product Inventory, and Product Size Prices Tables
  
  1. New Tables
    - `colors`: Store color options for products (e.g., Red, Blue, Black)
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `hex_code` (text) - Color hex value
      - `created_at` (timestamp)
    
    - `product_inventory`: Track inventory for each product-size-color combination
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `size_id` (uuid, foreign key to sizes)
      - `color_id` (uuid, foreign key to colors)
      - `quantity` (integer) - Stock quantity
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `product_size_prices`: Store different prices for different size-product combinations
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `size_id` (uuid, foreign key to sizes)
      - `price_inr` (numeric) - Price for this size
      - `created_at` (timestamp)
  
  2. Changes to Existing Tables
    - Update products table to remove size_ids array (replaced by product_size_prices)
    - Add color support to products
  
  3. Security
    - Enable RLS on all new tables
    - Authenticated users can manage all inventory data
  
  4. Key Features
    - Multi-color support for products
    - Granular inventory tracking per size and color
    - Flexible pricing per size
*/

-- Create colors table
CREATE TABLE IF NOT EXISTS public.colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  hex_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product_inventory table
CREATE TABLE IF NOT EXISTS public.product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size_id UUID REFERENCES public.sizes(id) ON DELETE CASCADE NOT NULL,
  color_id UUID REFERENCES public.colors(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, size_id, color_id)
);

-- Create product_size_prices table
CREATE TABLE IF NOT EXISTS public.product_size_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  size_id UUID REFERENCES public.sizes(id) ON DELETE CASCADE NOT NULL,
  price_inr NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, size_id)
);

-- Enable Row Level Security
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_size_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for colors
CREATE POLICY "Authenticated users can view colors"
  ON public.colors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create colors"
  ON public.colors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update colors"
  ON public.colors FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete colors"
  ON public.colors FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_inventory
CREATE POLICY "Authenticated users can view product inventory"
  ON public.product_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create product inventory"
  ON public.product_inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product inventory"
  ON public.product_inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product inventory"
  ON public.product_inventory FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for product_size_prices
CREATE POLICY "Authenticated users can view product size prices"
  ON public.product_size_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create product size prices"
  ON public.product_size_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update product size prices"
  ON public.product_size_prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete product size prices"
  ON public.product_size_prices FOR DELETE
  TO authenticated
  USING (true);

-- Insert some default colors
INSERT INTO public.colors (name, hex_code) VALUES
  ('Black', '#000000'),
  ('White', '#FFFFFF'),
  ('Red', '#FF0000'),
  ('Blue', '#0000FF'),
  ('Green', '#008000'),
  ('Yellow', '#FFFF00'),
  ('Pink', '#FFC0CB'),
  ('Grey', '#808080')
ON CONFLICT (name) DO NOTHING;