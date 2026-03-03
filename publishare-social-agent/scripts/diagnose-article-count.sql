-- Diagnose why only 6 articles were created

-- 1. Check strategy status distribution
SELECT 
  status,
  COUNT(*) as count
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY count DESC;

-- 2. Check articles created (all sites vs homesimple)
SELECT 
  site_id,
  COUNT(*) as article_count,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count
FROM articles
GROUP BY site_id
ORDER BY article_count DESC;

-- 3. Check strategies that were processed (not 'Planned')
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(content_title, ', ' ORDER BY updated_at DESC) FILTER (WHERE ROW_NUMBER() OVER (PARTITION BY status ORDER BY updated_at DESC) <= 5) as sample_titles
FROM (
  SELECT 
    status,
    content_title,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY updated_at DESC) as rn
  FROM content_strategy
  WHERE site_id = 'homesimple' AND status != 'Planned'
) sub
GROUP BY status;

-- 4. Check if strategies were processed but articles failed
SELECT 
  cs.id as strategy_id,
  cs.content_title,
  cs.status as strategy_status,
  cs.updated_at as strategy_updated,
  a.id as article_id,
  a.status as article_status
FROM content_strategy cs
LEFT JOIN articles a ON a.site_id = cs.site_id 
  AND LOWER(a.title) = LOWER(cs.content_title)
WHERE cs.site_id = 'homesimple'
  AND cs.status != 'Planned'
ORDER BY cs.updated_at DESC
LIMIT 20;

-- 5. Count strategies by status with recent updates
SELECT 
  status,
  COUNT(*) as total,
  MAX(updated_at) as last_updated
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY last_updated DESC;

