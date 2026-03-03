# Run All Pending Migrations

## 🚀 Execute Both Migrations

Since Supabase CLI authentication is having issues, run these migrations directly in the Supabase SQL Editor.

### Step 1: Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql

---

## Migration 1: Add website_url Column

### SQL to Run:

```sql
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
```

**Click Run** and verify success.

---

## Migration 2: Add JSONB Indexes

### SQL to Run:

```sql
-- Migration: Add GIN indexes for JSONB business lending queries
-- Purpose: Optimize queries on business lending data stored in special_features JSONB

-- Index for business lending object queries
CREATE INDEX IF NOT EXISTS idx_lenders_business_lending_gin 
ON lenders USING GIN ((special_features->'business_lending'))
WHERE special_features->'business_lending' IS NOT NULL;

-- Index for business lending availability (most common query)
CREATE INDEX IF NOT EXISTS idx_lenders_offers_business_lending 
ON lenders ((special_features->'business_lending'->>'available'))
WHERE (special_features->'business_lending'->>'available')::boolean = true;

-- Index for business lending loan types (array queries)
CREATE INDEX IF NOT EXISTS idx_lenders_business_loan_types_gin 
ON lenders USING GIN ((special_features->'business_lending'->'loan_types'))
WHERE special_features->'business_lending'->'loan_types' IS NOT NULL;

-- Index for website info queries
CREATE INDEX IF NOT EXISTS idx_lenders_website_info_gin 
ON lenders USING GIN ((special_features->'website_info'))
WHERE special_features->'website_info' IS NOT NULL;

-- Index for detailed program data queries (compensation, fees)
CREATE INDEX IF NOT EXISTS idx_lenders_detailed_program_data_gin 
ON lenders USING GIN (detailed_program_data)
WHERE detailed_program_data != '{}'::jsonb;

-- Index for program specifics queries
CREATE INDEX IF NOT EXISTS idx_lenders_program_specifics_gin 
ON lenders USING GIN (program_specifics)
WHERE program_specifics != '{}'::jsonb;

-- Add comments
COMMENT ON INDEX idx_lenders_business_lending_gin IS 'GIN index for business_lending object queries in special_features JSONB';
COMMENT ON INDEX idx_lenders_offers_business_lending IS 'Index for filtering lenders that offer business lending';
COMMENT ON INDEX idx_lenders_business_loan_types_gin IS 'GIN index for business loan types array queries';
COMMENT ON INDEX idx_lenders_website_info_gin IS 'GIN index for website_info queries in special_features JSONB';
COMMENT ON INDEX idx_lenders_detailed_program_data_gin IS 'GIN index for detailed_program_data JSONB queries';
COMMENT ON INDEX idx_lenders_program_specifics_gin IS 'GIN index for program_specifics JSONB queries';
```

**Click Run** and verify success.

---

## ✅ Verification

### Check website_url Column

```sql
-- Verify column exists
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'lenders'
AND column_name = 'website_url';
```

**Expected**: Should show `website_url` column with `VARCHAR(500)`

### Check All Indexes

```sql
-- Check all new indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'lenders'
AND (
  indexname LIKE '%business%' 
  OR indexname LIKE '%jsonb%'
  OR indexname LIKE '%website%'
  OR indexname LIKE '%program%'
)
ORDER BY indexname;
```

**Expected**: Should show 7 indexes:
- `idx_lenders_website_url` (from migration 1)
- `idx_lenders_business_lending_gin` (from migration 2)
- `idx_lenders_offers_business_lending` (from migration 2)
- `idx_lenders_business_loan_types_gin` (from migration 2)
- `idx_lenders_website_info_gin` (from migration 2)
- `idx_lenders_detailed_program_data_gin` (from migration 2)
- `idx_lenders_program_specifics_gin` (from migration 2)

### Test Query Performance

```sql
-- Test business lending query (should use index)
EXPLAIN ANALYZE
SELECT 
  name,
  special_features->'business_lending'->'loan_types' as loan_types
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true
LIMIT 10;
```

Look for `Index Scan` or `Bitmap Index Scan` in the output.

---

## 📋 Migration Files

- **Migration 1**: `supabase/migrations/20251202000000_add_website_url_to_lenders.sql`
- **Migration 2**: `supabase/migrations/20251202000001_add_jsonb_indexes_for_business_lending.sql`

---

**Status**: Ready to Execute  
**Estimated Time**: < 2 minutes total


