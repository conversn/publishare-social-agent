-- ========================================
-- UX CATEGORIES SYSTEM
-- ========================================
-- Migration: create_ux_categories
-- Purpose: Separate user-facing categories from content strategy categories
-- ========================================

-- ========================================
-- 1. CREATE UX_CATEGORIES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS ux_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- "Guides", "Resources", "News"
  slug VARCHAR(100) NOT NULL, -- "guides", "resources", "news"
  description TEXT,
  display_order INTEGER DEFAULT 0, -- For sorting in navigation
  icon VARCHAR(50), -- Optional icon identifier
  color VARCHAR(7), -- Optional hex color for UI
  is_active BOOLEAN DEFAULT TRUE,
  parent_id UUID REFERENCES ux_categories(id) ON DELETE SET NULL, -- For hierarchical categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(site_id, slug),
  CONSTRAINT ux_categories_name_check CHECK (char_length(name) > 0),
  CONSTRAINT ux_categories_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_ux_categories_site_id ON ux_categories(site_id);
CREATE INDEX IF NOT EXISTS idx_ux_categories_site_active ON ux_categories(site_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ux_categories_parent ON ux_categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ux_categories_display_order ON ux_categories(site_id, display_order);

COMMENT ON TABLE ux_categories IS 'User-facing categories for site navigation and filtering, separate from content strategy categories';
COMMENT ON COLUMN ux_categories.site_id IS 'Site identifier - each site can have its own UX category taxonomy';
COMMENT ON COLUMN ux_categories.name IS 'Display name for the category (e.g., "Guides", "Resources")';
COMMENT ON COLUMN ux_categories.slug IS 'URL-friendly identifier (e.g., "guides", "resources")';
COMMENT ON COLUMN ux_categories.display_order IS 'Order for displaying in navigation menus';
COMMENT ON COLUMN ux_categories.parent_id IS 'Parent category for hierarchical organization';

-- ========================================
-- 2. CREATE ARTICLE_UX_CATEGORIES JUNCTION TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS article_ux_categories (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  ux_category_id UUID NOT NULL REFERENCES ux_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE, -- Primary category for display
  display_order INTEGER DEFAULT 0, -- For sorting if multiple categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (article_id, ux_category_id)
);

-- Unique constraint: Only one primary category per article
CREATE UNIQUE INDEX IF NOT EXISTS idx_article_ux_categories_primary 
  ON article_ux_categories(article_id) 
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_article_ux_categories_article ON article_ux_categories(article_id);
CREATE INDEX IF NOT EXISTS idx_article_ux_categories_ux_category ON article_ux_categories(ux_category_id);
CREATE INDEX IF NOT EXISTS idx_article_ux_categories_primary_category ON article_ux_categories(article_id, is_primary) WHERE is_primary = TRUE;

COMMENT ON TABLE article_ux_categories IS 'Many-to-many relationship between articles and UX categories';
COMMENT ON COLUMN article_ux_categories.is_primary IS 'Primary category for breadcrumbs and main display';
COMMENT ON COLUMN article_ux_categories.display_order IS 'Order for displaying multiple categories';

-- ========================================
-- 3. CREATE CONTENT_CATEGORY_UX_MAPPING TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS content_category_ux_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  content_category VARCHAR(100) NOT NULL, -- "business-loans", "sba-loans"
  ux_category_id UUID NOT NULL REFERENCES ux_categories(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE, -- Default mapping for auto-assignment
  priority INTEGER DEFAULT 0, -- Higher priority = preferred mapping
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(site_id, content_category, ux_category_id)
);

CREATE INDEX IF NOT EXISTS idx_content_category_mapping_site ON content_category_ux_mapping(site_id);
CREATE INDEX IF NOT EXISTS idx_content_category_mapping_content ON content_category_ux_mapping(site_id, content_category);
CREATE INDEX IF NOT EXISTS idx_content_category_mapping_default ON content_category_ux_mapping(site_id, content_category, is_default) WHERE is_default = TRUE;

COMMENT ON TABLE content_category_ux_mapping IS 'Automatic mapping rules from content strategy categories to UX categories';
COMMENT ON COLUMN content_category_ux_mapping.content_category IS 'Content strategy category from articles.category field';
COMMENT ON COLUMN content_category_ux_mapping.ux_category_id IS 'Target UX category for auto-assignment';
COMMENT ON COLUMN content_category_ux_mapping.is_default IS 'Default mapping used for automatic assignment during article creation';

-- ========================================
-- 4. CREATE HELPER VIEWS
-- ========================================

-- View: Articles with primary UX category
CREATE OR REPLACE VIEW articles_with_primary_ux_category AS
SELECT 
  a.*,
  ux.id as primary_ux_category_id,
  ux.name as primary_ux_category_name,
  ux.slug as primary_ux_category_slug
FROM articles a
LEFT JOIN article_ux_categories auc ON a.id = auc.article_id AND auc.is_primary = TRUE
LEFT JOIN ux_categories ux ON auc.ux_category_id = ux.id;

-- View: Articles with all UX categories (JSON array)
CREATE OR REPLACE VIEW articles_with_ux_categories AS
SELECT 
  a.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', ux.id,
        'name', ux.name,
        'slug', ux.slug,
        'is_primary', auc.is_primary,
        'display_order', auc.display_order
      )
    ) FILTER (WHERE ux.id IS NOT NULL),
    '[]'::json
  ) as ux_categories
