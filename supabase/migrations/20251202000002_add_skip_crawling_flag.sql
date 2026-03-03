-- ========================================
-- Add skip_crawling flag to lenders table
-- ========================================
-- Purpose: Mark lenders that should be skipped during crawling
--          (e.g., category names, descriptions, invalid records)

ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS skip_crawling BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lenders_skip_crawling 
ON lenders(skip_crawling) 
WHERE skip_crawling = TRUE;

COMMENT ON COLUMN lenders.skip_crawling IS 'Set to TRUE to skip this lender during automated crawling (e.g., category names, descriptions, invalid records)';

-- Mark known invalid lenders
UPDATE lenders
SET skip_crawling = TRUE
WHERE id IN (
  '8da1067b-14c3-48e4-a796-547c96432945', -- Commercial
  'd45394e1-e36c-43cd-8f5b-c8b6edb6fea5', -- Hard Money
  '61507eb3-9170-4755-b476-811605e5f0e4', -- NDC Only
  '9b62de47-a67c-476f-917d-af2e865c0ce7', -- NexBank (DSCR and Bank Statement)
  'c468610f-5109-49bf-b597-492ecc4fa6ff'  -- Specialty Lender
);

-- Mark suspicious lenders (review recommended)
UPDATE lenders
SET skip_crawling = TRUE
WHERE id IN (
  '99dd4fb3-7c74-443d-be57-1684d93be808', -- Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR
  '16bab36c-a8da-44c6-8e22-7df3c07b9c08', -- Lenders with creative loan options...
  'bf80b5e2-a2d5-4647-ba35-4621b6b2ded8'  -- Unusual MLO Compesation Broker Lender Paid or Borrower Paid Only
);


