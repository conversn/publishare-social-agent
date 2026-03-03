-- ========================================
-- ADD HOMESIMPLE SITE
-- ========================================
-- Migration: add_homesimple_site
-- Purpose: Add homesimple site to sites table for content strategy foreign key
-- ========================================

-- Insert homesimple site if it doesn't exist
INSERT INTO sites (
  id,
  name,
  domain,
  is_active,
  created_at,
  updated_at
) VALUES (
  'homesimple',
  'HomeSimple',
  'homesimple.org',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  is_active = true,
  updated_at = NOW()
RETURNING id, name, domain, is_active;

-- Verify site was created
SELECT 
  id,
  name,
  domain,
  is_active
FROM sites
WHERE id = 'homesimple';

