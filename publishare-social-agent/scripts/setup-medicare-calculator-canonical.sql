-- Setup Medicare Calculator Canonical Structure
-- This script structures the new article as the canonical page with proper sections

-- Step 1: Update the new article with structured content sections
-- The content should have markers for: #article, #calculator, #summary, #form

UPDATE articles
SET 
  -- Ensure canonical URL points to the new article
  canonical_url = 'https://seniorsimple.org/medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs',
  
  -- Add structured content with section markers
  -- The content will be split by [EMBEDDED CALCULATOR WILL APPEAR HERE] marker
  content = COALESCE(content, '') || 
    CASE 
      WHEN content NOT LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' 
      THEN E'\n\n[EMBEDDED CALCULATOR WILL APPEAR HERE]\n\n' 
      ELSE '' 
    END,
  
  -- Ensure HTML body has proper structure
  html_body = COALESCE(html_body, '') || 
    CASE 
      WHEN html_body NOT LIKE '%id="calculator"%' 
      THEN E'\n<div id="calculator"></div>\n<div id="summary"></div>\n<div id="form"></div>\n' 
      ELSE '' 
    END,
  
  -- Set as published
  status = 'published',
  
  -- Update metadata
  updated_at = NOW()
WHERE id = '4cf33b5a-575f-499d-b4c1-f58846720b53';

-- Step 2: Update the old article to point to the new one as canonical
UPDATE articles
SET 
  canonical_url = 'https://seniorsimple.org/medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs',
  updated_at = NOW()
WHERE id = 'ad30aeec-eee5-489d-85ba-99c584d9537a';

-- Step 3: Verify the structure
SELECT 
  id,
  title,
  slug,
  canonical_url,
  CASE 
    WHEN content LIKE '%[EMBEDDED CALCULATOR WILL APPEAR HERE]%' THEN '✅ Has calculator marker'
    ELSE '❌ Missing calculator marker'
  END as calculator_marker,
  CASE 
    WHEN html_body LIKE '%id="calculator"%' THEN '✅ Has calculator section'
    ELSE '❌ Missing calculator section'
  END as calculator_section,
  status
FROM articles
WHERE id IN ('4cf33b5a-575f-499d-b4c1-f58846720b53', 'ad30aeec-eee5-489d-85ba-99c584d9537a')
ORDER BY 
  CASE WHEN id = '4cf33b5a-575f-499d-b4c1-f58846720b53' THEN 1 ELSE 2 END;

