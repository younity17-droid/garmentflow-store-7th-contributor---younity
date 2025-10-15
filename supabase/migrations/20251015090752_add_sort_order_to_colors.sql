/*
  # Add sort_order column to colors table
  
  1. Changes
    - Add sort_order column to colors table for custom ordering
    - Default value is 0
  
  2. Security
    - No RLS changes needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'colors' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE colors ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;