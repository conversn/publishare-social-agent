# HomeSimple Local Page Strategy Workflow

Complete workflow for generating and processing local page strategies for HomeSimple.org.

---

## Overview

This workflow generates content strategies for local pages (city/vertical combinations) and processes them into published articles.

**Flow:**
1. **Migration**: Ensure `content_strategy` table has `metadata` column
2. **Generate Strategies**: Create strategies for all cities/verticals from `domains` table
3. **Process Strategies**: Use `batch-strategy-processor` to generate articles
4. **Verify**: Check generated articles and strategy status

---

## Step 1: Run Migration

**In Supabase Dashboard → SQL Editor**, run:

```sql
-- File: supabase/migrations/20250203000001_ensure_content_strategy_metadata.sql
```

This ensures:
- `metadata` JSONB column exists in `content_strategy` table
- Indexes are created for efficient queries
- Proper documentation comments

---

## Step 2: Generate Local Strategies

### Option A: Using Supabase Dashboard

1. Go to **Edge Functions** → **generate-local-strategies**
2. Click **"Invoke Function"**
3. Use payload:

```json
{
  "site_id": "homesimple",
  "limit": 5,
  "create_strategies": true
}
```

**Parameters:**
- `site_id`: Site identifier (default: "homesimple")
- `city`: Optional - filter by specific city
- `state`: Optional - filter by specific state
- `vertical`: Optional - filter by vertical (hvac, plumbing, pest, roof, windows)
- `limit`: Max strategies per city/vertical (default: 5)
- `create_strategies`: Actually create strategies (default: true, set false for dry run)

### Option B: Using curl

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/generate-local-strategies' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 5,
    "create_strategies": true
  }'
```

### Option C: Generate for Specific City/Vertical

```json
{
  "site_id": "homesimple",
  "city": "Tampa",
  "state": "FL",
  "vertical": "hvac",
  "limit": 3,
  "create_strategies": true
}
```

### What Gets Created

For each city/vertical combination in `domains` table:
- 5 strategies (or `limit` specified)
- Each with proper metadata:
  ```json
  {
    "city": "Tampa",
    "state": "FL",
    "vertical": "hvac",
    "page_type": "local_page",
    "domain_id": "uuid",
    "phone_number": "813-XXX-XXXX",
    "call_routing_configured": true
  }
  ```
- Status: "Planned"
- Priority: "High"

---

## Step 3: Verify Strategies Created

```sql
SELECT 
  id,
  content_title,
  primary_keyword,
  status,
  priority_level,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  metadata->>'domain_id' as domain_id,
  created_at
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status = 'Planned'
  AND metadata->>'page_type' = 'local_page'
ORDER BY 
  metadata->>'city',
  metadata->>'vertical',
  created_at DESC
LIMIT 20;
```

---

## Step 4: Process Strategies

Use `batch-strategy-processor` to generate articles from strategies:

### Via Dashboard

1. Go to **Edge Functions** → **batch-strategy-processor**
2. Click **"Invoke Function"**
3. Use payload:

```json
{
  "site_id": "homesimple",
  "limit": 10,
  "priority_level": "High"
}
```

### Via curl

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 10,
    "priority_level": "High"
  }'
```

### What Happens

1. **Fetches Strategies**: Finds "Planned" strategies for homesimple
2. **Extracts Metadata**: Reads city, state, vertical, domain_id from metadata
3. **Fetches Local Facts**: Queries `local_facts` table for city-specific data
4. **Fetches Phone Number**: Gets phone from `domains` table if domain_id provided
5. **Generates Content**: Calls `agentic-content-gen` with all local page parameters
6. **Full Workflow**: AEO optimization, schema, images, links, HTML conversion
7. **Updates Status**: Sets strategy to "Completed" or "Failed"

---

## Step 5: Verify Generated Articles

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
  aeo_answer_first,
  schema_markup IS NOT NULL as has_schema,
  created_at
FROM articles
WHERE site_id = 'homesimple'
  AND page_type = 'local_page'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Strategy Status

```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(last_generation_attempt) as last_attempt
FROM content_strategy
WHERE site_id = 'homesimple'
  AND metadata->>'page_type' = 'local_page'
GROUP BY status;
```

