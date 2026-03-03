-- Migration: Add GIN indexes for JSONB business lending queries
-- Purpose: Optimize queries on business lending data stored in special_features JSONB

-- Index for business lending object queries
CREATE INDEX IF NOT EXISTS idx_lenders_business_lending_gin 
ON lenders USING GIN ((special_features->'business_lending'))
WHERE special_features->'business_lending' IS NOT NULL;

-- Index for business lending availability (most common query)
CREATE INDEX IF NOT EXISTS idx_lenders_offers_business_lending 
ON lenders ((special_features->'business_lending'->>'available'))
WHERE (special_features->'business_lending'->>'available')::boolean = true;

-- Index for business lending loan types (array queries)
CREATE INDEX IF NOT EXISTS idx_lenders_business_loan_types_gin 
ON lenders USING GIN ((special_features->'business_lending'->'loan_types'))
WHERE special_features->'business_lending'->'loan_types' IS NOT NULL;

-- Index for website info queries
CREATE INDEX IF NOT EXISTS idx_lenders_website_info_gin 
ON lenders USING GIN ((special_features->'website_info'))
WHERE special_features->'website_info' IS NOT NULL;

-- Index for detailed program data queries (compensation, fees)
CREATE INDEX IF NOT EXISTS idx_lenders_detailed_program_data_gin 
ON lenders USING GIN (detailed_program_data)
WHERE detailed_program_data != '{}'::jsonb;

-- Index for program specifics queries
CREATE INDEX IF NOT EXISTS idx_lenders_program_specifics_gin 
ON lenders USING GIN (program_specifics)
WHERE program_specifics != '{}'::jsonb;

-- Add comments
COMMENT ON INDEX idx_lenders_business_lending_gin IS 'GIN index for business_lending object queries in special_features JSONB';
COMMENT ON INDEX idx_lenders_offers_business_lending IS 'Index for filtering lenders that offer business lending';
COMMENT ON INDEX idx_lenders_business_loan_types_gin IS 'GIN index for business loan types array queries';
COMMENT ON INDEX idx_lenders_website_info_gin IS 'GIN index for website_info queries in special_features JSONB';
COMMENT ON INDEX idx_lenders_detailed_program_data_gin IS 'GIN index for detailed_program_data JSONB queries';
COMMENT ON INDEX idx_lenders_program_specifics_gin IS 'GIN index for program_specifics JSONB queries';


