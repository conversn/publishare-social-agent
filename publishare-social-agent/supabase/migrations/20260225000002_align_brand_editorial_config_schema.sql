-- ========================================
-- ALIGN BRAND EDITORIAL CONFIG SCHEMA
-- ========================================
-- Migration: align_brand_editorial_config_schema
-- Purpose: Add exact schema fields requested for editorial pipeline
-- ========================================

-- Add exact requested fields (idempotent).
ALTER TABLE brand_editorial_config
  ADD COLUMN IF NOT EXISTS editorial_voice TEXT,
  ADD COLUMN IF NOT EXISTS image_style_prompt TEXT,
  ADD COLUMN IF NOT EXISTS daily_themes JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS framework_ids UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS persona_id UUID;

-- Add FK only if personas table exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'personas'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'brand_editorial_config'
        AND constraint_name = 'fk_brand_editorial_config_persona_id'
    ) THEN
      ALTER TABLE brand_editorial_config
        ADD CONSTRAINT fk_brand_editorial_config_persona_id
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_persona_id
  ON brand_editorial_config(persona_id);
CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_framework_ids
  ON brand_editorial_config USING GIN(framework_ids);
CREATE INDEX IF NOT EXISTS idx_brand_editorial_config_daily_themes
  ON brand_editorial_config USING GIN(daily_themes);

-- Backfill editorial_voice from existing fields.
UPDATE brand_editorial_config
SET editorial_voice = COALESCE(
  editorial_voice,
  voice_style->>'editorial_voice',
  voice_style->>'brand_voice',
  voice_style->>'tone_guidelines',
  ''
)
WHERE editorial_voice IS NULL OR editorial_voice = '';

-- Backfill image style prompt from existing fields.
UPDATE brand_editorial_config
SET image_style_prompt = COALESCE(
  image_style_prompt,
  voice_style->>'image_prompt_style',
  image_prompt_style,
  'modern'
)
WHERE image_style_prompt IS NULL OR image_style_prompt = '';

-- Backfill daily themes from existing daily_theme_map.
UPDATE brand_editorial_config
SET daily_themes = COALESCE(
  NULLIF(daily_themes, '{}'::jsonb),
  daily_theme_map,
  '{}'::jsonb
)
WHERE daily_themes IS NULL OR daily_themes = '{}'::jsonb;

-- Backfill framework_ids from legacy framework_rotation by joining framework keys.
WITH expanded AS (
  SELECT
    bec.id AS config_id,
    UPPER(TRIM(value::text, '"')) AS framework_key
  FROM brand_editorial_config bec
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(bec.framework_rotation, '[]'::jsonb)) value
),
mapped AS (
  SELECT
    e.config_id,
    array_agg(swf.id) AS framework_ids
  FROM expanded e
  JOIN brand_editorial_config bec ON bec.id = e.config_id
  JOIN social_writing_frameworks swf
    ON swf.site_id = bec.site_id
   AND UPPER(swf.framework_key) = e.framework_key
   AND swf.is_active = true
  GROUP BY e.config_id
)
UPDATE brand_editorial_config bec
SET framework_ids = COALESCE(mapped.framework_ids, ARRAY[]::UUID[])
FROM mapped
WHERE bec.id = mapped.config_id
  AND (bec.framework_ids IS NULL OR cardinality(bec.framework_ids) = 0);

COMMENT ON COLUMN brand_editorial_config.editorial_voice IS 'Detailed writing style guidelines for social copy.';
COMMENT ON COLUMN brand_editorial_config.image_style_prompt IS 'Base image prompt style for brand-consistent image generation.';
COMMENT ON COLUMN brand_editorial_config.daily_themes IS 'Mon-Sun theme rotation used by content and social workflows.';
COMMENT ON COLUMN brand_editorial_config.framework_ids IS 'UUID list of social_writing_frameworks to rotate/select from.';
COMMENT ON COLUMN brand_editorial_config.persona_id IS 'Optional link to personas table for writing voice and persona prompt.';
