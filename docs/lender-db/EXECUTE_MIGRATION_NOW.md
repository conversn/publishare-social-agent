# 🚀 Execute Lender Directory Migration - SQL Editor Method

## Quick Execution (Recommended)

The Supabase CLI is having connection issues. Use the SQL Editor instead:

### Step 1: Open Supabase SQL Editor

**Direct Link**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql

Or navigate:
1. Go to: https://supabase.com/dashboard
2. Select project: `vpysqshhafthuxvokwqj`
3. Click "SQL Editor" in left sidebar
4. Click "New Query"

### Step 2: Copy Migration SQL

**File Location**: 
```
supabase/migrations/20250130000000_create_lender_directory.sql
```

**Or copy from here** (full migration):

```sql
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
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
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

-- ========================================
-- 2. CREATE LENDERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS lenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership & Integration
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Public Fields (Consumer-Facing)
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  highlights TEXT[],
  
  -- Public Qualification Criteria
  min_fico_score INTEGER CHECK (min_fico_score >= 300 AND min_fico_score <= 850),
  max_ltv DECIMAL(5,2) CHECK (max_ltv >= 0 AND max_ltv <= 100),
  max_loan_amount BIGINT CHECK (max_loan_amount > 0),
  states_available TEXT[] DEFAULT '{}',
  
  -- Gated Fields (Broker Member Portal Only)
  detailed_program_data JSONB DEFAULT '{}',
  special_features JSONB DEFAULT '{}',
  internal_notes TEXT,
  program_specifics JSONB DEFAULT '{}',
  
  -- Publication Status
  is_published BOOLEAN DEFAULT FALSE,
  publication_notes TEXT,
  
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

-- Full-text search: Create generated column for search
ALTER TABLE lenders ADD COLUMN IF NOT EXISTS search_text TEXT GENERATED ALWAYS AS (
  COALESCE(name, '') || ' ' || 
  COALESCE(description, '') || ' ' || 
  COALESCE(array_to_string(highlights, ' '), '')
) STORED;

-- Full-text search index (commented out - can be added later if needed)
-- The generated column search_text can be used for LIKE/ILIKE queries
-- For full-text search, create index separately after migration:
-- CREATE INDEX idx_lenders_search ON lenders USING gin(to_tsvector('simple', search_text));

-- GIN index for JSONB fields (gated data)
CREATE INDEX IF NOT EXISTS idx_lenders_detailed_data ON lenders USING gin(detailed_program_data);
CREATE INDEX IF NOT EXISTS idx_lenders_special_features ON lenders USING gin(special_features);
CREATE INDEX IF NOT EXISTS idx_lenders_program_specifics ON lenders USING gin(program_specifics);

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
  public_features TEXT[],
  
  -- Gated Fields (Broker Member Portal Only)
  detailed_requirements JSONB DEFAULT '{}',
  special_conditions JSONB DEFAULT '{}',
  internal_notes TEXT,
  
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

-- ========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY lenders_public_select ON lenders
  FOR SELECT
  USING (is_published = TRUE);

CREATE POLICY lenders_user_manage ON lenders
  FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE lender_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY lender_programs_public_select ON lender_programs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lenders 
      WHERE lenders.id = lender_programs.lender_id 
      AND lenders.is_published = TRUE
    )
  );

CREATE POLICY lender_programs_user_manage ON lender_programs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lenders 
      WHERE lenders.id = lender_programs.lender_id 
      AND lenders.user_id = auth.uid()
    )
  );

-- ========================================
-- 5. CREATE HELPER VIEWS
-- ========================================

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

CREATE OR REPLACE VIEW lenders_with_programs_gated AS
SELECT 
  l.*,
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

-- ========================================
-- 6. POPULATE LOAN PROGRAMS (Reference Data)
-- ========================================

INSERT INTO loan_programs (name, slug, category, description, display_order) VALUES
('FHA', 'fha', 'GOVERNMENT', 'Federal Housing Administration loans for first-time homebuyers and low-to-moderate income borrowers', 1),
('VA', 'va', 'GOVERNMENT', 'Veterans Affairs loans for eligible veterans, active-duty service members, and surviving spouses', 2),
('USDA', 'usda', 'GOVERNMENT', 'USDA Rural Development loans for rural and suburban homebuyers', 3),
('Conventional', 'conventional', 'CONVENTIONAL', 'Conventional conforming loans backed by Fannie Mae and Freddie Mac', 4),
('High Balance', 'high-balance', 'CONVENTIONAL', 'High balance conforming loans for high-cost areas', 5),
('HomeReady', 'homeready', 'CONVENTIONAL', 'Fannie Mae HomeReady program for low-to-moderate income borrowers', 6),
('Home Possible', 'home-possible', 'CONVENTIONAL', 'Freddie Mac Home Possible program for low-to-moderate income borrowers', 7),
('DSCR', 'dscr', 'NON_QM', 'Debt Service Coverage Ratio loans for investment properties', 8),
('Bank Statement', 'bank-statement', 'NON_QM', 'Bank statement loans for self-employed borrowers', 9),
('Asset Depletion', 'asset-depletion', 'NON_QM', 'Asset depletion loans using assets to qualify', 10),
('ITIN', 'itin', 'NON_QM', 'ITIN loans for borrowers without Social Security numbers', 11),
('Foreign National', 'foreign-national', 'NON_QM', 'Foreign national loans for non-US residents', 12),
('No Ratio', 'no-ratio', 'NON_QM', 'No ratio loans that don''t require debt-to-income calculation', 13),
('VOE Only', 'voe-only', 'NON_QM', 'Verification of Employment only loans', 14),
('1099 Only', '1099-only', 'NON_QM', '1099-only income documentation loans', 15),
('P&L Only', 'pl-only', 'NON_QM', 'Profit & Loss statement only loans', 16),
('Jumbo', 'jumbo', 'JUMBO', 'Jumbo loans above conforming loan limits', 17),
('Super Jumbo', 'super-jumbo', 'JUMBO', 'Super jumbo loans for high-value properties', 18),
('Commercial', 'commercial', 'COMMERCIAL', 'Commercial real estate loans', 19),
('Multifamily', 'multifamily', 'COMMERCIAL', 'Multifamily property loans (5+ units)', 20),
('Mixed Use', 'mixed-use', 'COMMERCIAL', 'Mixed-use commercial and residential properties', 21),
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
```

### Step 3: Execute

1. **Paste** the entire SQL above into the SQL Editor
2. **Click "Run"** button (or press Cmd/Ctrl + Enter)
3. **Wait** for execution to complete (10-30 seconds)
4. **Verify** success message appears

### Step 4: Verify Migration

Run this in the SQL Editor to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lenders', 'loan_programs', 'lender_programs')
ORDER BY table_name;

-- Check loan programs count (should be 30)
SELECT COUNT(*) as program_count FROM loan_programs;

-- Check views exist
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'lenders%'
ORDER BY table_name;
```

**Expected Results**:
- ✅ 3 tables: `lenders`, `loan_programs`, `lender_programs`
- ✅ 30 loan programs
- ✅ 3 views: `lenders_with_programs_public`, `lenders_with_programs_gated`, `loan_programs_with_counts`

---

## ✅ After Migration

Once migration is complete:

1. **Verify Setup**: `node scripts/verify-lender-directory-setup.js`
2. **Test Import**: `npm run import-lenders:dry-run`
3. **Import Data**: `npm run import-lenders`

---

**Status**: ✅ Ready to Execute  
**Method**: SQL Editor (Most Reliable)


