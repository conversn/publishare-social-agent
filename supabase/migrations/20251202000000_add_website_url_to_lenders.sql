-- Migration: Add website_url column to lenders table
-- Purpose: Store lender website URLs for crawling

-- Add website_url column if it doesn't exist
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lenders_website_url 
ON lenders(website_url) 
WHERE website_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN lenders.website_url IS 'Lender website URL for crawling and verification';


