-- ========================================
-- NOTION POLL CONFIGS (ALLOWLISTED DB IDS)
-- ========================================

CREATE TABLE IF NOT EXISTS public.notion_poll_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_database_id text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  site_id varchar(50) REFERENCES public.sites(id) ON DELETE SET NULL,
  profile_name text,
  ready_status text NOT NULL DEFAULT 'ready',
  queued_status text,
  post_intent_default text NOT NULL DEFAULT 'native' CHECK (post_intent_default IN ('native','promotion')),
  requires_approval boolean NOT NULL DEFAULT true,
  default_platforms jsonb NOT NULL DEFAULT '["facebook"]'::jsonb,
  max_pages_per_poll int NOT NULL DEFAULT 25,
  lookback_minutes int NOT NULL DEFAULT 1440,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notion_poll_configs_enabled
  ON public.notion_poll_configs (enabled, notion_database_id);

INSERT INTO public.notion_poll_configs (
  notion_database_id,
  enabled,
  site_id,
  profile_name,
  ready_status,
  queued_status,
  post_intent_default,
  requires_approval,
  default_platforms
)
VALUES (
  '5c104e31e1234e6dab55c98417862bbf',
  true,
  'seniorsimple',
  'SeniorSimple Editorial',
  'ready',
  'queued',
  'native',
  true,
  '["facebook"]'::jsonb
)
ON CONFLICT (notion_database_id) DO NOTHING;
