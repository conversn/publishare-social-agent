-- ========================================
-- PHASE 1 SOCIAL PIPELINE HARDENING
-- ========================================
-- Adds:
-- - content_jobs: durable queue with idempotency + approvals + retries
-- - content_artifacts: prompt/output snapshots per stage
-- - content_events: append-only audit log
-- - content_policy_results: publish/safety gate results
-- - helper RPCs for atomic claim + event logging + finalize
-- ========================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional brand-level gating flags
ALTER TABLE public.brand_editorial_config
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_auto_publish BOOLEAN NOT NULL DEFAULT false;

-- Durable queue table
CREATE TABLE IF NOT EXISTS public.content_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL DEFAULT 'social_post',
  site_id VARCHAR(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  profile_name TEXT,
  requested_by TEXT NOT NULL DEFAULT 'system',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'awaiting_approval', 'retryable', 'failed', 'completed', 'canceled')),
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'not_required')),
  priority INTEGER NOT NULL DEFAULT 100,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  lock_token UUID,
  lock_expires_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  config_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_jobs_claim
  ON public.content_jobs (status, available_at, scheduled_for, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_content_jobs_site_status
  ON public.content_jobs (site_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_jobs_lock_expiry
  ON public.content_jobs (lock_expires_at)
  WHERE lock_expires_at IS NOT NULL;

-- Artifacts: immutable-ish snapshots generated in each stage
CREATE TABLE IF NOT EXISTS public.content_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, stage, artifact_type, version)
);

CREATE INDEX IF NOT EXISTS idx_content_artifacts_job
  ON public.content_artifacts (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_artifacts_site
  ON public.content_artifacts (site_id, created_at DESC);

-- Append-only events for auditability
CREATE TABLE IF NOT EXISTS public.content_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stage TEXT,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('debug', 'info', 'warn', 'error')),
  actor TEXT NOT NULL DEFAULT 'system',
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_events_job
  ON public.content_events (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_events_site
  ON public.content_events (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_events_type
  ON public.content_events (event_type, created_at DESC);

-- Policy/safety gate result records
CREATE TABLE IF NOT EXISTS public.content_policy_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.content_jobs(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error'
    CHECK (severity IN ('info', 'warn', 'error')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_policy_results_job
  ON public.content_policy_results (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_policy_results_failed
  ON public.content_policy_results (site_id, created_at DESC)
  WHERE passed = false;

-- Audit helper function
CREATE OR REPLACE FUNCTION public.record_content_event(
  p_job_id UUID,
  p_event_type TEXT,
  p_stage TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_message TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_actor TEXT DEFAULT 'system'
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id BIGINT;
  v_site_id VARCHAR(50);
BEGIN
  SELECT site_id INTO v_site_id
  FROM public.content_jobs
  WHERE id = p_job_id;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  INSERT INTO public.content_events (
    job_id, site_id, event_type, stage, severity, actor, message, payload
  ) VALUES (
    p_job_id, v_site_id, p_event_type, p_stage, p_severity, p_actor, p_message, COALESCE(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Atomic claim (prevents duplicate workers claiming same job)
CREATE OR REPLACE FUNCTION public.claim_next_content_job(
  p_worker TEXT DEFAULT 'worker',
  p_lock_minutes INTEGER DEFAULT 15
) RETURNS SETOF public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  SELECT j.id
  INTO v_job_id
  FROM public.content_jobs j
  WHERE j.status IN ('queued', 'retryable')
    AND j.available_at <= now()
    AND j.attempt_count < j.max_attempts
    AND (
      j.requires_approval = false
      OR j.approval_status IN ('approved', 'not_required')
    )
    AND (
      j.lock_expires_at IS NULL
      OR j.lock_expires_at < now()
    )
  ORDER BY j.priority ASC, j.scheduled_for ASC, j.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.content_jobs
  SET
    status = 'running',
    attempt_count = attempt_count + 1,
    started_at = COALESCE(started_at, now()),
    lock_token = gen_random_uuid(),
    lock_expires_at = now() + make_interval(mins => GREATEST(1, p_lock_minutes)),
    updated_at = now(),
    requested_by = COALESCE(p_worker, requested_by)
  WHERE id = v_job_id;

  PERFORM public.record_content_event(
    v_job_id,
    'job_claimed',
    'prepare_context',
    'info',
    'Worker claimed content job',
    jsonb_build_object('worker', p_worker, 'lock_minutes', p_lock_minutes),
    COALESCE(p_worker, 'worker')
  );

  RETURN QUERY
  SELECT *
  FROM public.content_jobs
  WHERE id = v_job_id;
END;
$$;

-- Mark job complete/fail consistently
CREATE OR REPLACE FUNCTION public.finalize_content_job(
  p_job_id UUID,
  p_success BOOLEAN,
  p_error TEXT DEFAULT NULL
) RETURNS public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.content_jobs;
BEGIN
  UPDATE public.content_jobs
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    finished_at = now(),
    lock_token = NULL,
    lock_expires_at = NULL,
    last_error = CASE WHEN p_success THEN NULL ELSE p_error END,
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  PERFORM public.record_content_event(
    p_job_id,
    CASE WHEN p_success THEN 'job_completed' ELSE 'job_failed' END,
    'finalize',
    CASE WHEN p_success THEN 'info' ELSE 'error' END,
    CASE WHEN p_success THEN 'Job completed' ELSE COALESCE(p_error, 'Job failed') END,
    '{}'::jsonb,
    'system'
  );

  RETURN v_job;
END;
$$;

COMMENT ON TABLE public.content_jobs IS 'Durable queue for content generation/posting runs with idempotency, retries, approval, and locking.';
COMMENT ON TABLE public.content_artifacts IS 'Stage outputs and prompt/payload snapshots per content job.';
COMMENT ON TABLE public.content_events IS 'Append-only event stream for job audit trail.';
COMMENT ON TABLE public.content_policy_results IS 'Per-job policy gate checks that determine publish eligibility.';
