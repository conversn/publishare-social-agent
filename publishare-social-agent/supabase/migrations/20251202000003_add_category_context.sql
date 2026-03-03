-- ========================================
-- Add Category Context to Lenders
-- ========================================
-- Purpose: Convert category headings to metadata that enriches lender descriptions
--          Instead of discarding "invalid" lender names, use them as context

-- Add skip_crawling column if it doesn't exist (from previous migration)
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS skip_crawling BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lenders_skip_crawling 
ON lenders(skip_crawling) 
WHERE skip_crawling = TRUE;

COMMENT ON COLUMN lenders.skip_crawling IS 'Set to TRUE to skip this lender during automated crawling (e.g., category headings, descriptions, invalid records)';

-- Add category_context field to store section headings/categories
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS category_context TEXT;

CREATE INDEX IF NOT EXISTS idx_lenders_category_context 
ON lenders(category_context) 
WHERE category_context IS NOT NULL;

COMMENT ON COLUMN lenders.category_context IS 'Category/section heading from original data structure that provides context for this lender (e.g., "Commercial", "Hard Money", "NDC Only")';

-- Mark category headings with a flag (instead of skip_crawling, use is_category_heading)
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS is_category_heading BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lenders_is_category_heading 
ON lenders(is_category_heading) 
WHERE is_category_heading = TRUE;

COMMENT ON COLUMN lenders.is_category_heading IS 'TRUE if this record is a category/section heading, not an actual lender. Used for organization and context, not for crawling.';

-- Mark known category headings
UPDATE lenders
SET is_category_heading = TRUE
WHERE id IN (
  '8da1067b-14c3-48e4-a796-547c96432945', -- Commercial
  'd45394e1-e36c-43cd-8f5b-c8b6edb6fea5', -- Hard Money
  '61507eb3-9170-4755-b476-811605e5f0e4', -- NDC Only
  '9b62de47-a67c-476f-917d-af2e865c0ce7', -- NexBank (DSCR and Bank Statement)
  'c468610f-5109-49bf-b597-492ecc4fa6ff', -- Specialty Lender
  '99dd4fb3-7c74-443d-be57-1684d93be808', -- Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR
  '16bab36c-a8da-44c6-8e22-7df3c07b9c08', -- Lenders with creative loan options...
  'bf80b5e2-a2d5-4647-ba35-4621b6b2ded8', -- Unusual MLO Compesation Broker Lender Paid or Borrower Paid Only
  '56deb2e5-769f-4541-9668-b7f6d568b4a5', -- Provident (Commercial)
  '3ff53bc4-de92-46d1-9dc4-ae346e4ab51e', -- Private Commercial
  'c9e8149b-ca4a-401e-8fcf-c236d704a2b9'  -- Private Commercial Loans
);

-- Update skip_crawling to also exclude category headings
UPDATE lenders
SET skip_crawling = TRUE
WHERE is_category_heading = TRUE;

