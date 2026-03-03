-- ========================================
-- CHANNEL-LEVEL SOCIAL DESTINATION ROUTING
-- ========================================
-- Purpose:
-- - Allow explicit per-platform destination routing (e.g., two LinkedIn accounts on one GHL location)
-- - Fail closed when routing is ambiguous
--
-- Example:
-- site_id='callready', profile_name='Keenan Shaw', platform='linkedin'
-- channel_key='keenan_personal', ghl_channel_id='<account-id-from-ghl>'
-- ========================================

CREATE TABLE IF NOT EXISTS public.social_destination_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  profile_name text NOT NULL,
  platform text NOT NULL,
  channel_key text NOT NULL,
  channel_label text,
  ghl_location_id text NOT NULL,
  ghl_channel_id text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_destination_channels_platform_check
    CHECK (lower(platform) IN ('facebook', 'linkedin', 'instagram', 'twitter')),
  CONSTRAINT social_destination_channels_channel_key_check
    CHECK (length(trim(channel_key)) > 0),
  CONSTRAINT social_destination_channels_ghl_channel_id_check
    CHECK (length(trim(ghl_channel_id)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS social_destination_channels_site_profile_platform_key_uq
  ON public.social_destination_channels (site_id, profile_name, lower(platform), lower(channel_key));

CREATE INDEX IF NOT EXISTS social_destination_channels_lookup_idx
  ON public.social_destination_channels (site_id, profile_name, lower(platform), enabled, is_default);

CREATE UNIQUE INDEX IF NOT EXISTS social_destination_channels_default_uq
  ON public.social_destination_channels (site_id, profile_name, lower(platform))
  WHERE is_default = true AND enabled = true;

CREATE OR REPLACE FUNCTION public.set_social_destination_channels_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_social_destination_channels_updated_at ON public.social_destination_channels;
CREATE TRIGGER trg_social_destination_channels_updated_at
BEFORE UPDATE ON public.social_destination_channels
FOR EACH ROW
EXECUTE FUNCTION public.set_social_destination_channels_updated_at();

COMMENT ON TABLE public.social_destination_channels
IS 'Explicit destination routing map for social posts by site/profile/platform.';

COMMENT ON COLUMN public.social_destination_channels.channel_key
IS 'Human-stable key used in job payload as destination_channel_key.';

COMMENT ON COLUMN public.social_destination_channels.ghl_channel_id
IS 'Exact GHL social account/channel id to target for posting.';