---

## Complete Workflow Example

### Generate Strategies for All Cities/Verticals

```bash
# 1. Generate strategies (5 per city/vertical)
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/generate-local-strategies' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'apikey: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 5,
    "create_strategies": true
  }'
```

### Process in Batches

```bash
# 2. Process 10 strategies at a time
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'apikey: YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 10,
    "priority_level": "High"
  }'
```

Repeat step 2 until all strategies are processed.

---

## Metadata Alignment

### Strategy Metadata → Article Fields

When `batch-strategy-processor` processes a strategy, it maps metadata to article fields:

| Strategy Metadata | Article Field | Notes |
|-------------------|---------------|-------|
| `metadata.city` | `articles.city` | Direct mapping |
| `metadata.state` | `articles.state` | Direct mapping |
| `metadata.vertical` | `articles.vertical` | Direct mapping |
| `metadata.page_type` | `articles.page_type` | Should be "local_page" |
| `metadata.domain_id` | `articles.domain_id` | Links to domains table |
| `metadata.phone_number` | `articles.phone_number` | Fetched from domain if not in metadata |
| `metadata.service_areas` | `articles.service_areas` | Array of service areas |

### Required Metadata Fields

For local pages, strategy metadata MUST include:

```json
{
  "city": "Tampa",           // Required
  "state": "FL",             // Required
  "vertical": "hvac",         // Required
  "page_type": "local_page"  // Required
}
```

### Optional Metadata Fields

```json
{
  "domain_id": "uuid",                    // Optional - links to domains table
  "phone_number": "813-XXX-XXXX",        // Optional - fetched from domain if not provided
  "service_areas": ["Area1", "Area2"],    // Optional - array of service areas
  "call_routing_configured": true        // Optional - whether call routing is set up
}
```

---

## Troubleshooting

### No Strategies Generated

**Check:**
```sql
SELECT COUNT(*) 
FROM domains 
WHERE status = 'active';
```

**Fix:** Ensure `domains` table has active entries with city, state, vertical populated.

### Strategies Not Processing

**Check:**
```sql
SELECT status, COUNT(*) 
FROM content_strategy 
WHERE site_id = 'homesimple' 
  AND metadata->>'page_type' = 'local_page'
GROUP BY status;
```

**If stuck in "In Progress":**
```sql
UPDATE content_strategy
SET status = 'Planned'
WHERE status = 'In Progress'
  AND last_generation_attempt < NOW() - INTERVAL '1 hour'
  AND site_id = 'homesimple';
```

### Missing Local Facts

**Check:**
```sql
SELECT city, state, vertical, COUNT(*) 
FROM local_facts 
WHERE verified = true
GROUP BY city, state, vertical;
```

**Fix:** Use `populate-local-facts` function to populate missing facts.

### Metadata Not Aligned

**Verify alignment:**
```sql
SELECT 
  s.id as strategy_id,
  s.metadata->>'city' as strategy_city,
  s.metadata->>'state' as strategy_state,
  s.metadata->>'vertical' as strategy_vertical,
  a.id as article_id,
  a.city as article_city,
  a.state as article_state,
  a.vertical as article_vertical
FROM content_strategy s
LEFT JOIN articles a ON a.id = (
  SELECT id FROM articles 
  WHERE content_strategy_id = s.id 
  LIMIT 1
)
WHERE s.site_id = 'homesimple'
  AND s.metadata->>'page_type' = 'local_page'
LIMIT 10;
```

---

## Quick Reference

**Generate Strategies:**
- Function: `generate-local-strategies`
- Creates strategies from `domains` table
- Includes proper metadata for local pages

**Process Strategies:**
- Function: `batch-strategy-processor`
- Generates articles from strategies
- Maps metadata to article fields
- Fetches local facts and phone numbers

**Verify:**
- Check `content_strategy` table for status
- Check `articles` table for generated content
- Verify metadata alignment

---

## Next Steps

1. **Scale Up**: Generate strategies for all cities/verticals
2. **Automate**: Set up scheduled runs for strategy generation
3. **Monitor**: Track strategy completion rates
4. **Optimize**: Adjust strategy titles/keywords based on performance

