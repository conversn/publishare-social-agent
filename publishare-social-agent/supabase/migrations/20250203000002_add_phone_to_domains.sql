-- ========================================
-- ADD PHONE_NUMBER TO DOMAINS TABLE
-- ========================================
-- Migration: add_phone_to_domains
-- Purpose: Add phone_number column to domains table for CallReady integration
-- ========================================

-- Add phone_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'domains' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE domains ADD COLUMN phone_number VARCHAR(20);
    CREATE INDEX IF NOT EXISTS idx_domains_phone_number ON domains(phone_number) WHERE phone_number IS NOT NULL;
    RAISE NOTICE 'Added phone_number column to domains table';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN domains.phone_number IS 'CallReady tracking phone number for this domain/city/vertical combination';

