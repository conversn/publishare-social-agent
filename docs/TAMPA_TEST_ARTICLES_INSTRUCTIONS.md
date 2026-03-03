# Test 3 Tampa Articles - Complete Workflow Instructions

This guide walks you through creating and processing 3 test articles for Tampa using the complete content strategy workflow.

---

## Step 1: Create Strategy Entries

### Option A: Run SQL Script (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of: `scripts/create-tampa-test-strategies.sql`
3. Click "Run"

This will create 3 strategy entries:
- **AC Not Cooling in Tampa?** (HVAC)
- **Emergency Plumbing Services in Tampa** (Plumbing)
- **Pest Control Services in Tampa** (Pest)

### Option B: Manual SQL Insert

```sql
INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type, category,
  status, priority_level, word_count, metadata
) VALUES 
  (
    'homesimple',
    'AC Not Cooling in Tampa? Here''s What to Do',
    'AC not cooling Tampa',
    'local_page',
    'hvac',
    'Planned',
    'High',
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "hvac", "page_type": "local_page"}'::jsonb
  ),
  (
    'homesimple',
    'Emergency Plumbing Services in Tampa',
    'emergency plumber Tampa',
    'local_page',
    'plumbing',
    'Planned',
    'High',
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "plumbing", "page_type": "local_page"}'::jsonb
  ),
  (
    'homesimple',
    'Pest Control Services in Tampa: Complete Guide',
    'pest control Tampa',
    'local_page',
    'pest',
    'Planned',
    'High',
    2000,
    '{"city": "Tampa", "state": "FL", "vertical": "pest", "page_type": "local_page"}'::jsonb
  );
```

---

## Step 2: Verify Strategies Created

Run this query in Supabase SQL Editor:

```sql
SELECT 
  id,
  content_title,
  primary_keyword,
  category,
  status,
  priority_level,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  created_at
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'city' = 'Tampa'
ORDER BY created_at DESC
LIMIT 3;
```

You should see 3 strategies with status "Planned".

---

## Step 3: Trigger Batch Strategy Processor

### Method 1: Using Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard** → **Edge Functions** → **batch-strategy-processor**
2. Click **"Invoke Function"**
3. Use this payload:

```json
{
  "site_id": "homesimple",
  "limit": 3,
  "priority_level": "High"
}
```

4. Click **"Invoke"**

### Method 2: Using curl

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 3,
    "priority_level": "High"
  }'
```

### Method 3: Using Helper Script

```bash
cd scripts
./trigger-tampa-batch.sh YOUR_SERVICE_ROLE_KEY
```

---

## Step 4: Monitor Processing

### Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **batch-strategy-processor**
2. Click **"Logs"** tab
3. Look for:
   - `📝 Processing strategy: ...`
   - `🔍 Fetching local facts for Tampa, FL - hvac`
   - `✅ Fetched X local facts`
   - `🚀 Calling agentic-content-gen with params: ...`
   - `✅ Article created: ...`

### Check Strategy Status

```sql
SELECT 
  id,
  content_title,
  status,
  last_generation_attempt,
  metadata->>'city' as city,
  metadata->>'vertical' as vertical
FROM content_strategy
WHERE site_id = 'homesimple'
  AND metadata->>'city' = 'Tampa'
ORDER BY last_generation_attempt DESC
LIMIT 3;
```

Status should change from "Planned" → "In Progress" → "Completed"

---

## Step 5: Inspect Generated Articles

### View All Tampa Articles

```sql
SELECT 
  id,
  title,
  slug,
  city,
  state,
  vertical,
  page_type,
  phone_number,
  status,
  content_length,
  aeo_answer_first,
  schema_markup IS NOT NULL as has_schema,
  created_at
FROM articles
WHERE site_id = 'homesimple'
  AND city = 'Tampa'
  AND page_type = 'local_page'
ORDER BY created_at DESC
LIMIT 3;
```

### View Full Article Details

```sql
SELECT 
  id,
  title,
  slug,
  excerpt,
  city,
  state,
  vertical,
  phone_number,
  status,
  LEFT(content, 500) as content_preview,
  LEFT(html_body, 500) as html_preview,
  aeo_answer_first,
  schema_markup->>'@type' as schema_type,
  created_at
