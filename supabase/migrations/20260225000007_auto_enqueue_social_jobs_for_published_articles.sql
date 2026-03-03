-- ========================================
-- AUTO-ENQUEUE SOCIAL JOBS FOR PUBLISHED ARTICLES
-- ========================================
-- Scope:
-- - parentsimple
-- - seniorsimple
-- - homesimple
--
-- Behavior:
-- - When an article is inserted/updated to status='published', enqueue one
--   content_jobs row (idempotent by article_id+site_id key).
-- - Jobs are human-approval-first by default.
-- ========================================

-- Ensure editorial config supports the desired default behavior
UPDATE public.brand_editorial_config
SET
  require_approval = true,
  enable_auto_publish = true,
  platforms = CASE
    WHEN platforms IS NULL OR jsonb_typeof(platforms) <> 'array' OR jsonb_array_length(platforms) = 0
      THEN '["facebook","linkedin","twitter"]'::jsonb
    ELSE platforms
  END,
  updated_at = now()
WHERE site_id IN ('parentsimple', 'seniorsimple', 'homesimple')
  AND enabled = true;

-- Auto-enqueue trigger function
CREATE OR REPLACE FUNCTION public.enqueue_social_job_for_published_article()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site text;
  v_profile text;
  v_platforms jsonb;
  v_requires_approval boolean;
  v_idempotency_key text;
BEGIN
  v_site := NEW.site_id;
  IF v_site IS NULL THEN
    RETURN NEW;
  END IF;

  -- Limit rollout to requested brands
  IF v_site NOT IN ('parentsimple', 'seniorsimple', 'homesimple') THEN
    RETURN NEW;
  END IF;

  -- Only enqueue when status is published
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  -- Skip if the row was already published before and remains published
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  SELECT
    bec.profile_name,
    COALESCE(NULLIF(bec.platforms, '[]'::jsonb), '["facebook","linkedin","twitter"]'::jsonb),
    COALESCE(bec.require_approval, true)
  INTO
    v_profile,
    v_platforms,
    v_requires_approval
  FROM public.brand_editorial_config bec
  WHERE bec.site_id = v_site
    AND bec.enabled = true
  ORDER BY bec.updated_at DESC NULLS LAST, bec.created_at DESC NULLS LAST
  LIMIT 1;

  v_idempotency_key := format('article-social:%s:%s', v_site, NEW.id::text);

  INSERT INTO public.content_jobs (
    idempotency_key,
    job_type,
    site_id,
    profile_name,
    requested_by,
    status,
    requires_approval,
    approval_status,
    priority,
    payload,
    scheduled_for,
    available_at
  )
  VALUES (
    v_idempotency_key,
    'social_post',
    v_site,
    v_profile,
    'db-trigger',
    'queued',
    COALESCE(v_requires_approval, true),
    CASE WHEN COALESCE(v_requires_approval, true) THEN 'pending' ELSE 'not_required' END,
    100,
    jsonb_build_object(
      'article_id', NEW.id,
      'topic', COALESCE(NEW.title, 'published article'),
      'platforms', v_platforms,
      'auto_publish', true
    ),
    now(),
    now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_social_job_on_article_publish ON public.articles;

CREATE TRIGGER trg_enqueue_social_job_on_article_publish
AFTER INSERT OR UPDATE OF status
ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_social_job_for_published_article();
