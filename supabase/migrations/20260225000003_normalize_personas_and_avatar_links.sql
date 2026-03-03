-- ========================================
-- NORMALIZE PERSONAS + SITE ASSIGNMENTS + AVATAR LINKS
-- ========================================
-- Purpose:
-- 1) Canonicalize requested personas and remove deprecated variants
-- 2) Support multiple personas per site via assignment table
-- 3) Keep heygen avatar rows linked to personas by FK
-- 4) Update ParentSimple avatar name (remove "Dr.")
-- ========================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Multi-persona per site support
CREATE TABLE IF NOT EXISTS public.site_persona_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  role_key text NOT NULL DEFAULT 'contributor',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, persona_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_site_persona_assignments_site
  ON public.site_persona_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_persona_assignments_persona
  ON public.site_persona_assignments(persona_id);
CREATE INDEX IF NOT EXISTS idx_site_persona_assignments_primary
  ON public.site_persona_assignments(site_id, is_primary)
  WHERE is_primary = true;

-- Ensure FK column exists on heygen avatar config
ALTER TABLE public.heygen_avatar_config
ADD COLUMN IF NOT EXISTS persona_id uuid;

ALTER TABLE public.heygen_avatar_config
DROP CONSTRAINT IF EXISTS heygen_avatar_config_persona_id_fkey;

ALTER TABLE public.heygen_avatar_config
ADD CONSTRAINT heygen_avatar_config_persona_id_fkey
FOREIGN KEY (persona_id) REFERENCES public.personas(id) ON DELETE SET NULL;

-- =========================================================
-- Canonical persona updates
-- =========================================================

-- retirement_planner => John Kelly (canonical, absorbs annuity specialist)
UPDATE public.personas
SET
  display_name = 'John Kelly',
  description = 'Retirement Planning Expert',
  category_mapping = ARRAY['Retirement Planning']::text[],
  tone_voice = COALESCE(NULLIF(tone_voice, ''), 'trustworthy_authoritative'),
  expertise_level = COALESCE(NULLIF(expertise_level, ''), 'advanced'),
  call_to_action_style = COALESCE(NULLIF(call_to_action_style, ''), 'consultation_booking'),
  updated_at = now()
WHERE name = 'retirement_planner';

INSERT INTO public.personas (
  id, name, display_name, description, category_mapping, target_audience, ai_prompt,
  content_style, tone_voice, expertise_level, call_to_action_style, user_id, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'retirement_planner', 'John Kelly', 'Retirement Planning Expert',
  ARRAY['Retirement Planning']::text[], '{}'::jsonb, '',
  '{}'::jsonb, 'trustworthy_authoritative', 'advanced', 'consultation_booking', NULL::uuid, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.personas WHERE name = 'retirement_planner'
);

-- estate_planner => Felicia Wallace
UPDATE public.personas
SET
  display_name = 'Felicia Wallace',
  description = 'Estate Planning Attorney',
  category_mapping = ARRAY['Estate Planning']::text[],
  tone_voice = COALESCE(NULLIF(tone_voice, ''), 'authoritative_clear'),
  expertise_level = COALESCE(NULLIF(expertise_level, ''), 'advanced'),
  call_to_action_style = COALESCE(NULLIF(call_to_action_style, ''), 'estate_planning_consultation'),
  updated_at = now()
WHERE name = 'estate_planner';

INSERT INTO public.personas (
  id, name, display_name, description, category_mapping, target_audience, ai_prompt,
  content_style, tone_voice, expertise_level, call_to_action_style, user_id, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'estate_planner', 'Felicia Wallace', 'Estate Planning Attorney',
  ARRAY['Estate Planning']::text[], '{}'::jsonb, '',
  '{}'::jsonb, 'authoritative_clear', 'advanced', 'estate_planning_consultation', NULL::uuid, now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.personas WHERE name = 'estate_planner'
);

-- medicare + insurance/long-term-care aligned to Sheila Wilson
UPDATE public.personas
SET
  display_name = 'Sheila Wilson',
  description = 'Medicare & Long-term Care Specialist',
  category_mapping = ARRAY['Healthcare', 'Insurance']::text[],
  tone_voice = COALESCE(NULLIF(tone_voice, ''), 'compassionate_educational'),
  expertise_level = COALESCE(NULLIF(expertise_level, ''), 'intermediate'),
  call_to_action_style = COALESCE(NULLIF(call_to_action_style, ''), 'medicare_assessment'),
  updated_at = now()
WHERE name = 'medicare_specialist';

