-- ========================================
-- SOCIAL AUDIT LAYER (SAFE)
-- ========================================
-- Adds:
-- - content_review_actions: explicit human/moderation actions
-- - content_publish_attempts: per-platform publish attempt history
-- - immutable protections for append-only audit tables
-- - content_job_trace view for one-query timeline
-- ========================================

CREATE TABLE IF NOT EXISTS public.content_review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id varchar(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve', 'reject', 'request_edit', 'regenerate', 'edit_approve', 'claim', 'unclaim')),
  actor text NOT NULL DEFAULT 'system',
  actor_user_id text,
  channel text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_review_actions_job
  ON public.content_review_actions (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_review_actions_site
  ON public.content_review_actions (site_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.content_publish_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id varchar(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  platform text NOT NULL,
  post_intent text NOT NULL CHECK (post_intent IN ('native', 'promotion')),
  success boolean NOT NULL DEFAULT false,
  http_status integer,
  remote_post_id text,
  remote_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  attempt_no integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_publish_attempts_job
  ON public.content_publish_attempts (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_publish_attempts_site
  ON public.content_publish_attempts (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_publish_attempts_failures
  ON public.content_publish_attempts (site_id, created_at DESC)
  WHERE success = false;

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'immutable_audit_table: % cannot be updated or deleted', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_events_no_update_delete ON public.content_events;
CREATE TRIGGER trg_content_events_no_update_delete
  BEFORE UPDATE OR DELETE ON public.content_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

DROP TRIGGER IF EXISTS trg_content_review_actions_no_update_delete ON public.content_review_actions;
CREATE TRIGGER trg_content_review_actions_no_update_delete
  BEFORE UPDATE OR DELETE ON public.content_review_actions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

DROP TRIGGER IF EXISTS trg_content_publish_attempts_no_update_delete ON public.content_publish_attempts;
CREATE TRIGGER trg_content_publish_attempts_no_update_delete
  BEFORE UPDATE OR DELETE ON public.content_publish_attempts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

CREATE OR REPLACE FUNCTION public.log_content_review_action(
  p_job_id uuid,
  p_action text,
  p_actor text DEFAULT 'system',
  p_actor_user_id text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id varchar(50);
  v_id uuid;
BEGIN
  SELECT site_id INTO v_site_id
  FROM public.content_jobs
  WHERE id = p_job_id;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  INSERT INTO public.content_review_actions (
    job_id, site_id, action, actor, actor_user_id, channel, reason, metadata
  ) VALUES (
    p_job_id, v_site_id, p_action, COALESCE(p_actor, 'system'), p_actor_user_id, p_channel, p_reason, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_content_publish_attempt(
  p_job_id uuid,
  p_platform text,
  p_post_intent text,
  p_success boolean,
  p_http_status integer DEFAULT NULL,
  p_remote_post_id text DEFAULT NULL,
  p_remote_payload jsonb DEFAULT '{}'::jsonb,
  p_error_message text DEFAULT NULL,
  p_attempt_no integer DEFAULT 1
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id varchar(50);
  v_id uuid;
BEGIN
  SELECT site_id INTO v_site_id
  FROM public.content_jobs
  WHERE id = p_job_id;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  INSERT INTO public.content_publish_attempts (
    job_id, site_id, platform, post_intent, success, http_status, remote_post_id, remote_payload, error_message, attempt_no
  ) VALUES (
    p_job_id, v_site_id, COALESCE(p_platform, 'unknown'), COALESCE(p_post_intent, 'native'), COALESCE(p_success, false),
    p_http_status, p_remote_post_id, COALESCE(p_remote_payload, '{}'::jsonb), p_error_message, GREATEST(1, COALESCE(p_attempt_no, 1))
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.content_job_trace AS
SELECT
  e.job_id,
  e.site_id,
  e.created_at,
  'event'::text AS source,
  e.event_type AS action,
  e.stage,
  e.severity,
  e.actor,
  e.message,
  e.payload AS details
FROM public.content_events e
UNION ALL
SELECT
  r.job_id,
  r.site_id,
  r.created_at,
  'review_action'::text AS source,
  r.action,
  'review'::text AS stage,
  'info'::text AS severity,
  r.actor,
  COALESCE(r.reason, r.action) AS message,
  jsonb_build_object(
    'actor_user_id', r.actor_user_id,
    'channel', r.channel,
    'metadata', r.metadata
  ) AS details
FROM public.content_review_actions r
UNION ALL
SELECT
  p.job_id,
  p.site_id,
  p.created_at,
  'publish_attempt'::text AS source,
  CASE WHEN p.success THEN 'publish_success' ELSE 'publish_failure' END AS action,
  'publish'::text AS stage,
  CASE WHEN p.success THEN 'info' ELSE 'error' END AS severity,
  'system'::text AS actor,
  COALESCE(p.error_message, 'publish attempt') AS message,
  jsonb_build_object(
    'platform', p.platform,
    'post_intent', p.post_intent,
    'http_status', p.http_status,
    'remote_post_id', p.remote_post_id,
    'attempt_no', p.attempt_no,
    'remote_payload', p.remote_payload
  ) AS details
FROM public.content_publish_attempts p;

COMMENT ON TABLE public.content_review_actions IS 'Explicit review/moderation actions (approve/reject/edit/regenerate) for audit.';
COMMENT ON TABLE public.content_publish_attempts IS 'Per-platform publish attempt history with remote ids and errors.';
COMMENT ON VIEW public.content_job_trace IS 'Unified audit timeline across events, review actions, and publish attempts.';
