-- ========================================
-- CREATE HOMESIMPLE UX CATEGORIES
-- ========================================
-- Migration: create_homesimple_ux_categories
-- Purpose: Create UX categories for HomeSimple site navigation
-- ========================================

-- Insert HomeSimple UX categories
INSERT INTO ux_categories (site_id, name, slug, description, display_order, is_active)
VALUES
  ('homesimple', 'HVAC', 'hvac', 'Heating, ventilation, and air conditioning services', 1, true),
  ('homesimple', 'Plumbing', 'plumbing', 'Plumbing installation, repair, and maintenance', 2, true),
  ('homesimple', 'Electrical', 'electrical', 'Electrical installation, repair, and safety', 3, true),
  ('homesimple', 'Home Improvement', 'home-improvement', 'General home improvement and remodeling', 4, true),
  ('homesimple', 'Emergency Services', 'emergency-services', '24/7 emergency home service professionals', 5, true),
  ('homesimple', 'Resources', 'resources', 'Home maintenance guides, tools, and resources', 6, true)
ON CONFLICT (site_id, slug) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify categories were created
SELECT 
  id,
  site_id,
  name,
  slug,
  description,
  display_order,
  is_active
FROM ux_categories
WHERE site_id = 'homesimple'
ORDER BY display_order;

-- Add comments
COMMENT ON TABLE ux_categories IS 'User-facing navigation categories for articles. HomeSimple has 6 categories: HVAC, Plumbing, Electrical, Home Improvement, Emergency Services, and Resources.';

