-- ========================================
-- HomeSimple Local SEO Database Schema
-- ========================================
-- 
-- Purpose: Support local SEO page generation for [city][problem][help].com network
-- 
-- Tables Created:
-- - domains: Domain/city/vertical mapping
-- - local_facts: City-specific facts (neighborhoods, climate, regulations)
-- - quality_checks: Uniqueness scores, doorway risk, validation results
-- - content_blocks: Modular page content blocks
--
-- Tables Extended:
-- - articles: Add local page fields (page_type, city, state, vertical, etc)
-- 
-- ========================================

-- ========================================
-- 1. CREATE DOMAINS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  city VARCHAR(100),
  state VARCHAR(2),
  vertical VARCHAR(50) NOT NULL, -- hvac, plumbing, pest, roof, windows, etc
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, pending
  canonical_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for domains
CREATE INDEX IF NOT EXISTS idx_domains_city_state ON domains(city, state);
CREATE INDEX IF NOT EXISTS idx_domains_vertical ON domains(vertical);
CREATE INDEX IF NOT EXISTS idx_domains_status ON domains(status);

-- ========================================
-- 2. CREATE LOCAL_FACTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS local_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  vertical VARCHAR(50) NOT NULL, -- hvac, plumbing, pest, etc
  fact_type VARCHAR(50) NOT NULL, -- neighborhood, climate, regulation, common_issue, emergency_seasonality
  content TEXT NOT NULL,
  source_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city, state, vertical, fact_type)
);

-- Indexes for local_facts
CREATE INDEX IF NOT EXISTS idx_local_facts_city_state_vertical ON local_facts(city, state, vertical);
CREATE INDEX IF NOT EXISTS idx_local_facts_fact_type ON local_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_local_facts_verified ON local_facts(verified);

-- ========================================
-- 3. CREATE QUALITY_CHECKS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  uniqueness_score DECIMAL(3,2), -- 0.00 to 1.00, higher = more unique
  similarity_hash TEXT, -- Hash of content for quick comparison
  doorway_risk_score DECIMAL(3,2), -- 0.00 to 1.00, higher = more risky
  doorway_risk_level VARCHAR(20), -- low, medium, high
  similar_pages JSONB, -- Array of {page_id, similarity, matching_sections}
  claims_validated BOOLEAN DEFAULT false,
  claims_issues JSONB, -- Array of unverified claims
  schema_validated BOOLEAN DEFAULT false,
  schema_issues JSONB, -- Array of schema validation issues
  call_routing_validated BOOLEAN DEFAULT false,
  call_routing_issues JSONB, -- Array of routing validation issues
  overall_score DECIMAL(3,2), -- 0.00 to 1.00, overall quality score
  can_publish BOOLEAN DEFAULT false,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for quality_checks
CREATE INDEX IF NOT EXISTS idx_quality_checks_page_id ON quality_checks(page_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_doorway_risk ON quality_checks(doorway_risk_score);
CREATE INDEX IF NOT EXISTS idx_quality_checks_can_publish ON quality_checks(can_publish);
CREATE INDEX IF NOT EXISTS idx_quality_checks_checked_at ON quality_checks(checked_at);

-- ========================================
-- 4. CREATE CONTENT_BLOCKS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  block_type VARCHAR(50) NOT NULL, -- hero, trust_bar, problem_signals, service_steps, pricing_ranges, faqs, service_areas, about_process, cta_sections
  content JSONB NOT NULL, -- Flexible JSON structure for different block types
  order_index INTEGER NOT NULL DEFAULT 0,
  variant_id VARCHAR(100), -- For A/B testing
  performance_data JSONB, -- Track CTR, engagement, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for content_blocks
CREATE INDEX IF NOT EXISTS idx_content_blocks_page_id ON content_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_content_blocks_block_type ON content_blocks(block_type);
CREATE INDEX IF NOT EXISTS idx_content_blocks_page_order ON content_blocks(page_id, order_index);

-- ========================================
-- 5. EXTEND ARTICLES TABLE FOR LOCAL PAGES
-- ========================================

-- Add page_type column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'page_type'
  ) THEN
    ALTER TABLE articles ADD COLUMN page_type VARCHAR(50) DEFAULT 'article';
  END IF;
END $$;

-- Add city column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'city'
  ) THEN
    ALTER TABLE articles ADD COLUMN city VARCHAR(100);
  END IF;
END $$;

-- Add state column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'state'
  ) THEN
    ALTER TABLE articles ADD COLUMN state VARCHAR(2);
  END IF;
END $$;

-- Add vertical column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'vertical'
  ) THEN
    ALTER TABLE articles ADD COLUMN vertical VARCHAR(50);
  END IF;
END $$;

-- Add phone_number column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE articles ADD COLUMN phone_number VARCHAR(20);
  END IF;
END $$;

-- Add service_areas column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'service_areas'
  ) THEN
    ALTER TABLE articles ADD COLUMN service_areas TEXT[];
  END IF;
END $$;

-- Add call_routing_configured column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'call_routing_configured'
  ) THEN
    ALTER TABLE articles ADD COLUMN call_routing_configured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add domain_id column (if not exists) for linking to domains table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'domain_id'
  ) THEN
    ALTER TABLE articles ADD COLUMN domain_id UUID REFERENCES domains(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for new article columns
CREATE INDEX IF NOT EXISTS idx_articles_page_type ON articles(page_type);
CREATE INDEX IF NOT EXISTS idx_articles_city_state ON articles(city, state);
CREATE INDEX IF NOT EXISTS idx_articles_vertical ON articles(vertical);
CREATE INDEX IF NOT EXISTS idx_articles_domain_id ON articles(domain_id);
CREATE INDEX IF NOT EXISTS idx_articles_local_page ON articles(page_type, city, state, vertical) WHERE page_type = 'local_page';

-- ========================================
-- 6. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_local_facts_updated_at
  BEFORE UPDATE ON local_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_checks_updated_at
  BEFORE UPDATE ON quality_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_blocks_updated_at
  BEFORE UPDATE ON content_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all new tables
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for domains (service role can do everything)
CREATE POLICY "Service role can manage domains"
  ON domains FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for local_facts (service role can do everything)
CREATE POLICY "Service role can manage local_facts"
  ON local_facts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for quality_checks (service role can do everything)
CREATE POLICY "Service role can manage quality_checks"
  ON quality_checks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for content_blocks (service role can do everything)
CREATE POLICY "Service role can manage content_blocks"
  ON content_blocks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ========================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE domains IS 'Domain/city/vertical mapping for HomeSimple local SEO pages';
COMMENT ON TABLE local_facts IS 'City-specific facts (neighborhoods, climate, regulations) for local page generation';
COMMENT ON TABLE quality_checks IS 'Quality validation results including doorway risk, uniqueness, and claim validation';
COMMENT ON TABLE content_blocks IS 'Modular content blocks for local pages (hero, trust bar, FAQs, etc)';

COMMENT ON COLUMN articles.page_type IS 'Type of page: article (standard) or local_page (HomeSimple local SEO)';
COMMENT ON COLUMN articles.city IS 'City for local pages';
COMMENT ON COLUMN articles.state IS 'State (2-letter code) for local pages';
COMMENT ON COLUMN articles.vertical IS 'Service vertical: hvac, plumbing, pest, roof, windows, etc';
COMMENT ON COLUMN articles.phone_number IS 'Phone number for local pages (CallReady tracking number)';
COMMENT ON COLUMN articles.service_areas IS 'Array of service area names/neighborhoods';
COMMENT ON COLUMN articles.call_routing_configured IS 'Whether call routing is configured in CallReady system';

