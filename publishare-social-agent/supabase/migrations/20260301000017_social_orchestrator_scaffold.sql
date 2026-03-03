-- ========================================
-- SOCIAL ORCHESTRATOR SCAFFOLD
-- ========================================
-- Durable memory for orchestration decisions + actions.

CREATE TABLE IF NOT EXISTS public.orchestrator_runs (
  job_id uuid PRIMARY KEY REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id varchar(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  profile_name text,
  state text NOT NULL DEFAULT 'monitoring'
    CHECK (state IN ('monitoring', 'running', 'waiting_approval', 'retry_scheduled', 'escalated', 'resolved')),
  retry_count integer NOT NULL DEFAULT 0,
  last_seen_status text NOT NULL DEFAULT 'queued',
  last_error text,
  next_action_at timestamptz,
  escalated boolean NOT NULL DEFAULT false,
  last_alert_at timestamptz,
  last_alert_reason text,
  memory jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_state
  ON public.orchestrator_runs (state, next_action_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_site
  ON public.orchestrator_runs (site_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.orchestrator_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id varchar(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('planned', 'applied', 'skipped', 'failed')),
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor text NOT NULL DEFAULT 'social-orchestrator',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_actions_job
  ON public.orchestrator_actions (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestrator_actions_site
  ON public.orchestrator_actions (site_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_orchestrator_action(
  p_job_id uuid,
  p_action_type text,
  p_status text DEFAULT 'applied',
  p_reason text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_actor text DEFAULT 'social-orchestrator'
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

  INSERT INTO public.orchestrator_actions (
    job_id, site_id, action_type, status, reason, details, actor
  ) VALUES (
    p_job_id,
    v_site_id,
    COALESCE(p_action_type, 'unknown'),
    COALESCE(p_status, 'applied'),
    p_reason,
    COALESCE(p_details, '{}'::jsonb),
    COALESCE(p_actor, 'social-orchestrator')
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.orchestrator_incidents AS
SELECT
  r.job_id,
  r.site_id,
  r.profile_name,
  r.state,
  r.retry_count,
  r.last_seen_status,
  r.last_error,
  r.escalated,
  r.last_alert_at,
  r.last_alert_reason,
  r.next_action_at,
  r.updated_at
FROM public.orchestrator_runs r
WHERE r.state IN ('retry_scheduled', 'escalated')
   OR r.escalated = true
ORDER BY r.updated_at DESC;

COMMENT ON TABLE public.orchestrator_runs IS 'Persistent orchestration state per content job.';
COMMENT ON TABLE public.orchestrator_actions IS 'Append-only orchestrator actions/decisions for auditability.';
COMMENT ON VIEW public.orchestrator_incidents IS 'Operational incident view for jobs requiring orchestration attention.';
