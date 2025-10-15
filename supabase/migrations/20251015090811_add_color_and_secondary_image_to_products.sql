/*
  # Add color support and secondary image to products
  
  1. Changes
    - Add color_ids array column to products table for multi-color support
    - Add secondary_image_url for additional product image
  
  2. Security
    - No RLS changes needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'color_ids'
  ) THEN
    ALTER TABLE products ADD COLUMN color_ids UUID[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'secondary_image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN secondary_image_url TEXT;
  END IF;
END $$;