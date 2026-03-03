-- ========================================
-- CREATE BRAND EDITORIAL CONFIG TABLES
-- ========================================
-- Migration: create_brand_editorial_config
-- Purpose: Consolidate social voice, themes, framework rotation, and platform rules
-- ========================================

CREATE TABLE IF NOT EXISTS social_writing_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) REFERENCES sites(id) ON DELETE CASCADE,
  framework_key VARCHAR(50) NOT NULL,
  framework_name VARCHAR(100) NOT NULL,
  prompt_template TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, framework_key)
);

CREATE TABLE IF NOT EXISTS brand_editorial_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  profile_name VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  default_schedule_hours INTEGER DEFAULT 1,
  platforms JSONB DEFAULT '[]'::jsonb,
  voice_style JSONB DEFAULT '{}'::jsonb,
  image_prompt_style TEXT,
  daily_theme_map JSONB DEFAULT '{}'::jsonb,
  framework_rotation JSONB DEFAULT '[]'::jsonb,
  platform_rules JSONB DEFAULT '{}'::jsonb,
  safety_rules JSONB DEFAULT '[]'::jsonb,
  editorial_calendar JSONB DEFAULT '[]'::jsonb,
  source_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (site_id, profile_name)
);

CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_site
  ON brand_editorial_config(site_id);
CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_enabled
  ON brand_editorial_config(enabled);
CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_platform_rules
  ON brand_editorial_config USING GIN(platform_rules);
CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_daily_theme_map
  ON brand_editorial_config USING GIN(daily_theme_map);

CREATE INDEX IF NOT EXISTS idx_social_writing_frameworks_site
  ON social_writing_frameworks(site_id);
CREATE INDEX IF NOT EXISTS idx_social_writing_frameworks_active
  ON social_writing_frameworks(is_active);

ALTER TABLE brand_editorial_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_writing_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view brand editorial config"
  ON brand_editorial_config
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage brand editorial config"
  ON brand_editorial_config
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view social writing frameworks"
  ON social_writing_frameworks
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage social writing frameworks"
  ON social_writing_frameworks
  FOR ALL
  USING (auth.role() = 'service_role');

-- Seed default frameworks per site
INSERT INTO social_writing_frameworks (site_id, framework_key, framework_name, description, is_active)
SELECT id, 'PAS', 'Problem Agitate Solution', 'Lead with the pain point, amplify urgency, then resolve.', true
FROM sites
ON CONFLICT (site_id, framework_key) DO NOTHING;

INSERT INTO social_writing_frameworks (site_id, framework_key, framework_name, description, is_active)
SELECT id, 'AIDA', 'Attention Interest Desire Action', 'Capture attention, build desire, close with CTA.', true
FROM sites
ON CONFLICT (site_id, framework_key) DO NOTHING;

INSERT INTO social_writing_frameworks (site_id, framework_key, framework_name, description, is_active)
SELECT id, 'HORMOZI', 'Hormozi Value Lens', 'Frame outcome, reduce time delay, reduce effort and risk.', true
FROM sites
ON CONFLICT (site_id, framework_key) DO NOTHING;

-- Backfill consolidated editorial config from existing ghl_social_config + sites.config
INSERT INTO brand_editorial_config (
  site_id,
  profile_name,
  enabled,
  default_schedule_hours,
  platforms,
  voice_style,
  daily_theme_map,
  framework_rotation,
  platform_rules,
  safety_rules,
  source_config
)
SELECT
  g.site_id,
  g.profile_name,
  COALESCE(g.enabled, true),
  COALESCE(g.default_schedule_hours, 1),
  COALESCE(g.platforms, '[]'::jsonb),
  jsonb_build_object(
    'brand_voice', COALESCE(g.brand_voice, ''),
    'tone_guidelines', COALESCE(s.config->'content_agent'->>'tone_guidelines', '')
  ),
  CASE
    WHEN jsonb_typeof(g.content_themes) = 'array' AND jsonb_array_length(g.content_themes) > 0
      THEN jsonb_build_object(
        'monday', g.content_themes->0,
        'tuesday', g.content_themes->0,
        'wednesday', g.content_themes->0,
        'thursday', g.content_themes->0,
        'friday', g.content_themes->0
      )
    ELSE '{}'::jsonb
  END,
  '["PAS","AIDA","HORMOZI"]'::jsonb,
  '{}'::jsonb,
  COALESCE(s.config->'content_agent'->'safety_rules', '[]'::jsonb),
  jsonb_build_object(
    'legacy', 'ghl_social_config',
    'ghl_social_config_id', g.id
  )
FROM ghl_social_config g
LEFT JOIN sites s ON s.id = g.site_id
ON CONFLICT (site_id, profile_name)
DO UPDATE SET
  enabled = EXCLUDED.enabled,
  default_schedule_hours = EXCLUDED.default_schedule_hours,
  platforms = EXCLUDED.platforms,
  voice_style = EXCLUDED.voice_style,
  daily_theme_map = EXCLUDED.daily_theme_map,
  framework_rotation = EXCLUDED.framework_rotation,
  safety_rules = EXCLUDED.safety_rules,
  source_config = EXCLUDED.source_config,
  updated_at = NOW();

COMMENT ON TABLE brand_editorial_config IS 'Consolidated brand editorial settings for social generation: voice, image style, themes, framework rotation, platform rules, and calendar.';
COMMENT ON TABLE social_writing_frameworks IS 'Reusable social copywriting frameworks per site (PAS, AIDA, Hormozi, etc.).';
