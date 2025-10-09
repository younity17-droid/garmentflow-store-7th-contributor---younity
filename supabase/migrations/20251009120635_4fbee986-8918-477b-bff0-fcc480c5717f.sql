-- Create colors table (similar to sizes)
CREATE TABLE IF NOT EXISTS public.colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hex_code TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on colors table
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

-- RLS policies for colors
CREATE POLICY "Admins can manage colors" 
ON public.colors 
FOR ALL 
USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Anyone authenticated can view colors" 
ON public.colors 
FOR SELECT 
USING (true);

-- Add color_ids array to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS color_ids UUID[] DEFAULT '{}';

-- Create product_inventory table for quantity per size/color
CREATE TABLE IF NOT EXISTS public.product_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id UUID REFERENCES public.sizes(id) ON DELETE SET NULL,
  color_id UUID REFERENCES public.colors(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, size_id, color_id)
);

-- Enable RLS on product_inventory
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_inventory
CREATE POLICY "Admins can manage inventory" 
ON public.product_inventory 
FOR ALL 
USING (public.is_admin_or_owner(auth.uid()));

CREATE POLICY "Anyone authenticated can view inventory" 
ON public.product_inventory 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_product_inventory_updated_at
BEFORE UPDATE ON public.product_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add secondary_image_url to products for 2 images support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS secondary_image_url TEXT;