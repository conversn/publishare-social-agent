-- ========================================
-- LENDER DIRECTORY SYSTEM
-- ========================================
-- Migration: create_lender_directory
-- Purpose: Create mortgage lender directory with public/gated data separation
--          Supports consumer discovery (SEO/AEO) and broker member portal
-- ========================================

-- ========================================
-- 1. CREATE LOAN_PROGRAMS TABLE (Reference Data)
-- ========================================

CREATE TABLE IF NOT EXISTS loan_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE, -- "FHA", "VA", "DSCR", "Non-QM"
  slug VARCHAR(100) NOT NULL UNIQUE, -- "fha", "va", "dscr", "non-qm"
  category VARCHAR(50) NOT NULL, -- "GOVERNMENT", "CONVENTIONAL", "NON_QM", "JUMBO", "COMMERCIAL", "SPECIALTY"
  description TEXT, -- Public description of the program
  icon VARCHAR(50), -- Optional icon identifier
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT loan_programs_category_check CHECK (category IN (
    'GOVERNMENT', 'CONVENTIONAL', 'NON_QM', 'JUMBO', 'COMMERCIAL', 'SPECIALTY'
  )),
  CONSTRAINT loan_programs_name_check CHECK (char_length(name) > 0),
  CONSTRAINT loan_programs_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_loan_programs_category ON loan_programs(category);
CREATE INDEX IF NOT EXISTS idx_loan_programs_active ON loan_programs(is_active);
CREATE INDEX IF NOT EXISTS idx_loan_programs_slug ON loan_programs(slug);

COMMENT ON TABLE loan_programs IS 'Reference table for standardized loan program types (FHA, VA, DSCR, etc.)';
COMMENT ON COLUMN loan_programs.category IS 'Program category: GOVERNMENT, CONVENTIONAL, NON_QM, JUMBO, COMMERCIAL, SPECIALTY';
COMMENT ON COLUMN loan_programs.slug IS 'URL-friendly identifier for program pages';

-- ========================================
-- 2. CREATE LENDERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS lenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership & Integration
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Multi-user support
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT, -- RateRoots master
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL, -- Link to SEO article page
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- Link to lead routing
  
  -- Public Fields (Consumer-Facing)
  name VARCHAR(255) NOT NULL, -- "AmWest Funding", "United Wholesale Mortgage"
  slug VARCHAR(255) NOT NULL, -- "amwest-funding", "united-wholesale-mortgage"
  description TEXT, -- Public description (consumer-safe)
  highlights TEXT[], -- Array of key selling points (public-safe)
  
  -- Public Qualification Criteria
  min_fico_score INTEGER CHECK (min_fico_score >= 300 AND min_fico_score <= 850),
  max_ltv DECIMAL(5,2) CHECK (max_ltv >= 0 AND max_ltv <= 100),
  max_loan_amount BIGINT CHECK (max_loan_amount > 0),
  states_available TEXT[] DEFAULT '{}', -- Array of state codes: ["CA", "NV", "AZ"]
  
  -- Gated Fields (Broker Member Portal Only)
  detailed_program_data JSONB DEFAULT '{}', -- Detailed program requirements, features
  special_features JSONB DEFAULT '{}', -- Advanced features, exceptions, overlays
  internal_notes TEXT, -- Internal notes for content management
  program_specifics JSONB DEFAULT '{}', -- Program-by-program detailed data
  
  -- Publication Status
  is_published BOOLEAN DEFAULT FALSE, -- Requires manual approval
  publication_notes TEXT, -- Notes about publication status
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(site_id, slug),
  CONSTRAINT lenders_name_check CHECK (char_length(name) > 0),
  CONSTRAINT lenders_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_lenders_site_id ON lenders(site_id);
