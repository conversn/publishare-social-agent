-- ========================================
-- REQUIRE ARTICLE_ID ON SOCIAL APPROVAL
-- ========================================
-- Prevent approving social jobs that cannot be published.
-- ========================================

CREATE OR REPLACE FUNCTION public.approve_content_job(
  p_job_id UUID,
  p_actor TEXT DEFAULT 'reviewer'
) RETURNS public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.content_jobs;
  v_article_id TEXT;
BEGIN
  SELECT * INTO v_job
  FROM public.content_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  IF COALESCE(v_job.job_type, 'social_post') = 'social_post' THEN
    v_article_id := NULLIF(trim(COALESCE(v_job.payload->>'article_id', '')), '');
    IF v_article_id IS NULL THEN
      RAISE EXCEPTION 'approval_blocked_missing_article_id: %', p_job_id;
    END IF;
  END IF;

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
