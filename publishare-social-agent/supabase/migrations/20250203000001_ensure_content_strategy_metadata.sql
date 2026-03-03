-- ========================================
-- ENSURE CONTENT_STRATEGY TABLE HAS METADATA COLUMN
-- ========================================
-- Migration: ensure_content_strategy_metadata
-- Purpose: Ensure content_strategy table has metadata JSONB column for local page data
-- ========================================

-- Add metadata column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_strategy' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE content_strategy ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_content_strategy_metadata ON content_strategy USING GIN (metadata);
    RAISE NOTICE 'Added metadata column to content_strategy table';
  END IF;
END $$;

-- Add index for common metadata queries (city, state, vertical)
CREATE INDEX IF NOT EXISTS idx_content_strategy_metadata_city 
  ON content_strategy ((metadata->>'city')) 
  WHERE metadata->>'city' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_strategy_metadata_state 
  ON content_strategy ((metadata->>'state')) 
  WHERE metadata->>'state' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_strategy_metadata_vertical 
  ON content_strategy ((metadata->>'vertical')) 
  WHERE metadata->>'vertical' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_strategy_metadata_page_type 
  ON content_strategy ((metadata->>'page_type')) 
  WHERE metadata->>'page_type' IS NOT NULL;

-- Composite index for local page queries
CREATE INDEX IF NOT EXISTS idx_content_strategy_local_page 
  ON content_strategy (site_id, (metadata->>'city'), (metadata->>'state'), (metadata->>'vertical'))
  WHERE metadata->>'page_type' = 'local_page';

-- Add comment for documentation
COMMENT ON COLUMN content_strategy.metadata IS 'JSONB column for storing flexible metadata. For local pages, should include: city, state, vertical, page_type, domain_id, phone_number, service_areas, call_routing_configured';

