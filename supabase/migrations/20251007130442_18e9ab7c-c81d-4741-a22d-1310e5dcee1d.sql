-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'owner');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sizes table
CREATE TABLE public.sizes (
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
  ('XXXL', 7);

-- Create products table
CREATE TABLE public.products (
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
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  grand_total DECIMAL(10, 2) NOT NULL,
  pdf_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
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
CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'My Garment Store',
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  logo_url TEXT,
  currency_symbol TEXT DEFAULT '₹',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default store settings
INSERT INTO public.store_settings (store_name, tax_percentage) VALUES ('My Garment Store', 18.00);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'owner')
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin_or_owner(auth.uid()));

-- RLS Policies for categories
CREATE POLICY "Anyone authenticated can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- RLS Policies for sizes
CREATE POLICY "Anyone authenticated can view sizes"
  ON public.sizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sizes"
  ON public.sizes FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- RLS Policies for products
CREATE POLICY "Anyone authenticated can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- RLS Policies for invoices
CREATE POLICY "Anyone authenticated can view invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- RLS Policies for invoice_items
CREATE POLICY "Anyone authenticated can view invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage invoice items"
  ON public.invoice_items FOR ALL
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- RLS Policies for store_settings
CREATE POLICY "Anyone authenticated can view store settings"
  ON public.store_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update store settings"
  ON public.store_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to reduce stock after invoice creation
CREATE OR REPLACE FUNCTION public.reduce_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET quantity_in_stock = quantity_in_stock - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-reduce stock
CREATE TRIGGER reduce_stock_after_invoice_item
  AFTER INSERT ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reduce_product_stock();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', true),
  ('store-assets', 'store-assets', true),
  ('invoices', 'invoices', false);

-- Storage policies for product-images
CREATE POLICY "Anyone authenticated can view product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin_or_owner(auth.uid()));

-- Storage policies for store-assets
CREATE POLICY "Anyone authenticated can view store assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'store-assets');

CREATE POLICY "Admins can upload store assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'store-assets' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins can update store assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'store-assets' AND public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Admins can delete store assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'store-assets' AND public.is_admin_or_owner(auth.uid()));

-- Storage policies for invoices
CREATE POLICY "Anyone authenticated can view invoices"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoices');

CREATE POLICY "Admins can upload invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND public.is_admin_or_owner(auth.uid()));

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE 'INV-%';
  
  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;