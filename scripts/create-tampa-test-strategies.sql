-- ============================================================================
-- Create 3 Test Strategy Entries for Tampa Local Pages
-- ============================================================================
-- 
-- Purpose: Test the complete content strategy workflow for HomeSimple.org
-- 
-- Steps:
-- 1. Run this SQL script in Supabase SQL Editor
-- 2. Trigger batch-strategy-processor (see instructions below)
-- 3. Inspect generated articles
--
-- ============================================================================

-- First, get a domain_id for Tampa (any vertical will work for testing)
DO $$
DECLARE
  tampa_domain_id UUID;
  tampa_hvac_domain_id UUID;
  tampa_plumbing_domain_id UUID;
  tampa_pest_domain_id UUID;
BEGIN
  -- Get domain IDs for Tampa
  SELECT id INTO tampa_hvac_domain_id FROM domains WHERE city = 'Tampa' AND state = 'FL' AND vertical = 'hvac' LIMIT 1;
  SELECT id INTO tampa_plumbing_domain_id FROM domains WHERE city = 'Tampa' AND state = 'FL' AND vertical = 'plumbing' LIMIT 1;
  SELECT id INTO tampa_pest_domain_id FROM domains WHERE city = 'Tampa' AND state = 'FL' AND vertical = 'pest' LIMIT 1;
  
  -- Use first available domain if specific vertical not found
  IF tampa_hvac_domain_id IS NULL THEN
    SELECT id INTO tampa_hvac_domain_id FROM domains WHERE city = 'Tampa' AND state = 'FL' LIMIT 1;
  END IF;
  IF tampa_plumbing_domain_id IS NULL THEN
    SELECT id INTO tampa_plumbing_domain_id FROM domains WHERE city = 'Tampa' AND state = 'FL' LIMIT 1;
  END IF;
  IF tampa_pest_domain_id IS NULL THEN
    SELECT id INTO tampa_pest_domain_id FROM domains WHERE city = 'Tampa' AND state = 'FL' LIMIT 1;
  END IF;

  -- Insert 3 test strategies
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
      'Planned',
      'High',
      2000,
      jsonb_build_object(
        'city', 'Tampa',
        'state', 'FL',
        'vertical', 'hvac',
        'page_type', 'local_page',
        'domain_id', COALESCE(tampa_hvac_domain_id::text, '')
      ),
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
      jsonb_build_object(
        'city', 'Tampa',
        'state', 'FL',
        'vertical', 'plumbing',
        'page_type', 'local_page',
        'domain_id', COALESCE(tampa_plumbing_domain_id::text, '')
      ),
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
      jsonb_build_object(
        'city', 'Tampa',
        'state', 'FL',
        'vertical', 'pest',
        'page_type', 'local_page',
        'domain_id', COALESCE(tampa_pest_domain_id::text, '')
      ),
      NOW() + INTERVAL '3 days',
      NOW(),
      NOW()
    )
  ON CONFLICT DO NOTHING
  RETURNING id, content_title, status, metadata;

  RAISE NOTICE '✅ Created 3 test strategy entries for Tampa';
  RAISE NOTICE '📋 Strategy 1: AC Not Cooling (HVAC)';
  RAISE NOTICE '📋 Strategy 2: Emergency Plumbing';
  RAISE NOTICE '📋 Strategy 3: Pest Control';
END $$;

-- Verify strategies were created
SELECT 
  id,
  content_title,
  primary_keyword,
  category,
  status,
  priority_level,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  created_at
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'city' = 'Tampa'
ORDER BY created_at DESC
LIMIT 3;

-- ============================================================================
-- NEXT STEP: Trigger Batch Strategy Processor
-- ============================================================================
--
-- After running this SQL, trigger the batch processor using one of these methods:
--
-- Method 1: Using curl (replace YOUR_SERVICE_ROLE_KEY):
--
-- curl -X POST \
--   'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
--   -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
--   -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
--   -H 'Content-Type: application/json' \
--   -d '{
--     "site_id": "homesimple",
--     "limit": 3,
--     "priority_level": "High"
--   }'
--
-- Method 2: Using Supabase Dashboard
--   1. Go to Edge Functions → batch-strategy-processor
--   2. Click "Invoke Function"
--   3. Use this payload:
--      {
--        "site_id": "homesimple",
--        "limit": 3,
--        "priority_level": "High"
--      }
--
-- ============================================================================
-- VERIFY RESULTS
-- ============================================================================
--
-- After processing, check generated articles:
--
-- SELECT 
--   id,
--   title,
--   slug,
--   city,
--   state,
--   vertical,
--   page_type,
--   phone_number,
--   status,
--   created_at
-- FROM articles
-- WHERE site_id = 'homesimple'
--   AND city = 'Tampa'
--   AND page_type = 'local_page'
-- ORDER BY created_at DESC
-- LIMIT 3;
--
-- Check strategy status:
--
-- SELECT 
--   id,
--   content_title,
--   status,
--   last_generation_attempt,
--   metadata->>'city' as city,
--   metadata->>'vertical' as vertical
-- FROM content_strategy
-- WHERE site_id = 'homesimple'
--   AND metadata->>'city' = 'Tampa'
-- ORDER BY last_generation_attempt DESC
-- LIMIT 3;
--
-- ============================================================================

