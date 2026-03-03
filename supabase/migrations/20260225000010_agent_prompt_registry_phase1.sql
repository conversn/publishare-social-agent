-- ========================================
-- AGENT PROMPT REGISTRY (PHASE 1)
-- ========================================
-- Goal:
-- - Move core writing instructions out of worker code and into DB.
-- - Version prompt packs by site/profile/platform/purpose.
-- - Store optional examples and policy bundles for future evaluator loops.
-- ========================================

CREATE TABLE IF NOT EXISTS public.agent_prompt_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NULL,
  profile_name TEXT NULL,
  platform TEXT NULL,
  purpose TEXT NOT NULL DEFAULT 'social_post',
  pack_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  system_prompt TEXT NOT NULL,
  planner_prompt TEXT NULL,
  writer_prompt TEXT NULL,
  critic_prompt TEXT NULL,
  revision_prompt TEXT NULL,
  hard_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_prompt_packs_scope_version
  ON public.agent_prompt_packs (
    COALESCE(site_id, ''),
    COALESCE(profile_name, ''),
    COALESCE(platform, ''),
    purpose,
    version
  );

CREATE INDEX IF NOT EXISTS idx_agent_prompt_packs_lookup
  ON public.agent_prompt_packs (purpose, is_active, priority, site_id, profile_name, platform, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_prompt_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_pack_id UUID NOT NULL REFERENCES public.agent_prompt_packs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_text TEXT NOT NULL,
  platform TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_prompt_examples_pack
  ON public.agent_prompt_examples (prompt_pack_id, is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_policy_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NULL,
  profile_name TEXT NULL,
  platform TEXT NULL,
  purpose TEXT NOT NULL DEFAULT 'social_post',
  bundle_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_policy_bundles_scope_version
  ON public.agent_policy_bundles (
    COALESCE(site_id, ''),
    COALESCE(profile_name, ''),
    COALESCE(platform, ''),
    purpose,
    version
  );

CREATE INDEX IF NOT EXISTS idx_agent_policy_bundles_lookup
  ON public.agent_policy_bundles (purpose, is_active, site_id, profile_name, platform, updated_at DESC);

CREATE OR REPLACE FUNCTION public.resolve_agent_prompt_pack(
  p_site_id TEXT,
  p_profile_name TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_purpose TEXT DEFAULT 'social_post'
) RETURNS public.agent_prompt_packs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pack public.agent_prompt_packs;
BEGIN
  SELECT p.*
  INTO v_pack
  FROM public.agent_prompt_packs p
  WHERE p.is_active = true
    AND p.purpose = COALESCE(NULLIF(trim(p_purpose), ''), 'social_post')
    AND (p.site_id IS NULL OR p.site_id = p_site_id)
    AND (p.profile_name IS NULL OR lower(p.profile_name) = lower(COALESCE(p_profile_name, '')))
    AND (p.platform IS NULL OR lower(p.platform) = lower(COALESCE(p_platform, '')))
  ORDER BY
    CASE WHEN p.site_id IS NOT NULL AND p.site_id = p_site_id THEN 8 ELSE 0 END +
    CASE WHEN p.profile_name IS NOT NULL AND lower(p.profile_name) = lower(COALESCE(p_profile_name, '')) THEN 4 ELSE 0 END +
    CASE WHEN p.platform IS NOT NULL AND lower(p.platform) = lower(COALESCE(p_platform, '')) THEN 2 ELSE 0 END DESC,
    p.priority ASC,
    p.version DESC,
    p.updated_at DESC
  LIMIT 1;

  RETURN v_pack;
END;
$$;

INSERT INTO public.agent_prompt_packs (
  site_id,
  profile_name,
  platform,
  purpose,
  pack_name,
  version,
  is_active,
  priority,
  system_prompt,
  writer_prompt,
  hard_constraints,
  metadata
)
VALUES (
  NULL,
  NULL,
  NULL,
  'social_post',
  'global_social_baseline',
  1,
  true,
  100,
  'You are a senior social media ghostwriter for growth-focused brands.
Write one complete, publish-ready post only.
No meta commentary. No markdown code fences. No placeholders.
Use clear, specific language and practical details.
Avoid generic filler and vague advice.
If no proof metrics are provided, do not invent numbers.',
  'Write one final social post body using short lines, concrete examples, and a clear CTA. Return only the final post text.',
  jsonb_build_object(
    'forbidden_phrases',
    jsonb_build_array(
      'most teams overcomplicate',
      'if you want predictable growth',
      'take control of your',
      'are you ready to elevate',
      'without the overwhelm'
    )
  ),
  jsonb_build_object('seed', 'phase1')
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.agent_prompt_packs IS 'Versioned prompt packs scoped by site/profile/platform/purpose for agent-style social generation.';
COMMENT ON TABLE public.agent_prompt_examples IS 'Few-shot examples attached to prompt packs.';
COMMENT ON TABLE public.agent_policy_bundles IS 'Versioned policy bundles for agent evaluation gates.';
