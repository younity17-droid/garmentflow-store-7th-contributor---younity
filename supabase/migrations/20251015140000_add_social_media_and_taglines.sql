/*
  # Add Social Media Taglines to Store Settings

  1. Changes to existing tables
    - Add whatsapp_tagline to store_settings table
    - Add instagram_tagline to store_settings table

  2. Details
    - whatsapp_tagline: Custom tagline for WhatsApp (e.g., "Join our WhatsApp group")
    - instagram_tagline: Custom tagline for Instagram (e.g., "Follow us on Instagram")
    - Both fields are optional text fields with default values

  3. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'whatsapp_tagline'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN whatsapp_tagline TEXT DEFAULT 'Join our WhatsApp group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_settings' AND column_name = 'instagram_tagline'
  ) THEN
    ALTER TABLE store_settings ADD COLUMN instagram_tagline TEXT DEFAULT 'Follow us on Instagram';
  END IF;
END $$;
