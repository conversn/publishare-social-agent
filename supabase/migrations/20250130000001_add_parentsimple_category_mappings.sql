-- ========================================
-- ADD PARENTSIMPLE CATEGORY MAPPINGS
-- ========================================
-- Migration: add_parentsimple_category_mappings
-- Purpose: Add UX category mappings for actual content strategy category values
-- ========================================
-- 
-- This migration adds mappings for the actual category values from content_strategy
-- (e.g., 'College Consulting', '529 Plans') to UX categories, in addition to the
-- normalized values (e.g., 'college-consulting', '529-plans') that may already exist.

-- Map actual category values to UX categories
-- College Planning category mappings
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default, priority)
SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux
CROSS JOIN (VALUES
  ('College Consulting'),
  ('College Admissions'),
  ('Elite Colleges'),
  ('Financial Aid'),
  ('Scholarships'),
  ('Standardized Testing'),
  ('Extracurriculars')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'college-planning'

UNION ALL

-- Financial Planning category mappings
SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux
CROSS JOIN (VALUES
  ('529 Plans'),
  ('Life Insurance'),
  ('Estate Planning'),
  ('Financial Planning'),
  ('Education Funding')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'financial-planning'

UNION ALL

-- High School category mappings
SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux
CROSS JOIN (VALUES
  ('High School'),
  ('Course Selection'),
  ('Standardized Testing'),
  ('Extracurriculars')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'high-school'

UNION ALL

-- Middle School category mappings
SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux
CROSS JOIN (VALUES
  ('Middle School'),
  ('Academic Preparation'),
  ('Study Skills')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'middle-school'

UNION ALL

-- Early Years category mappings
SELECT 
  'parentsimple',
  content_cat,
  ux.id,
  true,
  10
FROM ux_categories ux
CROSS JOIN (VALUES
  ('Early Years'),
  ('Early Childhood'),
  ('Foundation Building')
) AS cats(content_cat)
WHERE ux.site_id = 'parentsimple' AND ux.slug = 'early-years'

ON CONFLICT (site_id, content_category, ux_category_id) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  priority = EXCLUDED.priority;

COMMENT ON TABLE content_category_ux_mapping IS 'Updated to include mappings for actual content strategy category values (e.g., "College Consulting", "529 Plans") in addition to normalized values';

