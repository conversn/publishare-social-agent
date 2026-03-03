-- ========================================
-- ADD CONTENT AGENT CONFIGURATION TO SITES
-- ========================================
-- Migration: add_content_agent_config
-- Purpose: Add Content Agent Prompt configuration to each site's config JSONB
-- Stores vertical-specific tone, themes, script structure, and safety rules
-- ========================================

-- Add Content Agent configuration to each site's config JSONB
-- This stores the Content Agent Prompt rules per vertical

UPDATE sites
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{content_agent}',
  CASE 
    WHEN id = 'seniorsimple' THEN '{
      "vertical_theme": "Retirement, long-term care, annuities, Medicare, longevity, safety, peace of mind",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {
          "hook_max_words": 10,
          "beats_count": 3,
          "cta_format": "Learn more at {domain}"
        },
        "long_form": {
          "hook_max_words": 12,
          "sections_count": 5,
          "tips_count": 5,
          "cta_format": "See the full guide at {domain}"
        }
      },
      "overlay_rules": {
        "max_words": 8,
        "no_punctuation": true,
        "readable_in_seconds": 1,
        "one_idea_max": true
      },
      "safety_rules": [
        "No financial guarantees",
        "No market predictions",
        "No personalized advice",
        "No fear-driven language"
      ],
      "storytelling_guidelines": {
        "use": ["history", "law", "behavior", "psychology", "economics", "metaphors"],
        "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]
      }
    }'::jsonb
    
    WHEN id = 'mortgagesimple' THEN '{
      "vertical_theme": "Loans, rates, first-time buyers, VA, FHA, HELOCs, underwriting basics",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    WHEN id = 'lendingsimple' THEN '{
      "vertical_theme": "Business loans, credit lines, term loans, SBA, factoring, fintech",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    WHEN id = 'creditrepairsimple' THEN '{
      "vertical_theme": "Repair, utilization, timing, bureaus, FICO logic, disputing myths",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    WHEN id = 'parentsimple' THEN '{
      "vertical_theme": "College planning, parent finances, scholarships, FAFSA, mentorship",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    WHEN id = 'smallbizsimple' THEN '{
      "vertical_theme": "Taxes, bookkeeping, payroll, credits, growth strategy, cost savings",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    WHEN id = 'scalingsimple' THEN '{
      "vertical_theme": "Systems, operations, delegating, automation, hiring, capital stack",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    WHEN id = 'rateroots' THEN '{
      "vertical_theme": "Mortgage rates, rate comparison, loan types, refinancing",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
    
    ELSE '{
      "vertical_theme": "Financial education and guidance",
      "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
      "script_structure": {
        "short_form": {"hook_max_words": 10, "beats_count": 3, "cta_format": "Learn more at {domain}"},
        "long_form": {"hook_max_words": 12, "sections_count": 5, "tips_count": 5, "cta_format": "See the full guide at {domain}"}
      },
      "overlay_rules": {"max_words": 8, "no_punctuation": true, "readable_in_seconds": 1, "one_idea_max": true},
      "safety_rules": ["No financial guarantees", "No market predictions", "No personalized advice", "No fear-driven language"],
      "storytelling_guidelines": {"use": ["history", "law", "behavior", "psychology", "economics", "metaphors"], "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]}
    }'::jsonb
  END
)
WHERE config->'content_agent' IS NULL;

-- Add comment
COMMENT ON COLUMN sites.config IS 'Site configuration including Content Agent Prompt rules, stored as JSONB. Access via config->''content_agent'' for Content Agent configuration.';


