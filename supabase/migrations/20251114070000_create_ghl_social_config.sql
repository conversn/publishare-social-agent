-- ========================================
-- CREATE GHL SOCIAL MEDIA CONFIG TABLE
-- ========================================
-- Migration: create_ghl_social_config
-- Purpose: Store GoHighLevel API credentials and configuration for social media posting
-- ========================================

-- Create GHL social media configuration table
CREATE TABLE IF NOT EXISTS ghl_social_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) REFERENCES sites(id) ON DELETE CASCADE,
  profile_name VARCHAR(100) NOT NULL, -- e.g., 'Keenan Shaw', 'Keenan Shaw', 'CallReady'
  ghl_api_key TEXT NOT NULL, -- JWT token for GHL API
  ghl_location_id VARCHAR(100) NOT NULL, -- GHL location ID
  enabled BOOLEAN DEFAULT true,
  platforms JSONB DEFAULT '[]'::jsonb, -- Array of enabled platforms: ['facebook', 'linkedin', 'twitter', 'instagram']
  brand_voice TEXT, -- Brand voice description for content generation
  content_themes JSONB DEFAULT '[]'::jsonb, -- Array of content themes
  default_schedule_hours INTEGER DEFAULT 1, -- Default hours to schedule posts ahead
  auto_post BOOLEAN DEFAULT false, -- Auto-post when articles are published
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, profile_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ghl_social_config_site_id ON ghl_social_config(site_id);
CREATE INDEX IF NOT EXISTS idx_ghl_social_config_enabled ON ghl_social_config(enabled);
CREATE INDEX IF NOT EXISTS idx_ghl_social_config_profile ON ghl_social_config(profile_name);

-- Add RLS policies
ALTER TABLE ghl_social_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view configs for their sites
-- Note: Sites table may not have user_id, so we'll use a simpler policy
-- Service role can manage, authenticated users can view
CREATE POLICY "Authenticated users can view ghl configs"
  ON ghl_social_config
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy: Service role can do everything (for edge functions)
CREATE POLICY "Service role can manage ghl configs"
  ON ghl_social_config
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE ghl_social_config IS 'GoHighLevel social media posting configuration per site/profile';

