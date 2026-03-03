-- Simple script to create 3 Tampa test strategies
-- Run this in Supabase SQL Editor BEFORE triggering batch-strategy-processor

-- Delete any existing test strategies (optional - uncomment if you want to recreate)
-- DELETE FROM content_strategy 
-- WHERE site_id = 'homesimple' 
--   AND metadata->>'city' = 'Tampa'
--   AND status IN ('Planned', 'Failed');

-- Create 3 test strategies
INSERT INTO content_strategy (
  site_id,
  content_title,
  primary_keyword,
  content_type,
  category,
  status,
  priority_level,
  word_count,
  metadata,
  target_date,
  created_at,
  updated_at
) VALUES 
  (
    'homesimple',
    'AC Not Cooling in Tampa? Here''s What to Do',
    'AC not cooling Tampa',
    'local_page',
    'hvac',
    'Planned',  -- ⚠️ MUST be 'Planned' for batch processor to find it
    'High',     -- ⚠️ Must match priority_level filter if used
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
    'Planned',  -- ⚠️ MUST be 'Planned'
    'High',     -- ⚠️ Must match priority_level filter if used
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
    'Planned',  -- ⚠️ MUST be 'Planned'
    'High',     -- ⚠️ Must match priority_level filter if used
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "pest", "page_type": "local_page"}'::jsonb,
    NOW() + INTERVAL '3 days',
    NOW(),
    NOW()
  )
ON CONFLICT DO NOTHING
RETURNING 
  id,
  content_title,
  status,
  priority_level,
  site_id,
  metadata->>'city' as city;

-- Verify strategies were created
SELECT 
  '✅ Verification' as check_type,
  COUNT(*) as planned_count
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'city' = 'Tampa';

