-- ========================================
-- SOCIAL REVIEW ALERTS + CLAIM LOGIC FIX
-- ========================================
-- Adds reviewer-notification tracking and allows queued jobs that require
-- approval to be processed through generation/policy stages first.
-- ========================================

ALTER TABLE public.content_jobs
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_channel TEXT,
  ADD COLUMN IF NOT EXISTS review_url TEXT;

CREATE INDEX IF NOT EXISTS idx_content_jobs_awaiting_approval
  ON public.content_jobs (status, notified_at, created_at DESC)
  WHERE status = 'awaiting_approval';

-- Re-create claim function without approval pre-filter.
-- Approval gate is handled inside worker publish stage.
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

-- Helper to approve a job and make it retryable for publish step.
CREATE OR REPLACE FUNCTION public.approve_content_job(
  p_job_id UUID,
  p_actor TEXT DEFAULT 'reviewer'
) RETURNS public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.content_jobs;
BEGIN
  UPDATE public.content_jobs
  SET
    approval_status = 'approved',
    status = 'retryable',
    available_at = now(),
    lock_token = NULL,
    lock_expires_at = NULL,
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  PERFORM public.record_content_event(
    p_job_id,
    'approval_granted',
    'publish',
    'info',
    'Reviewer approved job',
    '{}'::jsonb,
    COALESCE(p_actor, 'reviewer')
  );

  RETURN v_job;
END;
$$;
