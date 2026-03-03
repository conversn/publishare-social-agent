-- Reset failed strategies back to 'Planned' so they can be reprocessed
-- This allows you to retry strategies that failed during processing

-- First, check how many failed strategies exist
SELECT 
  status,
  COUNT(*) as count
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY count DESC;

-- Reset 'Failed' strategies back to 'Planned'
UPDATE content_strategy
SET 
  status = 'Planned',
  updated_at = NOW()
WHERE site_id = 'homesimple'
  AND status = 'Failed';

-- Show how many were reset
SELECT 
  COUNT(*) as reset_count,
  'Failed strategies reset to Planned' as action
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Final status count
SELECT 
  status,
  COUNT(*) as count
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY count DESC;

