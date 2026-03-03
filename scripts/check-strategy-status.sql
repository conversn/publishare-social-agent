-- Check strategy status for homesimple
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'Planned' THEN 1 END) as planned_count,
  COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress_count,
  COUNT(CASE WHEN status = 'Published' THEN 1 END) as published_count,
  COUNT(CASE WHEN status = 'Failed' THEN 1 END) as failed_count
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status
ORDER BY status;

-- Check articles created for homesimple
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
  MIN(created_at) as first_article,
  MAX(created_at) as last_article
FROM articles
WHERE site_id = 'homesimple';

-- Check strategies by status with details
SELECT 
  id,
  content_title,
  status,
  priority_level,
  created_at,
  updated_at
FROM content_strategy
WHERE site_id = 'homesimple'
ORDER BY 
  CASE status
    WHEN 'Planned' THEN 1
    WHEN 'In Progress' THEN 2
    WHEN 'Published' THEN 3
    WHEN 'Failed' THEN 4
    ELSE 5
  END,
  created_at DESC
LIMIT 20;

