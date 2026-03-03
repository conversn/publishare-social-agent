-- ========================================
-- CREATE PARENTSIMPLE UX CATEGORIES
-- ========================================
-- Migration: create_parentsimple_ux_categories
-- Purpose: Create UX categories for ParentSimple navigation and content organization
-- ========================================

-- Create ParentSimple UX categories
INSERT INTO ux_categories (site_id, name, slug, description, display_order, is_active)
VALUES
('parentsimple', 'College Planning', 'college-planning', 'Complete guides to college admissions, applications, and planning', 1, true),
('parentsimple', 'Financial Planning', 'financial-planning', '529 plans, life insurance, estate planning, and family protection', 2, true),
('parentsimple', 'High School', 'high-school', 'High school success, course selection, and college preparation', 3, true),
('parentsimple', 'Middle School', 'middle-school', 'Middle school academic planning and preparation', 4, true),
('parentsimple', 'Early Years', 'early-years', 'Early childhood development and foundation building', 5, true),
('parentsimple', 'Resources', 'resources', 'Tools, calculators, and downloadable guides', 6, true)
ON CONFLICT (site_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create content category to UX category mappings
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default, priority)
SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux,
(VALUES
  ('college-admissions'),
  ('529-plans'),
  ('financial-aid'),
  ('scholarships'),
  ('college-consulting')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'college-planning'

UNION ALL

SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux,
(VALUES
  ('life-insurance'),
  ('estate-planning'),
  ('financial-planning'),
  ('education-funding')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'financial-planning'

UNION ALL

SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux,
(VALUES
  ('high-school'),
  ('course-selection'),
  ('standardized-testing'),
  ('extracurriculars')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'high-school'

UNION ALL

SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux,
(VALUES
  ('middle-school'),
  ('academic-preparation'),
  ('study-skills')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'middle-school'

UNION ALL

SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux,
(VALUES
  ('early-years'),
  ('early-childhood'),
  ('foundation-building')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'early-years'

ON CONFLICT (site_id, content_category, ux_category_id) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  priority = EXCLUDED.priority;

