-- ========================================
-- SETUP HOMESIMPLE SITE CONFIGURATION
-- ========================================
-- Migration: setup_homesimple_site_config
-- Purpose: Update HomeSimple site with full Content Agent configuration
-- ========================================

-- Update HomeSimple site with full configuration
UPDATE sites 
SET 
  description = 'Home services marketplace connecting homeowners with trusted local professionals',
  article_route_path = '/articles',
  config = '{
    "content_agent": {
      "vertical_theme": "Home services, home improvement, home maintenance, HVAC, plumbing, electrical, roofing, remodeling, painting, pest control, windows, doors, flooring, landscaping, home repair, contractor services, home renovation, emergency home services, local contractors, licensed professionals, home warranties, seasonal maintenance",
      "tone_guidelines": "Helpful, trustworthy, local, professional. Speak to homeowners as neighbors, not salespeople. Focus on solving problems, not selling services. Emphasize local expertise, quality workmanship, and peace of mind. No high-pressure tactics, no false urgency. Be informative and educational.",
      "script_structure": {
        "short_form": {
          "hook_max_words": 12,
          "beats_count": 3,
          "cta_format": "Find trusted local pros at HomeSimple.org"
        },
        "long_form": {
          "hook_max_words": 15,
          "sections_count": 5,
          "tips_count": 5,
          "cta_format": "Get connected with local home service professionals at HomeSimple.org"
        }
      },
      "overlay_rules": {
        "max_words": 10,
        "no_punctuation": false,
        "readable_in_seconds": 2,
        "one_idea_max": true
      },
      "safety_rules": [
        "No guaranteed pricing without inspection",
        "No specific contractor recommendations without disclaimers",
        "No misleading urgency tactics",
        "Always mention that costs vary by location and project scope",
        "No false claims about service availability",
        "Always include licensing and insurance context",
        "No guaranteed same-day service without verification",
        "Always mention that quotes are estimates until inspection"
      ],
      "storytelling_guidelines": {
        "use": ["homeowner scenarios", "local service stories", "home improvement context", "seasonal maintenance tips", "emergency service situations", "quality workmanship examples", "local neighborhood references", "real project examples"],
        "avoid": ["fictional testimonials", "exaggeration", "pushy sales language", "clickbait", "urgency tactics", "guarantee language", "generic contractor claims", "false scarcity"]
      },
      "competitor_differentiation": "Unlike generic home service directories, HomeSimple focuses on connecting homeowners with verified local professionals, emphasizing quality, trust, and local expertise over price competition. We prioritize homeowner education and informed decision-making."
    }
  }'::jsonb,
  updated_at = NOW()
WHERE id = 'homesimple';

-- Verify update
SELECT 
  id,
  name,
  domain,
  description,
  article_route_path,
  is_active,
  config->'content_agent'->>'vertical_theme' as vertical_theme
FROM sites
WHERE id = 'homesimple';

-- Add comment
COMMENT ON COLUMN sites.config IS 'Site configuration including Content Agent Prompt rules, stored as JSONB. Access via config->''content_agent'' for Content Agent configuration. HomeSimple configured for home services marketplace.';

