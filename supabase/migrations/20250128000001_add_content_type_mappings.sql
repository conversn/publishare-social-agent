-- ========================================
-- ADD CONTENT TYPE MAPPINGS TO UX CATEGORIES
-- ========================================
-- Migration: add_content_type_mappings
-- Purpose: Add mapping rules for content types (pillar-page, how-to, article, etc.)
-- ========================================

-- Add mappings for content types to UX categories
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default, priority) 
SELECT 
  'rateroots',
  content_type,
  ux.id,
  TRUE,
  10
FROM (
  VALUES 
    ('pillar-page', 'guides'),
    ('how-to', 'guides'),
    ('article', 'resources'),
    ('general', 'resources'),
    ('comparison', 'comparisons'),
    ('industry', 'industry-guides')
) AS mappings(content_type, ux_slug)
INNER JOIN ux_categories ux ON ux.site_id = 'rateroots' AND ux.slug = mappings.ux_slug
ON CONFLICT (site_id, content_category, ux_category_id) DO NOTHING;

-- Also add mappings for industry-specific categories
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default, priority) 
SELECT 
  'rateroots',
  industry_cat,
  ux.id,
  TRUE,
  10
FROM (
  VALUES 
    ('construction', 'industry-guides'),
    ('healthcare', 'industry-guides'),
    ('restaurant', 'industry-guides'),
    ('retail', 'industry-guides'),
    ('trucking', 'industry-guides'),
    ('real-estate', 'industry-guides'),
    ('e-commerce', 'industry-guides'),
    ('manufacturing', 'industry-guides')
) AS mappings(industry_cat, ux_slug)
INNER JOIN ux_categories ux ON ux.site_id = 'rateroots' AND ux.slug = mappings.ux_slug
ON CONFLICT (site_id, content_category, ux_category_id) DO NOTHING;

COMMENT ON TABLE content_category_ux_mapping IS 'Updated to include mappings for both content strategy categories and content types (pillar-page, how-to, article, etc.)';




