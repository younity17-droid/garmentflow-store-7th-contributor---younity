-- Create table for product size-based pricing
CREATE TABLE IF NOT EXISTS public.product_size_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id UUID NOT NULL REFERENCES public.sizes(id) ON DELETE CASCADE,
  price_inr NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, size_id)
);

-- Enable RLS
ALTER TABLE public.product_size_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can view size prices"
  ON public.product_size_prices
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage size prices"
  ON public.product_size_prices
  FOR ALL
  USING (is_admin_or_owner(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_product_size_prices_updated_at
  BEFORE UPDATE ON public.product_size_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_product_size_prices_product_id ON public.product_size_prices(product_id);
CREATE INDEX idx_product_size_prices_size_id ON public.product_size_prices(size_id);