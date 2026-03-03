-- ========================================
-- RESET ATTEMPT COUNT ON EDIT/REGENERATE
-- ========================================
-- Without this, jobs at attempt_count=max_attempts can be re-queued
-- but never claimed again by the worker.
-- ========================================

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
  v_reason TEXT;
BEGIN
  v_reason := COALESCE(NULLIF(trim(p_reason), ''), 'edit_requested');

  UPDATE public.content_jobs
  SET
    approval_status = 'pending',
    status = 'retryable',
    available_at = now(),
    lock_token = NULL,
    lock_expires_at = NULL,
    last_error = v_reason,
    notified_at = NULL,
    attempt_count = 0,
    payload = jsonb_set(
      jsonb_set(
        COALESCE(payload, '{}'::jsonb),
        '{review_feedback}',
        COALESCE(payload->'review_feedback', '[]'::jsonb) || jsonb_build_array(
          jsonb_build_object(
            'reason', v_reason,
            'actor', COALESCE(p_actor, 'reviewer'),
            'at', now()
          )
        ),
        true
      ),
      '{context}',
      to_jsonb(trim(
        COALESCE(payload->>'context', '') ||
        CASE WHEN COALESCE(payload->>'context', '') <> '' THEN E'\n' ELSE '' END ||
        'Reviewer feedback: ' || v_reason
      )),
      true
    ),
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
    v_reason,
    jsonb_build_object('reason', v_reason),
    COALESCE(p_actor, 'reviewer')
  );

  RETURN v_job;
END;
$$;
