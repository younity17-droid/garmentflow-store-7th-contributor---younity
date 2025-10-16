/*
  # Add Social Media Names to Store Settings
  
  1. Changes
    - Add whatsapp_channel_name to store settings for display on invoices
    - Add instagram_page_id to store settings for display on invoices
  
  2. Details
    - These fields will be used to label the QR codes on invoices
    - Example: "Join Our WhatsApp: [Name]" and "Follow Us: @[PageID]"
  
  3. Security
    - No RLS changes needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'whatsapp_channel_name'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN whatsapp_channel_name TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'instagram_page_id'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN instagram_page_id TEXT DEFAULT '';
  END IF;
END $$;