-- ========================================
-- ADD COMPARISON CONTENT CONFIGURATION
-- ========================================
-- Migration: add_comparison_content_config
-- Purpose: Add comparison content configuration to sites.config JSONB
-- Stores preferred services, comparison criteria, and editorial settings
-- ========================================

-- Add comparison content configuration to ParentSimple (Empowerly example)
UPDATE sites
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{comparison_content}',
  '{
    "preferred_service": "Empowerly",
    "preferred_service_description": "Empowerly is a leading college consulting service that combines personalized guidance with data-driven insights. They excel in helping students navigate the complex college admissions process, with a focus on finding the right fit rather than just prestigious names. Their team includes former admissions officers and counselors with deep expertise in elite college admissions.",
    "comparison_criteria": [
      "pricing and value",
      "expertise and qualifications of counselors",
      "success rates and admissions outcomes",
      "personalization and approach",
      "accessibility and support",
      "reputation and trust",
      "range of services offered",
      "technology and tools provided"
    ],
    "editorial_tone": "authoritative",
    "conclusion_style": "editorial"
  }'::jsonb
)
WHERE id = 'parentsimple';

-- Add comparison content configuration template for other sites
-- (Can be customized per site/vertical)
COMMENT ON COLUMN sites.config IS 'JSONB configuration including content_agent and comparison_content. comparison_content stores preferred services, comparison criteria, and editorial settings for comparison/list articles.';


