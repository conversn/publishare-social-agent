-- ========================================
-- Senior Resources Database Schema
-- ========================================
-- 
-- Purpose: Store senior living resources (assisted living, memory care, etc.)
--          discovered from Caring.com, A Place for Mom, and other sources
-- 
-- Adapted from: lenders table structure
-- Site: seniorsimple
-- ========================================

-- ========================================
-- 1. CREATE SENIOR_RESOURCES TABLE
-- ========================================

-- Drop table if it exists (to avoid conflicts from previous attempts)
DROP TABLE IF EXISTS senior_resources CASCADE;

CREATE TABLE senior_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership & Integration
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL DEFAULT 'seniorsimple',
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Resource Identification
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'assisted-living', 'memory-care', 'independent-living', 'nursing-home', 'in-home-care', 'hospice', 'adult-day-care'
  description TEXT,
  highlights TEXT[], -- Array of key selling points
  
  -- Location Data
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2), -- US state code
  zip_code VARCHAR(10),
  states_available TEXT[] DEFAULT '{}', -- Multi-state providers
  service_areas TEXT[], -- Specific cities/regions served
  
  -- Service Details (Public)
  care_levels TEXT[], -- ['minimal', 'moderate', 'extensive', 'skilled-nursing', 'memory-care']
  amenities TEXT[], -- ['dining', 'transportation', 'activities', 'medical', 'fitness', 'beauty', etc.]
  pricing_range JSONB, -- {min: 2000, max: 8000, currency: 'USD', period: 'monthly', notes: 'varies by care level'}
  accepts_medicare BOOLEAN,
  accepts_medicaid BOOLEAN,
  accepts_insurance BOOLEAN,
  accepts_private_pay BOOLEAN DEFAULT TRUE,
  
  -- Contact Information (Public)
  phone VARCHAR(20),
  website_url TEXT,
  email VARCHAR(255),
  
  -- Gated Fields (Internal)
  detailed_service_data JSONB DEFAULT '{}', -- Detailed care plans, staff ratios, etc.
  internal_notes TEXT,
  competitor_data JSONB DEFAULT '{}',
  research_source TEXT, -- 'caring.com', 'aplaceformom.com', 'manual', 'other'
  source_url TEXT, -- Original listing URL
  last_researched TIMESTAMPTZ,
  
  -- Publication Status
  is_published BOOLEAN DEFAULT FALSE,
  publication_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(site_id, slug),
  CONSTRAINT senior_resources_name_check CHECK (char_length(name) > 0),
  CONSTRAINT senior_resources_slug_check CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT senior_resources_type_check CHECK (resource_type IN (
    'assisted-living', 'memory-care', 'independent-living', 'nursing-home', 
    'in-home-care', 'hospice', 'adult-day-care', 'continuing-care-retirement-community'
  ))
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_senior_resources_site_id ON senior_resources(site_id);
CREATE INDEX IF NOT EXISTS idx_senior_resources_slug ON senior_resources(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_senior_resources_type ON senior_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_senior_resources_state ON senior_resources(state);
CREATE INDEX IF NOT EXISTS idx_senior_resources_city ON senior_resources(city);
CREATE INDEX IF NOT EXISTS idx_senior_resources_published ON senior_resources(site_id, is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_senior_resources_user_id ON senior_resources(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_senior_resources_article_id ON senior_resources(article_id) WHERE article_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_senior_resources_research_source ON senior_resources(research_source) WHERE research_source IS NOT NULL;

-- Full-text search support
ALTER TABLE senior_resources ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Create function to update search_text
CREATE OR REPLACE FUNCTION update_senior_resource_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := 
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.highlights, ' '), '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' ||
    COALESCE(NEW.state, '') || ' ' ||
    COALESCE(array_to_string(NEW.care_levels, ' '), '') || ' ' ||
    COALESCE(array_to_string(NEW.amenities, ' '), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_text
DROP TRIGGER IF EXISTS trigger_update_senior_resource_search_text ON senior_resources;
CREATE TRIGGER trigger_update_senior_resource_search_text
  BEFORE INSERT OR UPDATE ON senior_resources
  FOR EACH ROW
  EXECUTE FUNCTION update_senior_resource_search_text();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_senior_resources_search_text ON senior_resources USING gin(to_tsvector('english', search_text));

-- ========================================
-- 3. CREATE VIEWS
-- ========================================

-- Public view (consumer-facing)
CREATE OR REPLACE VIEW senior_resources_public AS
SELECT 
  id,
  name,
  slug,
  resource_type,
  description,
  highlights,
  address,
  city,
  state,
  zip_code,
  states_available,
  service_areas,
  care_levels,
  amenities,
  pricing_range,
  accepts_medicare,
  accepts_medicaid,
  accepts_insurance,
  accepts_private_pay,
  phone,
  website_url,
  email,
  site_id,
  article_id,
  is_published,
  created_at,
  updated_at
FROM senior_resources
WHERE is_published = TRUE;

-- Gated view (internal/admin)
-- Note: SELECT * already includes all columns, so we don't need to list them explicitly
CREATE OR REPLACE VIEW senior_resources_gated AS
SELECT 
  *
FROM senior_resources;

-- ========================================
-- 4. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to get resources by type and location
CREATE OR REPLACE FUNCTION get_senior_resources_by_location(
  p_resource_type VARCHAR(50),
  p_state VARCHAR(2) DEFAULT NULL,
  p_city VARCHAR(100) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(255),
  resource_type VARCHAR(50),
  description TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  phone VARCHAR(20),
  website_url TEXT,
  pricing_range JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.name,
    sr.slug,
    sr.resource_type,
    sr.description,
    sr.city,
    sr.state,
    sr.phone,
    sr.website_url,
    sr.pricing_range
  FROM senior_resources sr
  WHERE sr.is_published = TRUE
    AND sr.resource_type = p_resource_type
    AND (p_state IS NULL OR sr.state = p_state)
    AND (p_city IS NULL OR sr.city ILIKE '%' || p_city || '%')
  ORDER BY sr.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to count resources by type and state
CREATE OR REPLACE FUNCTION count_senior_resources_by_location(
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_state VARCHAR(2) DEFAULT NULL
)
RETURNS TABLE (
  resource_type VARCHAR(50),
  state VARCHAR(2),
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.resource_type,
    sr.state,
    COUNT(*)::BIGINT as count
  FROM senior_resources sr
  WHERE sr.is_published = TRUE
    AND (p_resource_type IS NULL OR sr.resource_type = p_resource_type)
    AND (p_state IS NULL OR sr.state = p_state)
  GROUP BY sr.resource_type, sr.state
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. COMMENTS
-- ========================================

COMMENT ON TABLE senior_resources IS 'Senior living resources discovered from directory sites (Caring.com, A Place for Mom)';
COMMENT ON COLUMN senior_resources.resource_type IS 'Type of senior living resource';
COMMENT ON COLUMN senior_resources.care_levels IS 'Array of care levels provided (minimal, moderate, extensive, skilled-nursing, memory-care)';
COMMENT ON COLUMN senior_resources.amenities IS 'Array of amenities offered';
COMMENT ON COLUMN senior_resources.pricing_range IS 'JSONB with min, max, currency, period, and notes';
COMMENT ON COLUMN senior_resources.research_source IS 'Source where resource was discovered (caring.com, aplaceformom.com, manual, other)';
COMMENT ON COLUMN senior_resources.source_url IS 'Original URL where resource was found';

