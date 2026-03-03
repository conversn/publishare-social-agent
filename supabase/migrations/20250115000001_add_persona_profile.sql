-- ========================================
-- ADD PERSONA PROFILE TO HEYGEN AVATAR CONFIG
-- ========================================
-- Migration: add_persona_profile
-- Purpose: Add Expert Guru Creator persona profile to avatar config
-- Stores complete character biography, voice, writing style, backstory
-- Used for both content generation and video persona
-- ========================================

-- Add persona_profile JSONB column
ALTER TABLE heygen_avatar_config
ADD COLUMN IF NOT EXISTS persona_profile JSONB DEFAULT '{}';

-- Add index for persona profile queries (if needed for filtering)
-- CREATE INDEX IF NOT EXISTS idx_heygen_avatar_config_persona_profile 
-- ON heygen_avatar_config USING GIN (persona_profile);

-- Add comment
COMMENT ON COLUMN heygen_avatar_config.persona_profile IS 'Expert Guru Creator persona profile - complete character biography, voice traits, writing style, backstory, personality. Used for content generation (writing in persona voice) and video generation (avatar characterization). Stored as JSONB following Expert Guru Creator template structure.';

-- ========================================
-- EXAMPLE PERSONA PROFILE STRUCTURE
-- ========================================
-- This is a reference structure - actual data will be populated via Expert Guru Creator
-- 
-- {
--   "name": "Character Name",
--   "age": 42,
--   "physical": { "height", "weight", "hair_color", "eye_color", "distinguishing_traits" },
--   "background": { "birth_date", "birthplace", "education", "upbringing", "work_experience" },
--   "personality": { "strongest_traits", "weakest_traits", "sees_self_as", "seen_by_others_as", "sense_of_humor", "basic_nature" },
--   "voice": { "writing_style", "speech_patterns", "dialog_tags", "tone", "worldview", "philosophy" },
--   "content_approach": { "expertise_areas", "writing_angle", "emotional_hooks", "storytelling_style" },
--   "relationships": { "marital_status", "best_friend", "mentors" },
--   "motivations": { "present_problem", "greatest_fear", "ambitions" },
--   "brand_alignment": { "one_line_characterization", "most_important_trait" }
-- }
-- ========================================


