-- Finalize Medicare Calculator Canonical Structure
-- This ensures the new article has proper content structure with all sections

-- Step 1: Update new article content to include calculator marker
-- The marker [EMBEDDED CALCULATOR WILL APPEAR HERE] allows the page to split content
UPDATE articles
SET 
  -- Add calculator marker in content if not present
  content = CASE 
    WHEN content NOT LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' 
    THEN content || E'\n\n## Use Our Medicare Cost Calculator\n\n[EMBEDDED CALCULATOR WILL APPEAR HERE]\n\n## Summary and Next Steps\n\nAfter using the calculator above, you can see your estimated Medicare costs. Here are the next steps:\n\n1. **Review Your Results**: Compare your estimated costs with your budget\n2. **Compare Plans**: Use Medicare Plan Finder to compare available plans in your area\n3. **Get Personalized Help**: Speak with a licensed Medicare advisor to find the best plan for your needs\n4. **Enroll During Your Window**: Make sure to enroll during your Initial Enrollment Period to avoid penalties\n\n## Get a Personalized Medicare Quote\n\nReady to find the best Medicare plan for your situation? Fill out the form below to get personalized recommendations from licensed Medicare advisors.\n\n[LEAD FORM WILL APPEAR HERE]'
    ELSE content
  END,
  
  -- Update HTML body to include section IDs
  html_body = CASE 
    WHEN html_body IS NULL OR html_body = '' 
    THEN '<div id="article">' || COALESCE(content, '') || '</div><div id="calculator"></div><div id="summary"></div><div id="form"></div>'
    WHEN html_body NOT LIKE '%id="calculator"%'
    THEN html_body || '<div id="calculator"></div><div id="summary"></div><div id="form"></div>'
    ELSE html_body
  END,
  
  -- Ensure canonical is set
  canonical_url = 'https://seniorsimple.org/medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs',
  
  -- Set as published
  status = 'published',
  
  updated_at = NOW()
WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53';

-- Step 2: Verify the structure
SELECT 
  id,
  title,
  slug,
  canonical_url,
  status,
  CASE 
    WHEN content LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' THEN '✅ Has calculator marker'
    ELSE '❌ Missing calculator marker'
  END as calculator_marker_status,
  CASE 
    WHEN content LIKE '%[LEAD FORM WILL APPEAR HERE]%' THEN '✅ Has form marker'
    ELSE '❌ Missing form marker'
  END as form_marker_status,
  CASE 
    WHEN html_body LIKE '%id="calculator"%' THEN '✅ Has calculator section ID'
    ELSE '❌ Missing calculator section ID'
  END as calculator_section_status,
  LENGTH(content) as content_length,
  LENGTH(html_body) as html_body_length
FROM articles
WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53';

-- Step 3: Show both articles for comparison
SELECT 
  CASE WHEN id = '4cf33b5a-575f-499d-b4c1-f58846720b53' THEN 'NEW (Canonical)' ELSE 'OLD' END as article_type,
  id,
  title,
  slug,
  canonical_url,
  status
FROM articles
WHERE id IN ('4cf33b5a-575f-499d-b4c1-f58846720b53', 'ad30aeec-eee5-489d-85ba-99c584d9537a')
ORDER BY 
  CASE WHEN id = '4cf33b5a-575f-499d-b4c1-f58846720b53' THEN 1 ELSE 2 END;

