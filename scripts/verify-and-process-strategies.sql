-- Verify strategies exist and show how to process them
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. VERIFY STRATEGIES EXIST
-- ============================================================================

SELECT 
  'Total Planned strategies' as check_type,
  COUNT(*) as count
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'page_type' = 'local_page';

-- ============================================================================
-- 2. SHOW STRATEGIES BY CITY/VERTICAL
-- ============================================================================

SELECT 
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  COUNT(*) as strategy_count
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'page_type' = 'local_page'
GROUP BY 
  metadata->>'city',
  metadata->>'state',
  metadata->>'vertical'
ORDER BY 
  metadata->>'city',
  metadata->>'vertical'
LIMIT 20;

-- ============================================================================
-- 3. SAMPLE STRATEGIES (FIRST 10)
-- ============================================================================

SELECT 
  id,
  content_title,
  primary_keyword,
  status,
  priority_level,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  created_at
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'page_type' = 'local_page'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. CHECK IF ANY STRATEGIES ALREADY PROCESSED
-- ============================================================================

SELECT 
  status,
  COUNT(*) as count
FROM content_strategy
WHERE site_id = 'homesimple'
  AND metadata->>'page_type' = 'local_page'
GROUP BY status;

