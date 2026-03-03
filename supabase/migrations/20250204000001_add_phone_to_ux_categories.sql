-- ========================================
-- ADD PHONE_NUMBER TO UX_CATEGORIES TABLE
-- ========================================
-- Migration: add_phone_to_ux_categories
-- Purpose: Add phone_number column to ux_categories for serviceline-level phone numbers
-- ========================================

-- Add phone_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ux_categories' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE ux_categories ADD COLUMN phone_number VARCHAR(20);
    CREATE INDEX IF NOT EXISTS idx_ux_categories_phone_number 
      ON ux_categories(phone_number) 
      WHERE phone_number IS NOT NULL;
    RAISE NOTICE 'Added phone_number column to ux_categories table';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN ux_categories.phone_number IS 'CallReady tracking phone number for this serviceline (UX category). All articles in this serviceline will use this phone number unless overridden at article level.';

-- Update the articles_with_primary_ux_category view to include phone_number
-- Drop the view first to avoid column name conflicts
DROP VIEW IF EXISTS articles_with_primary_ux_category;

-- Recreate the view with the new phone_number column
CREATE VIEW articles_with_primary_ux_category AS
SELECT 
  a.*,
  ux.id as primary_ux_category_id,
  ux.name as primary_ux_category_name,
  ux.slug as primary_ux_category_slug,
  ux.phone_number as primary_ux_category_phone_number
FROM articles a
LEFT JOIN article_ux_categories auc ON a.id = auc.article_id AND auc.is_primary = TRUE
LEFT JOIN ux_categories ux ON auc.ux_category_id = ux.id;

-- Add comment for the updated view
COMMENT ON VIEW articles_with_primary_ux_category IS 'Articles with their primary UX category information, including serviceline phone number';

