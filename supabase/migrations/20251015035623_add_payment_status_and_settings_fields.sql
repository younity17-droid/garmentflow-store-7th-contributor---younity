/*
  # Add Payment Status and Settings Fields

  1. Changes to existing tables
    - Add payment_status and expected_payment_date to invoices table
    - Add low_stock_threshold, whatsapp_channel, and instagram_page to store_settings table

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'done' CHECK (payment_status IN ('done', 'pending'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'expected_payment_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN expected_payment_date DATE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'low_stock_threshold'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'whatsapp_channel'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN whatsapp_channel TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'instagram_page'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN instagram_page TEXT DEFAULT '';
  END IF;
END $$;