FROM articles a
LEFT JOIN article_ux_categories auc ON a.id = auc.article_id
LEFT JOIN ux_categories ux ON auc.ux_category_id = ux.id
GROUP BY a.id;

-- ========================================
-- 5. POPULATE DEFAULT UX CATEGORIES FOR RATEROOTS
-- ========================================

INSERT INTO ux_categories (site_id, name, slug, description, display_order) VALUES
('rateroots', 'Guides', 'guides', 'Step-by-step guides and tutorials', 1),
('rateroots', 'Resources', 'resources', 'Reference materials and tools', 2),
('rateroots', 'Comparisons', 'comparisons', 'Product and service comparisons', 3),
('rateroots', 'Industry Guides', 'industry-guides', 'Industry-specific financing guides', 4),
('rateroots', 'News & Updates', 'news', 'Industry news and updates', 5)
ON CONFLICT (site_id, slug) DO NOTHING;

-- ========================================
-- 6. CREATE DEFAULT MAPPING RULES FOR RATEROOTS
-- ========================================

-- Map content strategy categories to UX categories
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default, priority) 
SELECT 
  'rateroots',
  content_cat,
  ux.id,
  TRUE,
  10
FROM (
  VALUES 
    ('business-loans', 'guides'),
    ('sba-loans', 'guides'),
    ('equipment-financing', 'guides'),
    ('working-capital', 'guides'),
    ('bad-credit-loans', 'guides'),
    ('startup-loans', 'guides'),
    ('small-business-grants', 'resources'),
    ('comparison', 'comparisons'),
    ('construction', 'industry-guides'),
    ('healthcare', 'industry-guides'),
    ('restaurant', 'industry-guides'),
    ('retail', 'industry-guides'),
    ('trucking', 'industry-guides'),
    ('real-estate', 'industry-guides'),
    ('e-commerce', 'industry-guides'),
    ('manufacturing', 'industry-guides')
) AS mappings(content_cat, ux_slug)
INNER JOIN ux_categories ux ON ux.site_id = 'rateroots' AND ux.slug = mappings.ux_slug
ON CONFLICT (site_id, content_category, ux_category_id) DO NOTHING;

-- ========================================
-- 7. AUTO-ASSIGN UX CATEGORIES TO EXISTING ARTICLES
-- ========================================

-- Function to auto-assign UX categories based on content category
DO $$
DECLARE
  article_record RECORD;
  mapping_record RECORD;
BEGIN
  FOR article_record IN 
    SELECT id, category, site_id 
    FROM articles 
    WHERE site_id = 'rateroots' 
      AND category IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM article_ux_categories WHERE article_id = articles.id
      )
  LOOP
    -- Find default mapping for this content category
    SELECT ux_category_id INTO mapping_record
    FROM content_category_ux_mapping
    WHERE site_id = article_record.site_id
      AND content_category = article_record.category
      AND is_default = TRUE
    LIMIT 1;
    
    -- Assign UX category if mapping found
    IF mapping_record.ux_category_id IS NOT NULL THEN
      INSERT INTO article_ux_categories (article_id, ux_category_id, is_primary)
      VALUES (article_record.id, mapping_record.ux_category_id, TRUE)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ========================================
-- 8. ADD COMMENTS
-- ========================================

COMMENT ON TABLE ux_categories IS 'User-facing categories for site navigation. Separate from content strategy categories (articles.category). Each site can define its own taxonomy.';
COMMENT ON TABLE article_ux_categories IS 'Many-to-many relationship allowing articles to belong to multiple UX categories. One category per article should be marked as primary.';
COMMENT ON TABLE content_category_ux_mapping IS 'Automatic mapping rules from content strategy categories (articles.category) to UX categories. Used for auto-assignment during article creation.';




