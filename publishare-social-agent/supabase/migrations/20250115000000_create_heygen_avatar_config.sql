-- ========================================
-- CREATE HEYGEN AVATAR CONFIGURATION TABLE
-- ========================================
-- Migration: create_heygen_avatar_config
-- Purpose: Store HeyGen avatar configuration for each brand/site
-- Supports single avatar persona per brand architecture
-- 
-- Architecture: Articles → Sites → Avatars
-- - Articles link to sites via site_id (existing foreign key)
-- - Sites link to avatars via this table (site_id foreign key)
-- - Articles inherit avatar through site relationship
-- - This maintains "one avatar per brand" requirement
-- ========================================

-- Create HeyGen avatar configuration table
CREATE TABLE IF NOT EXISTS heygen_avatar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Avatar Configuration
  avatar_id VARCHAR(255) NOT NULL, -- HeyGen avatar ID from API
  avatar_type VARCHAR(20) NOT NULL DEFAULT 'photo', -- 'photo' or 'video'
  avatar_name VARCHAR(255), -- Display name for the avatar
  preview_image_url TEXT, -- Avatar preview image URL
  
  -- Voice Configuration
  voice_id VARCHAR(255), -- HeyGen voice ID or ElevenLabs voice ID
  voice_name VARCHAR(255), -- Display name for the voice
  voice_provider VARCHAR(20) DEFAULT 'heygen', -- 'heygen' or 'elevenlabs'
  
  -- Training Status (for photo avatars)
  training_status VARCHAR(50) DEFAULT 'not_required', -- 'not_required', 'pending', 'training', 'completed', 'failed'
  training_job_id VARCHAR(255), -- HeyGen training job ID
  training_started_at TIMESTAMP WITH TIME ZONE,
  training_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT, -- Admin notes about avatar selection
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(site_id) -- One avatar per site/brand (enforces single avatar persona requirement)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_heygen_avatar_config_site_id ON heygen_avatar_config(site_id);
CREATE INDEX IF NOT EXISTS idx_heygen_avatar_config_active ON heygen_avatar_config(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_heygen_avatar_config_training_status ON heygen_avatar_config(training_status);

-- Add RLS policies
ALTER TABLE heygen_avatar_config ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view avatar configs
CREATE POLICY "Authenticated users can view heygen avatar configs"
  ON heygen_avatar_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can manage avatar configs
CREATE POLICY "Service role can manage heygen avatar configs"
  ON heygen_avatar_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE heygen_avatar_config IS 'HeyGen avatar configuration for each brand/site. Supports single avatar persona per brand architecture. Articles inherit avatar through sites relationship.';
COMMENT ON COLUMN heygen_avatar_config.site_id IS 'Foreign key to sites table - identifies which brand this avatar belongs to. UNIQUE constraint ensures one avatar per brand.';
COMMENT ON COLUMN heygen_avatar_config.avatar_id IS 'HeyGen API avatar ID - obtained from GET /v2/avatars endpoint';
COMMENT ON COLUMN heygen_avatar_config.avatar_type IS 'Type of avatar: photo (trained) or video (pre-built)';
COMMENT ON COLUMN heygen_avatar_config.voice_id IS 'Voice ID from HeyGen or ElevenLabs API';
COMMENT ON COLUMN heygen_avatar_config.training_status IS 'Status of photo avatar training if avatar_type is photo';
-- UNIQUE(site_id) constraint enforces single avatar persona per brand requirement

-- ========================================
-- HELPER VIEW: Article Avatar Lookup
-- ========================================
-- This view makes it easy to query articles with their avatar config
-- Example: SELECT * FROM article_avatar_lookup WHERE article_id = 'uuid'
-- ========================================

CREATE OR REPLACE VIEW article_avatar_lookup AS
SELECT 
  a.id AS article_id,
  a.title AS article_title,
  a.site_id,
  s.name AS site_name,
  s.domain AS site_domain,
  hac.id AS avatar_config_id,
  hac.avatar_id,
  hac.avatar_name,
  hac.avatar_type,
  hac.voice_id,
  hac.voice_name,
  hac.voice_provider,
  hac.is_active AS avatar_active,
  hac.training_status
FROM articles a
JOIN sites s ON a.site_id = s.id
LEFT JOIN heygen_avatar_config hac ON s.id = hac.site_id AND hac.is_active = true;

COMMENT ON VIEW article_avatar_lookup IS 'Convenience view to lookup avatar configuration for any article. Shows article → site → avatar relationship.';