UPDATE public.personas
SET
  display_name = 'Sheila Wilson',
  description = 'Insurance & Long-term Care Specialist',
  category_mapping = ARRAY['Insurance', 'Healthcare']::text[],
  tone_voice = COALESCE(NULLIF(tone_voice, ''), 'protective_educational'),
  expertise_level = COALESCE(NULLIF(expertise_level, ''), 'intermediate'),
  call_to_action_style = COALESCE(NULLIF(call_to_action_style, ''), 'insurance_review'),
  updated_at = now()
WHERE name = 'insurance_specialist';

-- ParentSimple financial strategist => Megan Daly
INSERT INTO public.personas (
  id, name, display_name, description, category_mapping, target_audience, ai_prompt,
  content_style, tone_voice, expertise_level, call_to_action_style, user_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'financial_strategist_parentsimple',
  'Megan Daly',
  'Financial Strategist (IUL and Rockefeller wealth strategies)',
  ARRAY['Tax Planning', 'Insurance', 'Wealth Strategy']::text[],
  '{}'::jsonb,
  '',
  '{}'::jsonb,
  'precise_analytical',
  'advanced',
  'financial_assessment',
  NULL::uuid,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.personas WHERE name = 'financial_strategist_parentsimple'
);

-- SeniorSimple financial strategist => Jack O''Connor
INSERT INTO public.personas (
  id, name, display_name, description, category_mapping, target_audience, ai_prompt,
  content_style, tone_voice, expertise_level, call_to_action_style, user_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'financial_strategist_seniorsimple',
  'Jack O''Connor',
  'Financial Strategist (IUL and Rockefeller wealth strategies)',
  ARRAY['Tax Planning', 'Insurance', 'Wealth Strategy']::text[],
  '{}'::jsonb,
  '',
  '{}'::jsonb,
  'precise_analytical',
  'advanced',
  'financial_assessment',
  NULL::uuid,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.personas WHERE name = 'financial_strategist_seniorsimple'
);

-- Rename ParentSimple persona label to remove "Dr."
UPDATE public.personas
SET
  name = CASE
    WHEN name IN ('dr._sarah_mitchell', 'dr_sarah_mitchell')
      AND NOT EXISTS (SELECT 1 FROM public.personas p2 WHERE p2.name = 'sarah_mitchell')
    THEN 'sarah_mitchell'
    ELSE name
  END,
  display_name = 'Sarah Mitchell',
  updated_at = now()
WHERE name IN ('dr._sarah_mitchell', 'dr_sarah_mitchell')
   OR display_name = 'Dr. Sarah Mitchell';

-- =========================================================
-- Remap deprecated personas before delete
-- =========================================================
WITH ids AS (
  SELECT
    (SELECT id FROM public.personas WHERE name = 'retirement_planner' LIMIT 1) AS retirement_id,
    (SELECT id FROM public.personas WHERE name = 'financial_strategist_parentsimple' LIMIT 1) AS parent_financial_id,
    (SELECT id FROM public.personas WHERE name = 'financial_strategist_seniorsimple' LIMIT 1) AS senior_financial_id,
    (SELECT id FROM public.personas WHERE name = 'annuity_expert' LIMIT 1) AS annuity_id,
    (SELECT id FROM public.personas WHERE name = 'annuity_specialist' LIMIT 1) AS annuity_specialist_id,
    (SELECT id FROM public.personas WHERE name = 'tax_strategist' LIMIT 1) AS tax_id,
    (SELECT id FROM public.personas WHERE name = 'tax_planning_strategist' LIMIT 1) AS tax_planning_id
)
UPDATE public.brand_editorial_config b
SET persona_id = CASE
    WHEN b.site_id = 'parentsimple' AND b.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.parent_financial_id
    WHEN b.site_id = 'seniorsimple' AND b.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.senior_financial_id
    WHEN b.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.senior_financial_id
    WHEN b.persona_id IN (ids.annuity_id, ids.annuity_specialist_id) THEN ids.retirement_id
    ELSE b.persona_id
  END,
  updated_at = now()
FROM ids
WHERE b.persona_id IN (ids.annuity_id, ids.annuity_specialist_id, ids.tax_id, ids.tax_planning_id);