CREATE INDEX IF NOT EXISTS idx_lenders_slug ON lenders(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_lenders_published ON lenders(site_id, is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_lenders_user_id ON lenders(user_id);
CREATE INDEX IF NOT EXISTS idx_lenders_fico ON lenders(min_fico_score) WHERE min_fico_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lenders_ltv ON lenders(max_ltv) WHERE max_ltv IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lenders_article_id ON lenders(article_id) WHERE article_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lenders_organization_id ON lenders(organization_id) WHERE organization_id IS NOT NULL;

-- Full-text search: Use regular column updated via trigger (generated columns have immutability issues)
-- Create search_text column
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Create function to update search_text
CREATE OR REPLACE FUNCTION update_lender_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' || 
    COALESCE(array_to_string(NEW.highlights, ' '), '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain search_text
CREATE TRIGGER lenders_update_search_text
  BEFORE INSERT OR UPDATE ON lenders
  FOR EACH ROW
  EXECUTE FUNCTION update_lender_search_text();

-- Full-text search index (can be added later if needed)
-- For now, search_text can be used for LIKE/ILIKE queries
-- To add full-text search later:
-- CREATE INDEX idx_lenders_search ON lenders USING gin(to_tsvector('simple', search_text));

-- GIN index for JSONB fields (gated data)
CREATE INDEX IF NOT EXISTS idx_lenders_detailed_data ON lenders USING gin(detailed_program_data);
CREATE INDEX IF NOT EXISTS idx_lenders_special_features ON lenders USING gin(special_features);
CREATE INDEX IF NOT EXISTS idx_lenders_program_specifics ON lenders USING gin(program_specifics);

COMMENT ON TABLE lenders IS 'Mortgage lender directory with public (consumer) and gated (broker) data separation';
COMMENT ON COLUMN lenders.site_id IS 'Site identifier - RateRoots is master, lenders serve site goals';
COMMENT ON COLUMN lenders.article_id IS 'Link to articles table for SEO content pages';
COMMENT ON COLUMN lenders.organization_id IS 'Link to organizations table for lead routing via CallReady CRM';
COMMENT ON COLUMN lenders.highlights IS 'Public-safe key selling points (excludes sensitive data)';
COMMENT ON COLUMN lenders.detailed_program_data IS 'Gated: Detailed program requirements visible only to broker members';
COMMENT ON COLUMN lenders.special_features IS 'Gated: Advanced features, exceptions, overlays for broker members';
COMMENT ON COLUMN lenders.internal_notes IS 'Gated: Internal content management notes';
COMMENT ON COLUMN lenders.program_specifics IS 'Gated: Program-by-program detailed data for broker members';
COMMENT ON COLUMN lenders.is_published IS 'Publication status - requires manual approval to prevent overstating capabilities';

-- ========================================
-- 3. CREATE LENDER_PROGRAMS JUNCTION TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS lender_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID NOT NULL REFERENCES lenders(id) ON DELETE CASCADE,
  loan_program_id UUID NOT NULL REFERENCES loan_programs(id) ON DELETE CASCADE,
  
  -- Public Fields (Consumer-Facing)
  min_fico INTEGER CHECK (min_fico >= 300 AND min_fico <= 850),
  max_ltv DECIMAL(5,2) CHECK (max_ltv >= 0 AND max_ltv <= 100),
  public_features TEXT[], -- Public-safe features
  
  -- Gated Fields (Broker Member Portal Only)
  detailed_requirements JSONB DEFAULT '{}', -- Detailed requirements, exceptions
  special_conditions JSONB DEFAULT '{}', -- Special conditions, overlays
  internal_notes TEXT, -- Internal notes for this program-lender combination
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(lender_id, loan_program_id)
);

CREATE INDEX IF NOT EXISTS idx_lender_programs_lender ON lender_programs(lender_id);
CREATE INDEX IF NOT EXISTS idx_lender_programs_program ON lender_programs(loan_program_id);
CREATE INDEX IF NOT EXISTS idx_lender_programs_composite ON lender_programs(lender_id, loan_program_id);
CREATE INDEX IF NOT EXISTS idx_lender_programs_fico ON lender_programs(min_fico) WHERE min_fico IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lender_programs_ltv ON lender_programs(max_ltv) WHERE max_ltv IS NOT NULL;

COMMENT ON TABLE lender_programs IS 'Many-to-many relationship between lenders and loan programs with public/gated data separation';
COMMENT ON COLUMN lender_programs.public_features IS 'Public-safe features for this lender-program combination';
COMMENT ON COLUMN lender_programs.detailed_requirements IS 'Gated: Detailed requirements visible only to broker members';
COMMENT ON COLUMN lender_programs.special_conditions IS 'Gated: Special conditions, overlays for broker members';

-- ========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on lenders table
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;

-- Public read access to published lenders (public fields only)
CREATE POLICY lenders_public_select ON lenders
  FOR SELECT
  USING (
    is_published = TRUE
  );

-- Users can manage their own lenders
CREATE POLICY lenders_user_manage ON lenders
  FOR ALL
  USING (
    auth.uid() = user_id
  );

-- Enable RLS on lender_programs table
ALTER TABLE lender_programs ENABLE ROW LEVEL SECURITY;

-- Public read access to lender programs for published lenders
CREATE POLICY lender_programs_public_select ON lender_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lenders 
      WHERE lenders.id = lender_programs.lender_id 
      AND lenders.is_published = TRUE
    )
  );

