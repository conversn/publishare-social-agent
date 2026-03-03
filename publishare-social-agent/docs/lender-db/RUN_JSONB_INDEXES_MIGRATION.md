# Run JSONB Indexes Migration

## 🚀 Quick Execution

Since Supabase CLI authentication is having issues, run this migration directly in the Supabase SQL Editor.

### Step 1: Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql

### Step 2: Copy and Paste Migration SQL

Copy the entire contents of:
`supabase/migrations/20251202000001_add_jsonb_indexes_for_business_lending.sql`

Or copy this SQL:

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

### Step 3: Run Migration

1. Click **Run** in the SQL Editor
2. Wait for completion (should be fast - just creating indexes)
3. Verify success message

### Step 4: Verify Indexes Created

Run this verification query:

```sql
-- Check indexes were created
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

**Expected Result**: Should show 6 new indexes:
- `idx_lenders_business_lending_gin`
- `idx_lenders_offers_business_lending`
- `idx_lenders_business_loan_types_gin`
- `idx_lenders_website_info_gin`
- `idx_lenders_detailed_program_data_gin`
- `idx_lenders_program_specifics_gin`

### Step 5: Test Query Performance

Test a business lending query:

```sql
-- This query should use the new index
EXPLAIN ANALYZE
SELECT 
  name,
  special_features->'business_lending'->'loan_types' as loan_types
FROM lenders
WHERE (special_features->'business_lending'->>'available')::boolean = true
LIMIT 10;
```

Look for `Index Scan` or `Bitmap Index Scan` in the output to confirm index usage.

---

## ✅ Success Criteria

- ✅ All 6 indexes created without errors
- ✅ Verification query returns all indexes
- ✅ Test query shows index usage in EXPLAIN output

---

**Status**: Ready to Execute  
**Estimated Time**: < 1 minute


