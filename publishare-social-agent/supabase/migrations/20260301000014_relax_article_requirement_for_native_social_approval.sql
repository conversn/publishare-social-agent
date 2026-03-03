-- ========================================
-- RELAX ARTICLE REQUIREMENT FOR NATIVE SOCIAL APPROVAL
-- ========================================
-- Previously, approve_content_job required payload.article_id for all social_post jobs.
-- This blocks native jobs (e.g., Notion topic/content) that do not promote an article.
-- New behavior:
-- - promotion social_post => article_id required
-- - native social_post => article_id not required
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
  v_post_intent TEXT;
BEGIN
  SELECT * INTO v_job
  FROM public.content_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  IF COALESCE(v_job.job_type, 'social_post') = 'social_post' THEN
    v_post_intent := lower(
      NULLIF(
        trim(
          COALESCE(
            v_job.post_intent,
            v_job.payload->>'post_intent',
            'native'
          )
        ),
        ''
      )
    );
    v_article_id := NULLIF(trim(COALESCE(v_job.payload->>'article_id', '')), '');

    IF v_post_intent = 'promotion' AND v_article_id IS NULL THEN
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