-- Users can manage lender programs for their own lenders
CREATE POLICY lender_programs_user_manage ON lender_programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lenders 
      WHERE lenders.id = lender_programs.lender_id 
      AND lenders.user_id = auth.uid()
    )
  );

-- Note: Gated data access (detailed_program_data, special_features, etc.)
-- will be controlled at the application level via member portal authentication
-- RLS policies above ensure base data access, but gated fields require additional checks

-- ========================================
-- 5. CREATE HELPER VIEWS
-- ========================================

-- View: Lenders with loan programs (public data only)
CREATE OR REPLACE VIEW lenders_with_programs_public AS
SELECT 
  l.id,
  l.name,
  l.slug,
  l.description,
  l.highlights,
  l.min_fico_score,
  l.max_ltv,
  l.max_loan_amount,
  l.states_available,
  l.site_id,
  l.article_id,
  l.organization_id,
  l.is_published,
  l.created_at,
  l.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', lp.id,
        'program_id', p.id,
        'program_name', p.name,
        'program_slug', p.slug,
        'program_category', p.category,
        'min_fico', lp.min_fico,
        'max_ltv', lp.max_ltv,
        'public_features', lp.public_features
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::json
  ) as loan_programs
FROM lenders l
LEFT JOIN lender_programs lp ON l.id = lp.lender_id
LEFT JOIN loan_programs p ON lp.loan_program_id = p.id
WHERE l.is_published = TRUE
GROUP BY l.id;

