-- Diagnostic script to check domains table
-- Run this in Supabase SQL Editor to see what domains exist

-- ============================================================================
-- 1. CHECK DOMAINS TABLE STRUCTURE
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'domains'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CHECK TOTAL DOMAINS COUNT
-- ============================================================================

SELECT 
  'Total domains' as check_type,
  COUNT(*) as count
FROM domains;

-- ============================================================================
-- 3. CHECK DOMAINS BY STATUS
-- ============================================================================

SELECT 
  status,
  COUNT(*) as count
FROM domains
GROUP BY status
ORDER BY status;

-- ============================================================================
-- 4. CHECK ACTIVE DOMAINS
-- ============================================================================

SELECT 
  id,
  domain,
  city,
  state,
  vertical,
  status,
  phone_number,
  created_at
FROM domains
WHERE status = 'active'
ORDER BY city, state, vertical
LIMIT 20;

-- ============================================================================
-- 5. CHECK DOMAINS BY CITY/STATE/VERTICAL
-- ============================================================================

SELECT 
  city,
  state,
  vertical,
  COUNT(*) as count,
  STRING_AGG(DISTINCT status, ', ') as statuses
FROM domains
GROUP BY city, state, vertical
ORDER BY city, state, vertical
LIMIT 20;

-- ============================================================================
-- 6. CHECK FOR NULL VALUES IN REQUIRED FIELDS
-- ============================================================================

SELECT 
  'Domains with NULL city' as issue,
  COUNT(*) as count
FROM domains
WHERE city IS NULL;

SELECT 
  'Domains with NULL state' as issue,
  COUNT(*) as count
FROM domains
WHERE state IS NULL;

SELECT 
  'Domains with NULL vertical' as issue,
  COUNT(*) as count
FROM domains
WHERE vertical IS NULL;

-- ============================================================================
-- 7. SAMPLE DOMAINS (FIRST 10)
-- ============================================================================

SELECT 
  id,
  domain,
  city,
  state,
  vertical,
  status,
  phone_number,
  created_at
FROM domains
ORDER BY created_at DESC
LIMIT 10;

