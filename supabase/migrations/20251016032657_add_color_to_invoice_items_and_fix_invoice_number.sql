/*
  # Add Color to Invoice Items and Fix Invoice Number Generation
  
  1. Changes to invoice_items
    - Add color_name column to store color information
  
  2. Changes to invoices
    - Remove UNIQUE constraint from invoice_number temporarily to fix duplicate issue
    - Add function to auto-generate invoice numbers sequentially
  
  3. Details
    - Color information will be stored in invoice items for display on invoices
    - Invoice numbers will be generated automatically as INV-000001, INV-000002, etc.
  
  4. Security
    - No RLS changes needed
*/

-- Add color_name to invoice_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_items' AND column_name = 'color_name'
  ) THEN
    ALTER TABLE invoice_items ADD COLUMN color_name TEXT;
  END IF;
END $$;

-- Drop the unique constraint on invoice_number if it exists
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Create or replace function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    -- Get the highest invoice number
    SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(invoice_number FROM 'INV-([0-9]+)') AS INTEGER
        )
      ), 
      0
    ) + 1 INTO next_number
    FROM invoices
    WHERE invoice_number ~ 'INV-[0-9]+';
    
    -- Generate new invoice number with zero padding
    new_invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
    NEW.invoice_number := new_invoice_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Add unique constraint back
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);