-- Check status of all 120 homesimple strategies

-- 1. Total count and status distribution
SELECT 
  COUNT(*) as total_strategies,
  COUNT(CASE WHEN status = 'Planned' THEN 1 END) as planned,
  COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
  COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'Published' THEN 1 END) as published,
  COUNT(CASE WHEN status NOT IN ('Planned', 'In Progress', 'Completed', 'Failed', 'Published') THEN 1 END) as other_status
FROM content_strategy
WHERE site_id = 'homesimple';

-- 2. Strategies by status with sample titles
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(content_title, ' | ' ORDER BY updated_at DESC) 
    FILTER (WHERE ROW_NUMBER() OVER (PARTITION BY status ORDER BY updated_at DESC) <= 3) as sample_titles
FROM (
  SELECT 
    status,
    content_title,
    updated_at,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY updated_at DESC) as rn
  FROM content_strategy
  WHERE site_id = 'homesimple'
) sub
WHERE rn <= 3
GROUP BY status
ORDER BY count DESC;

-- 3. Articles created for homesimple
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM articles
WHERE site_id = 'homesimple';

-- 4. Match strategies to articles (see which strategies have articles)
SELECT 
  cs.status as strategy_status,
  COUNT(*) as count,
  COUNT(a.id) as has_article,
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) as missing_article
FROM content_strategy cs
LEFT JOIN articles a ON a.site_id = cs.site_id 
  AND LOWER(TRIM(a.title)) = LOWER(TRIM(cs.content_title))
WHERE cs.site_id = 'homesimple'
GROUP BY cs.status
ORDER BY count DESC;

-- 5. Recent strategy updates (last 20)
SELECT 
  content_title,
  status,
  updated_at,
  priority_level
FROM content_strategy
WHERE site_id = 'homesimple'
ORDER BY updated_at DESC
LIMIT 20;

