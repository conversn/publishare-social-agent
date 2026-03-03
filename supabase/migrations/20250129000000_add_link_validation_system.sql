-- Link Validation System Migration
-- Adds support for tracking and validating internal links

-- 1. Add article_route_path to sites table (or config)
-- This stores the frontend route pattern for articles per site
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS article_route_path VARCHAR(255) DEFAULT '/articles';

-- Update existing sites with their route paths
UPDATE sites 
SET article_route_path = '/library' 
WHERE id = 'rateroots';

UPDATE sites 
SET article_route_path = '/articles' 
WHERE id = 'seniorsimple';

-- 2. Create link_validation_results table
CREATE TABLE IF NOT EXISTS link_validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    link_url TEXT NOT NULL,
    link_text TEXT,
    target_article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    is_valid BOOLEAN NOT NULL DEFAULT false,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'valid', 'broken', 'pending', 'repaired'
    error_message TEXT,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate validations
    UNIQUE(article_id, link_url)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_link_validation_article_id ON link_validation_results(article_id);
CREATE INDEX IF NOT EXISTS idx_link_validation_status ON link_validation_results(validation_status);
CREATE INDEX IF NOT EXISTS idx_link_validation_target_article ON link_validation_results(target_article_id);
CREATE INDEX IF NOT EXISTS idx_link_validation_is_valid ON link_validation_results(is_valid);

-- 3. Create view for broken links summary
CREATE OR REPLACE VIEW broken_links_summary AS
SELECT 
    a.site_id,
    COUNT(*) as broken_links_count,
    COUNT(DISTINCT lvr.article_id) as articles_with_broken_links
FROM link_validation_results lvr
JOIN articles a ON a.id = lvr.article_id
WHERE lvr.is_valid = false 
  AND lvr.validation_status = 'broken'
GROUP BY a.site_id;

-- 4. Add comment
COMMENT ON TABLE link_validation_results IS 'Tracks validation status of internal links in articles';
COMMENT ON COLUMN sites.article_route_path IS 'Frontend route pattern for articles (e.g., /articles, /library)';




