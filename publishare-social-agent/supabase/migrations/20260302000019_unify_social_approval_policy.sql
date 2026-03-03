-- ========================================
-- PHASE 3: UNIFIED SOCIAL APPROVAL POLICY
-- ========================================
-- Goals:
-- 1) Remove ambiguity between native vs promotion social jobs.
-- 2) Backfill payload.post_intent when missing.
-- 3) Make approve_content_job deterministic and signature-safe.
--
-- Policy:
-- - social_post + post_intent='promotion' => article_id required
-- - social_post + post_intent='native'    => article_id optional
-- - missing post_intent                   => inferred from article_id presence
-- ========================================

-- Helper: normalize/derive post intent from payload
CREATE OR REPLACE FUNCTION public.resolve_social_post_intent(
  p_payload jsonb
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_intent text;
  v_article_id text;
BEGIN
  v_intent := lower(
    nullif(trim(coalesce(p_payload->>'post_intent', '')), '')
  );
  IF v_intent IN ('native', 'promotion') THEN
    RETURN v_intent;
  END IF;

  v_article_id := nullif(trim(coalesce(p_payload->>'article_id', '')), '');
  IF v_article_id IS NOT NULL THEN
    RETURN 'promotion';
  END IF;
  RETURN 'native';
END;
$$;

COMMENT ON FUNCTION public.resolve_social_post_intent(jsonb)
IS 'Derives social post intent from payload. Valid output: native|promotion.';

-- Backfill: set payload.post_intent where missing/invalid on social jobs
UPDATE public.content_jobs
SET payload = jsonb_set(
  coalesce(payload, '{}'::jsonb),
  '{post_intent}',
  to_jsonb(public.resolve_social_post_intent(payload)),
  true
),
updated_at = now()
WHERE coalesce(job_type, 'social_post') = 'social_post'
  AND coalesce(lower(nullif(trim(coalesce(payload->>'post_intent', '')), '')), '') NOT IN ('native', 'promotion');

-- Unified approval function
CREATE OR REPLACE FUNCTION public.approve_content_job(
  p_job_id uuid,
  p_actor text DEFAULT 'reviewer'
) RETURNS public.content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.content_jobs;
  v_article_id text;
  v_post_intent text;
BEGIN
  SELECT *
  INTO v_job
  FROM public.content_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'content_job_not_found: %', p_job_id;
  END IF;

  IF coalesce(v_job.job_type, 'social_post') = 'social_post' THEN
    v_post_intent := public.resolve_social_post_intent(v_job.payload);
    v_article_id := nullif(trim(coalesce(v_job.payload->>'article_id', '')), '');

    IF v_post_intent = 'promotion' AND v_article_id IS NULL THEN
      RAISE EXCEPTION 'approval_blocked_missing_article_id: %', p_job_id;
    END IF;

    -- keep payload intent normalized to avoid future ambiguity
    v_job.payload := jsonb_set(
      coalesce(v_job.payload, '{}'::jsonb),
      '{post_intent}',
      to_jsonb(v_post_intent),
      true
    );
  END IF;

  UPDATE public.content_jobs
  SET
    approval_status = 'approved',
    status = 'retryable',
    available_at = now(),
    lock_token = null,
    lock_expires_at = null,
    payload = coalesce(v_job.payload, '{}'::jsonb),
    updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  PERFORM public.record_content_event(
    p_job_id     => p_job_id,
    p_event_type => 'approval_granted',
    p_stage      => 'publish',
    p_severity   => 'info',
    p_message    => 'Reviewer approved job',
    p_payload    => jsonb_build_object(
      'post_intent', public.resolve_social_post_intent(v_job.payload),
      'source', 'approve_content_job'
    ),
    p_actor      => coalesce(p_actor, 'reviewer')
  );

  RETURN v_job;
END;
$$;

COMMENT ON FUNCTION public.approve_content_job(uuid, text)
IS 'Approves content jobs with unified native/promotion social policy.';
