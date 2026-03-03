-- Quick status check for homesimple strategies and articles

-- Strategies by status
SELECT 
  'Strategies' as type,
  status,
  COUNT(*) as count
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY count DESC;

-- Articles by site
SELECT 
  'Articles' as type,
  site_id,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published
FROM articles
GROUP BY site_id
ORDER BY count DESC;

-- Recent strategy updates
SELECT 
  status,
  COUNT(*) as count,
  MAX(updated_at) as last_update
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY last_update DESC;

