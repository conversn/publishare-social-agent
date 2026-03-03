-- Quick reference: How to create strategies
-- The generate-local-strategies function needs create_strategies=true

-- ============================================================================
-- OPTION 1: Use Supabase Dashboard
-- ============================================================================
-- 1. Go to Edge Functions → generate-local-strategies
-- 2. Click "Invoke Function"
-- 3. Use payload:
--    {
--      "site_id": "homesimple",
--      "limit": 5,
--      "create_strategies": true
--    }
--
-- ⚠️ IMPORTANT: create_strategies must be true (not false, not omitted)

-- ============================================================================
-- OPTION 2: Verify strategies were created
-- ============================================================================

SELECT 
  COUNT(*) as total_strategies,
  COUNT(DISTINCT metadata->>'city') as cities,
  COUNT(DISTINCT metadata->>'vertical') as verticals
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'page_type' = 'local_page';

-- ============================================================================
-- OPTION 3: If strategies still don't exist, check for errors
-- ============================================================================

-- Check if domains exist (required for strategy generation)
SELECT 
  COUNT(*) as active_domains
FROM domains
WHERE status = 'active';

-- Should return > 0. If 0, run: scripts/bulk-import-domains.sql first

