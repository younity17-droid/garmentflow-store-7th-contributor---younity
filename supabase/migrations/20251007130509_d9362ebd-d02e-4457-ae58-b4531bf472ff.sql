-- Fix security warnings by adding search_path to functions

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update the reduce_product_stock function
CREATE OR REPLACE FUNCTION public.reduce_product_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET quantity_in_stock = quantity_in_stock - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

-- Update the generate_invoice_number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;