/*
  # Add Social Media Taglines and Fix Invoice Number

  1. Changes to existing tables
    - Add whatsapp_tagline and instagram_tagline to store_settings table
    - Ensure invoice_number can handle generation
    
  2. Create trigger for invoice number generation
    - Auto-generate invoice numbers sequentially
*/

-- Add tagline fields to store_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'whatsapp_tagline'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN whatsapp_tagline text DEFAULT 'Join our WhatsApp Group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'instagram_tagline'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN instagram_tagline text DEFAULT 'Follow us on Instagram';
  END IF;
END $$;

-- Create a function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get the highest invoice number
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';
  
  -- Generate new invoice number
  new_invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  
  -- Set the invoice number
  NEW.invoice_number := new_invoice_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;

-- Create trigger to auto-generate invoice numbers
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();