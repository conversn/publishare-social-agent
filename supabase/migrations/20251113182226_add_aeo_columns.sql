-- ========================================
-- ADD AEO COLUMNS TO ARTICLES TABLE
-- ========================================
-- Migration: add_aeo_columns
-- Purpose: Add Answer Engine Optimization (AEO) specific columns to articles table
-- ========================================

-- Add AEO-specific columns to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS aeo_summary TEXT, -- Direct answer (first 100 words)
ADD COLUMN IF NOT EXISTS aeo_answer_first BOOLEAN DEFAULT FALSE, -- Validates answer is in first 100 words
ADD COLUMN IF NOT EXISTS content_structure JSONB, -- Stores H1/H2/H3 hierarchy
ADD COLUMN IF NOT EXISTS speakable_summary TEXT, -- 280-350 char voice-optimized summary
ADD COLUMN IF NOT EXISTS schema_markup JSONB, -- Generated schema in JSON-LD format
ADD COLUMN IF NOT EXISTS schema_validated BOOLEAN DEFAULT FALSE, -- Schema validation status
ADD COLUMN IF NOT EXISTS aeo_content_type VARCHAR(50), -- 'definition', 'how-to', 'comparison', 'data', 'formula'
ADD COLUMN IF NOT EXISTS citations JSONB, -- Array of citations/sources
ADD COLUMN IF NOT EXISTS data_points JSONB; -- Key statistics/data points

-- Add indexes for AEO content type filtering
CREATE INDEX IF NOT EXISTS idx_articles_aeo_content_type ON articles(aeo_content_type);
CREATE INDEX IF NOT EXISTS idx_articles_aeo_answer_first ON articles(aeo_answer_first) WHERE aeo_answer_first = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN articles.aeo_summary IS 'First 100 words containing the direct answer to the query';
COMMENT ON COLUMN articles.aeo_answer_first IS 'Validates that the answer is present in the first 100 words';
COMMENT ON COLUMN articles.content_structure IS 'JSONB structure containing H1/H2/H3 hierarchy and content organization';
COMMENT ON COLUMN articles.speakable_summary IS '280-350 character summary optimized for voice search';
COMMENT ON COLUMN articles.schema_markup IS 'Generated schema.org JSON-LD markup for the article';
COMMENT ON COLUMN articles.schema_validated IS 'Whether the schema has been validated against schema.org';
COMMENT ON COLUMN articles.aeo_content_type IS 'Type of AEO content: definition, how-to, comparison, data, formula';
COMMENT ON COLUMN articles.citations IS 'Array of citations and sources used in the article';
COMMENT ON COLUMN articles.data_points IS 'Key statistics and data points extracted from the content';