-- View: Lenders with loan programs (gated data for broker members)
-- This view will be used by authenticated broker members via API
CREATE OR REPLACE VIEW lenders_with_programs_gated AS
SELECT 
  l.*, -- All fields including gated data
  COALESCE(
    json_agg(
      json_build_object(
        'id', lp.id,
        'program_id', p.id,
        'program_name', p.name,
        'program_slug', p.slug,
        'program_category', p.category,
        'min_fico', lp.min_fico,
        'max_ltv', lp.max_ltv,
        'public_features', lp.public_features,
        'detailed_requirements', lp.detailed_requirements,
        'special_conditions', lp.special_conditions,
        'internal_notes', lp.internal_notes
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::json
  ) as loan_programs
FROM lenders l
LEFT JOIN lender_programs lp ON l.id = lp.lender_id
LEFT JOIN loan_programs p ON lp.loan_program_id = p.id
GROUP BY l.id;

-- View: Loan programs with lender counts
CREATE OR REPLACE VIEW loan_programs_with_counts AS
SELECT 
  p.*,
  COUNT(DISTINCT lp.lender_id) FILTER (WHERE l.is_published = TRUE) as published_lender_count,
  COUNT(DISTINCT lp.lender_id) as total_lender_count
FROM loan_programs p
LEFT JOIN lender_programs lp ON p.id = lp.loan_program_id
LEFT JOIN lenders l ON lp.lender_id = l.id
WHERE p.is_active = TRUE
GROUP BY p.id;

COMMENT ON VIEW lenders_with_programs_public IS 'Public view of lenders with loan programs (consumer-facing, excludes gated data)';
COMMENT ON VIEW lenders_with_programs_gated IS 'Gated view of lenders with loan programs (broker member portal, includes all data)';
COMMENT ON VIEW loan_programs_with_counts IS 'Loan programs with counts of lenders offering each program';

-- ========================================
-- 6. POPULATE LOAN PROGRAMS (Reference Data)
-- ========================================

INSERT INTO loan_programs (name, slug, category, description, display_order) VALUES
-- Government Programs
('FHA', 'fha', 'GOVERNMENT', 'Federal Housing Administration loans for first-time homebuyers and low-to-moderate income borrowers', 1),
('VA', 'va', 'GOVERNMENT', 'Veterans Affairs loans for eligible veterans, active-duty service members, and surviving spouses', 2),
('USDA', 'usda', 'GOVERNMENT', 'USDA Rural Development loans for rural and suburban homebuyers', 3),

-- Conventional Programs
('Conventional', 'conventional', 'CONVENTIONAL', 'Conventional conforming loans backed by Fannie Mae and Freddie Mac', 4),
('High Balance', 'high-balance', 'CONVENTIONAL', 'High balance conforming loans for high-cost areas', 5),
('HomeReady', 'homeready', 'CONVENTIONAL', 'Fannie Mae HomeReady program for low-to-moderate income borrowers', 6),
('Home Possible', 'home-possible', 'CONVENTIONAL', 'Freddie Mac Home Possible program for low-to-moderate income borrowers', 7),

-- Non-QM Programs
('DSCR', 'dscr', 'NON_QM', 'Debt Service Coverage Ratio loans for investment properties', 8),
('Bank Statement', 'bank-statement', 'NON_QM', 'Bank statement loans for self-employed borrowers', 9),
('Asset Depletion', 'asset-depletion', 'NON_QM', 'Asset depletion loans using assets to qualify', 10),
('ITIN', 'itin', 'NON_QM', 'ITIN loans for borrowers without Social Security numbers', 11),
('Foreign National', 'foreign-national', 'NON_QM', 'Foreign national loans for non-US residents', 12),
('No Ratio', 'no-ratio', 'NON_QM', 'No ratio loans that don''t require debt-to-income calculation', 13),
('VOE Only', 'voe-only', 'NON_QM', 'Verification of Employment only loans', 14),
('1099 Only', '1099-only', 'NON_QM', '1099-only income documentation loans', 15),
('P&L Only', 'pl-only', 'NON_QM', 'Profit & Loss statement only loans', 16),

-- Jumbo Programs
('Jumbo', 'jumbo', 'JUMBO', 'Jumbo loans above conforming loan limits', 17),
('Super Jumbo', 'super-jumbo', 'JUMBO', 'Super jumbo loans for high-value properties', 18),

-- Commercial Programs
('Commercial', 'commercial', 'COMMERCIAL', 'Commercial real estate loans', 19),
('Multifamily', 'multifamily', 'COMMERCIAL', 'Multifamily property loans (5+ units)', 20),
('Mixed Use', 'mixed-use', 'COMMERCIAL', 'Mixed-use commercial and residential properties', 21),

-- Specialty Programs
('Reverse', 'reverse', 'SPECIALTY', 'Reverse mortgage (HECM) loans for seniors', 22),
('HELOC', 'heloc', 'SPECIALTY', 'Home Equity Line of Credit', 23),
('Construction', 'construction', 'SPECIALTY', 'Construction-to-permanent loans', 24),
('Renovation', 'renovation', 'SPECIALTY', 'Renovation loans (FHA 203k, HomeStyle)', 25),
('Bridge', 'bridge', 'SPECIALTY', 'Bridge loans for short-term financing', 26),
('Fix & Flip', 'fix-flip', 'SPECIALTY', 'Fix and flip loans for real estate investors', 27),
('Land', 'land', 'SPECIALTY', 'Land and lot loans', 28),
('Manufactured', 'manufactured', 'SPECIALTY', 'Manufactured home loans', 29),
('DPA', 'dpa', 'SPECIALTY', 'Down Payment Assistance programs', 30)

ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- 7. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lenders_updated_at
  BEFORE UPDATE ON lenders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lender_programs_updated_at
  BEFORE UPDATE ON lender_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_programs_updated_at
  BEFORE UPDATE ON loan_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 8. BACKFILL SEARCH_TEXT FOR EXISTING DATA
-- ========================================

-- Update search_text for any existing lenders (if any)
UPDATE lenders 
SET search_text = 
  COALESCE(name, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(array_to_string(highlights, ' '), '')
WHERE search_text IS NULL;

-- ========================================
-- 8. ADD COMMENTS
-- ========================================

COMMENT ON TABLE loan_programs IS 'Reference table for standardized loan program types. Used across all lenders for consistent categorization.';
COMMENT ON TABLE lenders IS 'Mortgage lender directory. Public fields visible to consumers, gated fields (detailed_program_data, special_features, etc.) visible only to authenticated broker members.';
COMMENT ON TABLE lender_programs IS 'Many-to-many relationship between lenders and loan programs. Supports program-specific requirements and features.';
COMMENT ON COLUMN lenders.site_id IS 'RateRoots is master site. Lenders serve RateRoots goals and may be linked to other Simple sites in the future.';
COMMENT ON COLUMN lenders.article_id IS 'Link to articles table for SEO-optimized lender pages. Articles provide answer-first content for AEO.';
COMMENT ON COLUMN lenders.organization_id IS 'Link to organizations table for lead routing. Leads flow through RateRoots quiz → CallReady CRM → webhook to organization.';

-- ========================================
-- 9. CREATE INDEXES FOR COMMON QUERIES
-- ========================================

-- Index for filtering by state
CREATE INDEX IF NOT EXISTS idx_lenders_states_gin ON lenders USING gin(states_available);

-- Index for filtering by FICO and LTV together
CREATE INDEX IF NOT EXISTS idx_lenders_fico_ltv ON lenders(min_fico_score, max_ltv) 
  WHERE min_fico_score IS NOT NULL AND max_ltv IS NOT NULL;

-- Index for program-based queries
CREATE INDEX IF NOT EXISTS idx_lender_programs_program_lender ON lender_programs(loan_program_id, lender_id);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

