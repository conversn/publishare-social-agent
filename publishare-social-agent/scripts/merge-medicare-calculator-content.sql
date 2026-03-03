-- Merge Optimized Content into Existing Medicare Calculator Article
-- This preserves SEO value by keeping the existing URL (medicare-cost-calculator)
-- and merging all optimized content from the new article

BEGIN;

-- Step 1: Merge optimized content into existing article
UPDATE articles
SET 
  -- Content: Merge optimized content and ensure calculator/form markers
  content = COALESCE(
    (SELECT content FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    content
  ),
  
  -- HTML Body: Use optimized HTML if available
  html_body = COALESCE(
    (SELECT html_body FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    html_body
  ),
  
  -- Title: Update to optimized title (more descriptive)
  title = COALESCE(
    (SELECT title FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    title
  ),
  
  -- Excerpt: Use optimized excerpt
  excerpt = COALESCE(
    (SELECT excerpt FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    excerpt
  ),
  
  -- Meta fields: Merge all SEO metadata
  meta_title = COALESCE(
    (SELECT meta_title FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    meta_title
  ),
  meta_description = COALESCE(
    (SELECT meta_description FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    meta_description
  ),
  focus_keyword = COALESCE(
    (SELECT focus_keyword FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    focus_keyword
  ),
  
  -- OG/Twitter metadata
  og_title = COALESCE(
    (SELECT og_title FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    og_title
  ),
  og_description = COALESCE(
    (SELECT og_description FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    og_description
  ),
  og_image = COALESCE(
    (SELECT og_image FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    og_image
  ),
  twitter_title = COALESCE(
    (SELECT twitter_title FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    twitter_title
  ),
  twitter_description = COALESCE(
    (SELECT twitter_description FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    twitter_description
  ),
  twitter_image = COALESCE(
    (SELECT twitter_image FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    twitter_image
  ),
  
  -- AEO fields: Merge all AEO optimization
  aeo_answer_first = COALESCE(
    (SELECT aeo_answer_first FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    aeo_answer_first
  ),
  aeo_summary = COALESCE(
    (SELECT aeo_summary FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    aeo_summary
  ),
  schema_markup = COALESCE(
    (SELECT schema_markup FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    schema_markup
  ),
  schema_validated = COALESCE(
    (SELECT schema_validated FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    schema_validated
  ),
  
  -- Featured image: Use optimized image if available
  featured_image_url = COALESCE(
    (SELECT featured_image_url FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    featured_image_url
  ),
  featured_image_alt = COALESCE(
    (SELECT featured_image_alt FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    featured_image_alt
  ),
  
  -- Canonical: Set to itself (this is the canonical URL)
  canonical_url = 'https://seniorsimple.org/medicare-cost-calculator',
  
  -- Breadcrumb
  breadcrumb_title = COALESCE(
    (SELECT breadcrumb_title FROM articles WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53'),
    breadcrumb_title
  ),
  
  -- Status: Ensure published
  status = 'published',
  
  -- Update timestamp
  updated_at = NOW()
WHERE id = 'ad30aeec-eee5-489d-85ba-99c584d9537a';

-- Step 2: Ensure content has calculator and form markers
-- Add markers if they don't exist in the merged content
UPDATE articles
SET 
  content = CASE 
    -- If content doesn't have calculator marker, add it before any summary section
    WHEN content NOT LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' 
    THEN content || E'\n\n## Use Our Medicare Cost Calculator\n\n[EMBEDDED CALCULATOR WILL APPEAR HERE]\n\n## Summary and Next Steps\n\nAfter using the calculator above, you can see your estimated Medicare costs. Here are the next steps:\n\n1. **Review Your Results**: Compare your estimated costs with your budget\n2. **Compare Plans**: Use Medicare Plan Finder to compare available plans in your area\n3. **Get Personalized Help**: Speak with a licensed Medicare advisor to find the best plan for your needs\n4. **Enroll During Your Window**: Make sure to enroll during your Initial Enrollment Period to avoid penalties\n\n## Get a Personalized Medicare Quote\n\nReady to find the best Medicare plan for your situation? Fill out the form below to get personalized recommendations from licensed Medicare advisors.\n\n[LEAD FORM WILL APPEAR HERE]'
    -- If content has calculator marker but not form marker, add form marker
    WHEN content LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' 
     AND content NOT LIKE '%[LEAD FORM WILL APPEAR HERE]%'
    THEN content || E'\n\n## Get a Personalized Medicare Quote\n\nReady to find the best Medicare plan for your situation? Fill out the form below to get personalized recommendations from licensed Medicare advisors.\n\n[LEAD FORM WILL APPEAR HERE]'
    ELSE content
  END,
  
  -- Ensure HTML body has section IDs
  html_body = CASE 
    WHEN html_body IS NULL OR html_body = '' 
    THEN '<div id="article">' || COALESCE(content, '') || '</div><div id="calculator"></div><div id="summary"></div><div id="form"></div>'
    WHEN html_body NOT LIKE '%id="calculator"%'
    THEN html_body || '<div id="calculator"></div><div id="summary"></div><div id="form"></div>'
    ELSE html_body
  END
WHERE id = 'ad30aeec-eee5-489d-85ba-99c584d9537a';

-- Step 3: Delete the duplicate article (the new one)
DELETE FROM articles 
WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53';

-- Step 4: Verify the merge
SELECT 
  '✅ MERGED ARTICLE' as status,
  id,
  title,
  slug,
  canonical_url,
  status,
  CASE 
    WHEN content LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' THEN '✅ Has calculator marker'
    ELSE '❌ Missing calculator marker'
  END as calculator_marker,
  CASE 
    WHEN content LIKE '%[LEAD FORM WILL APPEAR HERE]%' THEN '✅ Has form marker'
    ELSE '❌ Missing form marker'
  END as form_marker,
  CASE 
    WHEN html_body LIKE '%id="calculator"%' THEN '✅ Has calculator section ID'
    ELSE '❌ Missing calculator section ID'
  END as calculator_section,
  LENGTH(content) as content_length,
  LENGTH(html_body) as html_body_length,
  aeo_answer_first,
  schema_validated
FROM articles
WHERE id = 'ad30aeec-eee5-489d-85ba-99c584d9537a';

COMMIT;

-- Final verification: Check that duplicate is gone
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Duplicate article deleted successfully'
    ELSE '⚠️  Duplicate article still exists'
  END as deletion_status
FROM articles
WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53';