WITH ids AS (
  SELECT
    (SELECT id FROM public.personas WHERE name = 'retirement_planner' LIMIT 1) AS retirement_id,
    (SELECT id FROM public.personas WHERE name = 'financial_strategist_parentsimple' LIMIT 1) AS parent_financial_id,
    (SELECT id FROM public.personas WHERE name = 'financial_strategist_seniorsimple' LIMIT 1) AS senior_financial_id,
    (SELECT id FROM public.personas WHERE name = 'annuity_expert' LIMIT 1) AS annuity_id,
    (SELECT id FROM public.personas WHERE name = 'annuity_specialist' LIMIT 1) AS annuity_specialist_id,
    (SELECT id FROM public.personas WHERE name = 'tax_strategist' LIMIT 1) AS tax_id,
    (SELECT id FROM public.personas WHERE name = 'tax_planning_strategist' LIMIT 1) AS tax_planning_id
)
UPDATE public.heygen_avatar_config h
SET persona_id = CASE
    WHEN h.site_id = 'parentsimple' AND h.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.parent_financial_id
    WHEN h.site_id = 'seniorsimple' AND h.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.senior_financial_id
    WHEN h.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.senior_financial_id
    WHEN h.persona_id IN (ids.annuity_id, ids.annuity_specialist_id) THEN ids.retirement_id
    ELSE h.persona_id
  END,
  updated_at = now()
FROM ids
WHERE h.persona_id IN (ids.annuity_id, ids.annuity_specialist_id, ids.tax_id, ids.tax_planning_id);

WITH ids AS (
  SELECT
    (SELECT id FROM public.personas WHERE name = 'retirement_planner' LIMIT 1) AS retirement_id,
    (SELECT id FROM public.personas WHERE name = 'financial_strategist_parentsimple' LIMIT 1) AS parent_financial_id,
    (SELECT id FROM public.personas WHERE name = 'financial_strategist_seniorsimple' LIMIT 1) AS senior_financial_id,
    (SELECT id FROM public.personas WHERE name = 'annuity_expert' LIMIT 1) AS annuity_id,
    (SELECT id FROM public.personas WHERE name = 'annuity_specialist' LIMIT 1) AS annuity_specialist_id,
    (SELECT id FROM public.personas WHERE name = 'tax_strategist' LIMIT 1) AS tax_id,
    (SELECT id FROM public.personas WHERE name = 'tax_planning_strategist' LIMIT 1) AS tax_planning_id
)
UPDATE public.site_persona_assignments s
SET persona_id = CASE
    WHEN s.site_id = 'parentsimple' AND s.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.parent_financial_id
    WHEN s.site_id = 'seniorsimple' AND s.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.senior_financial_id
    WHEN s.persona_id IN (ids.tax_id, ids.tax_planning_id) THEN ids.senior_financial_id
    WHEN s.persona_id IN (ids.annuity_id, ids.annuity_specialist_id) THEN ids.retirement_id
    ELSE s.persona_id
  END,
  updated_at = now()
FROM ids
WHERE s.persona_id IN (ids.annuity_id, ids.annuity_specialist_id, ids.tax_id, ids.tax_planning_id);

-- Remove deprecated persona rows
UPDATE public.articles a
SET persona = CASE
    WHEN a.persona IN ('annuity_expert', 'annuity_specialist') THEN 'retirement_planner'
    WHEN a.persona IN ('tax_strategist', 'tax_planning_strategist')
      THEN CASE WHEN a.site_id = 'parentsimple'
        THEN 'financial_strategist_parentsimple'
        ELSE 'financial_strategist_seniorsimple'
      END
    ELSE a.persona
  END,
  updated_at = now()
WHERE a.persona IN ('annuity_expert', 'annuity_specialist', 'tax_strategist', 'tax_planning_strategist');

DELETE FROM public.personas
WHERE name IN ('annuity_expert', 'annuity_specialist', 'tax_strategist', 'tax_planning_strategist');

-- =========================================================
-- Avatar updates
-- =========================================================

-- ParentSimple avatar: remove "Dr." prefix
UPDATE public.heygen_avatar_config h
SET
  avatar_name = 'Sarah Mitchell',
  voice_name = 'Sarah Mitchell Voice',
  persona_profile = jsonb_set(
    jsonb_set(COALESCE(h.persona_profile, '{}'::jsonb), '{name}', to_jsonb('Sarah Mitchell'::text), true),
    '{title}',
    to_jsonb(COALESCE(NULLIF(h.persona_profile->>'title', ''), 'Education & Legacy Planning Expert')::text),
    true
  ),
  updated_at = now()
WHERE h.site_id = 'parentsimple';

