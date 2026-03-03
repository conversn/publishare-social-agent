-- Diagnostic script to check why batch-strategy-processor found no strategies
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. CHECK IF STRATEGIES EXIST FOR HOMESIMPLE
-- ============================================================================

SELECT 
  'Total strategies for homesimple' as check_type,
  COUNT(*) as count,
  status,
  priority_level
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status, priority_level
ORDER BY status, priority_level;

-- ============================================================================
-- 2. CHECK SPECIFICALLY FOR PLANNED STRATEGIES
-- ============================================================================

SELECT 
  id,
  content_title,
  primary_keyword,
  status,
  priority_level,
  site_id,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  created_at
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
ORDER BY 
  CASE priority_level
    WHEN 'Critical' THEN 1
    WHEN 'High' THEN 2
    WHEN 'Medium' THEN 3
    WHEN 'Low' THEN 4
    ELSE 5
  END,
  target_date NULLS LAST
LIMIT 10;

-- ============================================================================
-- 3. CHECK FOR TAMPA STRATEGIES SPECIFICALLY
-- ============================================================================

SELECT 
  id,
  content_title,
  status,
  priority_level,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical
FROM content_strategy
WHERE site_id = 'homesimple'
  AND metadata->>'city' = 'Tampa'
ORDER BY created_at DESC;

-- ============================================================================
-- 4. CREATE TEST STRATEGIES IF NONE EXIST
-- ============================================================================
-- Uncomment and run this section if no strategies exist

/*
INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type, category,
  status, priority_level, word_count, metadata, target_date, created_at, updated_at
) VALUES 
  (
    'homesimple',
    'AC Not Cooling in Tampa? Here''s What to Do',
    'AC not cooling Tampa',
    'local_page',
    'hvac',
    'Planned',
    'High',
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "hvac", "page_type": "local_page"}'::jsonb,
    NOW() + INTERVAL '1 day',
    NOW(),
    NOW()
  ),
  (
    'homesimple',
    'Emergency Plumbing Services in Tampa',
    'emergency plumber Tampa',
    'local_page',
    'plumbing',
    'Planned',
    'High',
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "plumbing", "page_type": "local_page"}'::jsonb,
    NOW() + INTERVAL '2 days',
    NOW(),
    NOW()
  ),
  (
    'homesimple',
    'Pest Control Services in Tampa: Complete Guide',
    'pest control Tampa',
    'local_page',
    'pest',
    'Planned',
    'High',
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "pest", "page_type": "local_page"}'::jsonb,
    NOW() + INTERVAL '3 days',
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING
RETURNING id, content_title, status;
*/

-- ============================================================================
-- 5. SUMMARY
-- ============================================================================

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ No Planned strategies found for homesimple'
    ELSE '✅ Found ' || COUNT(*) || ' Planned strategies for homesimple'
  END as summary
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned';