FROM articles
WHERE site_id = 'homesimple'
  AND city = 'Tampa'
  AND page_type = 'local_page'
ORDER BY created_at DESC
LIMIT 3;
```

### Check Article Quality

```sql
SELECT 
  a.id,
  a.title,
  a.city,
  a.vertical,
  qc.overall_score,
  qc.doorway_risk_score,
  qc.uniqueness_score,
  qc.can_publish
FROM articles a
LEFT JOIN quality_checks qc ON qc.page_id = a.id
WHERE a.site_id = 'homesimple'
  AND a.city = 'Tampa'
  AND a.page_type = 'local_page'
ORDER BY a.created_at DESC
LIMIT 3;
```

---

## What to Inspect

### ✅ Content Quality

1. **Answer-First Format**: First 100 words should directly answer the question
2. **Local Facts Integration**: Should include Tampa-specific neighborhoods, climate notes, common issues
3. **Narrative Flow**: Should read like premium content, not bullet-heavy
4. **AEO Optimization**: Check `aeo_answer_first` = true

### ✅ Local Page Features

1. **City/State/Vertical**: All fields populated correctly
2. **Phone Number**: Should have tracking number (if domain has one)
3. **Service Areas**: Should mention Tampa neighborhoods naturally
4. **Local Context**: Climate, regulations, city-specific issues

### ✅ Technical Features

1. **Schema Markup**: Check `schema_markup` column for LocalBusiness schema
2. **HTML Conversion**: `html_body` should be populated
3. **Featured Image**: Check if image was generated
4. **Internal Links**: Check if links were inserted

---

## Troubleshooting

### Strategies Not Processing

**Check:**
```sql
SELECT status, COUNT(*) 
FROM content_strategy 
WHERE site_id = 'homesimple' 
  AND metadata->>'city' = 'Tampa'
GROUP BY status;
```

**If stuck in "In Progress":**
```sql
UPDATE content_strategy
SET status = 'Planned'
WHERE status = 'In Progress'
  AND last_generation_attempt < NOW() - INTERVAL '1 hour'
  AND site_id = 'homesimple'
  AND metadata->>'city' = 'Tampa';
```

### Missing Local Facts

**Check:**
```sql
SELECT fact_type, COUNT(*) 
FROM local_facts 
WHERE city = 'Tampa' 
  AND state = 'FL' 
  AND verified = true
GROUP BY fact_type;
```

**If missing, populate:**
```bash
# Use populate-local-facts function
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/populate-local-facts' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "city": "Tampa",
    "state": "FL",
    "vertical": "hvac",
    "fact_types": ["neighborhood", "climate", "common_issue", "regulation"]
  }'
```

### Articles Not Created

**Check function logs** for errors:
- Authentication issues
- Missing local facts
- Content generation failures

**Check strategy status:**
```sql
SELECT 
  id,
  content_title,
  status,
  last_generation_attempt,
  error_message
FROM content_strategy
WHERE site_id = 'homesimple'
  AND metadata->>'city' = 'Tampa'
  AND status = 'Failed';
```

---

## Expected Results

After successful processing, you should have:

1. **3 Strategy Entries**: Status = "Completed"
2. **3 Articles**: In `articles` table with:
   - `page_type` = 'local_page'
   - `city` = 'Tampa'
   - `state` = 'FL'
   - `vertical` = 'hvac', 'plumbing', or 'pest'
   - `status` = 'draft' (or 'published' if auto_publish enabled)
3. **Local Facts Integrated**: Content should reference Tampa neighborhoods, climate, etc.
4. **AEO Optimized**: Answer-first format, schema markup, data points
5. **Quality Checks**: Entries in `quality_checks` table

---

## Next Steps

Once you've verified the 3 test articles:

1. **Review Content Quality**: Check narrative flow, local facts integration
2. **Test Publishing**: Publish one article and verify it appears on homesimple.org
3. **Scale Up**: Create strategies for all cities/verticals
4. **Automate**: Set up scheduled batch processing

---

## Quick Reference

**Create Strategies**: `scripts/create-tampa-test-strategies.sql`  
**Trigger Processing**: Supabase Dashboard → Edge Functions → batch-strategy-processor  
**Check Results**: SQL queries in Step 5 above