-- Ensure SeniorSimple avatar exists (Jack O''Connor)
INSERT INTO public.heygen_avatar_config (
  id, site_id, avatar_id, avatar_type, avatar_name, voice_id, voice_name, voice_provider,
  training_status, is_active, persona_profile, persona_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'seniorsimple',
  'placeholder-avatar-id',
  'photo',
  'Jack O''Connor',
  'placeholder-voice-id',
  'Jack O''Connor Voice',
  'heygen',
  'not_required',
  true,
  jsonb_build_object(
    'name', 'Jack O''Connor',
    'title', 'Financial Strategist',
    'voice', jsonb_build_object(
      'tone', 'Clear, strategic, high-trust and educational.',
      'writing_style', 'Concise and actionable with practical wealth-planning steps.'
    )
  ),
  (SELECT id FROM public.personas WHERE name = 'financial_strategist_seniorsimple' LIMIT 1),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.heygen_avatar_config WHERE site_id = 'seniorsimple'
);

-- If seniorsimple avatar already exists, update it to Jack persona identity
UPDATE public.heygen_avatar_config h
SET
  avatar_name = 'Jack O''Connor',
  voice_name = 'Jack O''Connor Voice',
  persona_id = (SELECT id FROM public.personas WHERE name = 'financial_strategist_seniorsimple' LIMIT 1),
  persona_profile = jsonb_set(
    jsonb_set(COALESCE(h.persona_profile, '{}'::jsonb), '{name}', to_jsonb('Jack O''Connor'::text), true),
    '{title}',
    to_jsonb('Financial Strategist'::text),
    true
  ),
  updated_at = now()
WHERE h.site_id = 'seniorsimple';

-- Relink existing avatars to matching personas by display name
UPDATE public.heygen_avatar_config h
SET persona_id = p.id,
    updated_at = now()
FROM public.personas p
WHERE (
  lower(p.display_name) = lower(COALESCE(NULLIF(trim(h.persona_profile->>'name'), ''), h.avatar_name))
  OR lower(p.name) = lower(regexp_replace(COALESCE(NULLIF(trim(h.persona_profile->>'name'), ''), h.avatar_name), '\s+', '_', 'g'))
)
AND h.persona_id IS DISTINCT FROM p.id;

-- =========================================================
-- Site persona assignments (multi-persona)
-- =========================================================

-- ParentSimple: Megan Daly (financial strategist, primary)
INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'parentsimple', p.id, 'financial_strategist', true, true, now()
FROM public.personas p
WHERE p.name = 'financial_strategist_parentsimple'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_primary = true, is_active = true, updated_at = now();

-- ParentSimple: Sarah Mitchell (education/legacy)
INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'parentsimple', p.id, 'education_legacy', false, true, now()
FROM public.personas p
WHERE p.display_name = 'Sarah Mitchell'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_active = true, updated_at = now();

-- SeniorSimple primary: Jack O''Connor
INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'seniorsimple', p.id, 'financial_strategist', true, true, now()
FROM public.personas p
WHERE p.name = 'financial_strategist_seniorsimple'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_primary = true, is_active = true, updated_at = now();

-- SeniorSimple supporting personas
INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'seniorsimple', p.id, 'retirement_planning', false, true, now()
FROM public.personas p
WHERE p.name = 'retirement_planner'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_active = true, updated_at = now();

INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'seniorsimple', p.id, 'medicare_specialist', false, true, now()
FROM public.personas p
WHERE p.name = 'medicare_specialist'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_active = true, updated_at = now();

INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'seniorsimple', p.id, 'insurance_long_term_care', false, true, now()
FROM public.personas p
WHERE p.name = 'insurance_specialist'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_active = true, updated_at = now();

INSERT INTO public.site_persona_assignments (site_id, persona_id, role_key, is_primary, is_active, updated_at)
SELECT 'seniorsimple', p.id, 'estate_planning_attorney', false, true, now()
FROM public.personas p
WHERE p.name = 'estate_planner'
ON CONFLICT (site_id, persona_id, role_key)
DO UPDATE SET is_active = true, updated_at = now();

-- Maintain one primary persona per site
WITH ranked AS (
  SELECT
    id,
    site_id,
    row_number() OVER (
      PARTITION BY site_id
      ORDER BY is_primary DESC, updated_at DESC, created_at DESC
    ) AS rn
  FROM public.site_persona_assignments
  WHERE is_active = true
)
UPDATE public.site_persona_assignments s
SET is_primary = (ranked.rn = 1),
    updated_at = now()
FROM ranked
WHERE s.id = ranked.id;

COMMIT;
