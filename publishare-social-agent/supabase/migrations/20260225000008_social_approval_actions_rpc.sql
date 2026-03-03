-- ========================================
-- SOCIAL APPROVAL ACTION RPCS
-- ========================================
-- Adds:
-- - reject_content_job(p_job_id, p_actor, p_reason)
-- - request_edit_content_job(p_job_id, p_actor, p_reason)
-- ========================================

CREATE OR REPLACE FUNCTION public.reject_content_job(
  p_job_id UUID,
  p_actor TEXT DEFAULT 'reviewer',
  p_reason TEXT DEFAULT NULL
) RETURNS public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.content_jobs;
BEGIN
  UPDATE public.content_jobs
  SET
    approval_status = 'rejected',
    status = 'canceled',
    finished_at = now(),
    lock_token = NULL,
    lock_expires_at = NULL,
    last_error = COALESCE(p_reason, 'rejected_by_reviewer'),
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  PERFORM public.record_content_event(
    p_job_id,
    'approval_rejected',
    'publish',
    'warn',
    COALESCE(p_reason, 'Reviewer rejected job'),
    jsonb_build_object('reason', COALESCE(p_reason, 'rejected_by_reviewer')),
    COALESCE(p_actor, 'reviewer')
  );

  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_edit_content_job(
  p_job_id UUID,
  p_actor TEXT DEFAULT 'reviewer',
  p_reason TEXT DEFAULT NULL
) RETURNS public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.content_jobs;
BEGIN
  UPDATE public.content_jobs
  SET
    approval_status = 'pending',
    status = 'retryable',
    available_at = now(),
    lock_token = NULL,
    lock_expires_at = NULL,
    last_error = COALESCE(p_reason, 'edit_requested'),
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  PERFORM public.record_content_event(
    p_job_id,
    'edit_requested',
    'publish',
    'info',
    COALESCE(p_reason, 'Reviewer requested edit'),
    jsonb_build_object('reason', COALESCE(p_reason, 'edit_requested')),
    COALESCE(p_actor, 'reviewer')
  );

  RETURN v_job;
END;
$$;
