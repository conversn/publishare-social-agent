# HomeSimple.org Content Strategy Guide

## Using Content-Strategist & Batch-Strategy-Processor for Local SEO Pages

This guide explains how to use the enhanced content strategy system to generate unique local SEO pages for HomeSimple.org.

---

## Overview

The workflow for generating local pages:

```
plan-pages (or manual SQL) → content_strategy table → batch-strategy-processor → agentic-content-gen → articles table
```

---

## Step 1: Create Local Page Strategy Entries

### Option A: Use `plan-pages` Function (Recommended)

The `plan-pages` function automatically creates strategy entries with local metadata:

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/plan-pages' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "vertical": "hvac",
    "target_cities": ["Tampa", "Miami", "Orlando"],
    "generate_content_strategy_entries": true,
    "generate_internal_links": true
  }'
```

This will:
- Analyze existing pages for each city/vertical
- Identify content gaps
- Create `content_strategy` entries with proper metadata
- Set status to "Planned"

### Option B: Manual SQL Insert

For more control, insert strategy entries directly:

```sql
INSERT INTO content_strategy (
  site_id,
  content_title,
  primary_keyword,
  content_type,
  category,
  status,
  priority_level,
  word_count,
  metadata
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
    '{
      "city": "Tampa",
      "state": "FL",
      "vertical": "hvac",
      "page_type": "local_page",
      "domain_id": "uuid-of-tampahvachelp-domain",
      "service_areas": ["Downtown Tampa", "Westshore", "Hyde Park"]
    }'::jsonb
  ),
  (
    'homesimple',
    'Furnace Repair Services in Tampa',
    'furnace repair Tampa',
    'local_page',
    'hvac',
    'Planned',
    'High',
    2000,
    '{
      "city": "Tampa",
      "state": "FL",
      "vertical": "hvac",
      "page_type": "local_page",
      "domain_id": "uuid-of-tampahvachelp-domain"
    }'::jsonb
  );
```

### Metadata Fields for Local Pages

The `metadata` JSONB column should include:

```json
{
  "city": "Tampa",                    // Required
  "state": "FL",                      // Required
  "vertical": "hvac",                 // Required (hvac, plumbing, pest, roof, windows)
  "page_type": "local_page",          // Required
  "domain_id": "uuid",                // Optional: Links to domains table
  "phone_number": "813-XXX-XXXX",     // Optional: Will be fetched from domain if not provided
  "service_areas": ["Area1", "Area2"], // Optional: Array of service areas
  "call_routing_configured": true    // Optional: Whether call routing is set up
}
```

---

## Step 2: Process Strategies with Batch-Strategy-Processor

### Basic Usage

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 5,
    "priority_level": "High"
  }'
```

### What Happens Automatically

1. **Fetches Strategies**: Queries `content_strategy` for "Planned" entries
2. **Extracts Local Metadata**: 
   - Reads `metadata` JSONB column
   - Extracts city, state, vertical, page_type, etc.
   - Falls back to direct fields if metadata not present
3. **Fetches Local Facts**: 
   - Automatically queries `local_facts` table
   - Retrieves neighborhoods, climate, common issues, regulations
   - Passes to content generation
4. **Fetches Phone Number**: 
   - If `domain_id` provided, fetches phone from `domains` table
   - Ensures phone number is available for local pages
5. **Calls agentic-content-gen**: 
   - With all local page parameters
   - Full workflow: AEO, schema, images, links, HTML conversion
6. **Updates Status**: 
   - Sets strategy to "Completed" or "Failed"
   - Links article_id to strategy

---

## Step 3: Verify Results

### Check Strategy Status

```sql
SELECT 
  id,
  content_title,
  status,
  priority_level,
  metadata->>'city' as city,
  metadata->>'state' as state,
  metadata->>'vertical' as vertical,
  last_generation_attempt
FROM content_strategy
WHERE site_id = 'homesimple'
  AND status IN ('Planned', 'In Progress', 'Completed', 'Failed')
ORDER BY last_generation_attempt DESC;
```

### Check Generated Articles

```sql
SELECT 
  id,
  title,
  page_type,
  city,
  state,
  vertical,
  phone_number,
  status,
  created_at
FROM articles
WHERE site_id = 'homesimple'
  AND page_type = 'local_page'
ORDER BY created_at DESC;
```

---

## Complete Workflow Example

### 1. Create Strategies for Multiple Cities/Verticals

```sql
-- Create strategies for Tampa HVAC
INSERT INTO content_strategy (site_id, content_title, primary_keyword, content_type, category, status, priority_level, word_count, metadata)
SELECT 
  'homesimple',
  'AC Repair in ' || city || '? Here''s What to Do',
  'AC repair ' || city,
  'local_page',
  vertical,
  'Planned',
  'High',
  2000,
  jsonb_build_object(
    'city', city,
    'state', state,
    'vertical', vertical,
    'page_type', 'local_page',
    'domain_id', domain_id
  )
FROM domains
WHERE vertical = 'hvac'
  AND city = 'Tampa'
  AND state = 'FL';
```

### 2. Process in Batches

```bash
# Process 5 high-priority strategies
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 5,
    "priority_level": "High"
  }'
```

### 3. Monitor Progress

```sql
-- Check processing status
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE metadata->>'page_type' = 'local_page') as local_pages
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status;
```

---

## Enhanced Features

### Automatic Local Facts Integration

The processor automatically:
- Fetches verified local facts from `local_facts` table
- Organizes by fact type (neighborhoods, climate, common_issues, regulations)
- Passes to content generation for unique, city-specific content

### Phone Number Resolution

If `phone_number` not in metadata:
- Looks up `domain_id` in `domains` table
- Fetches phone number automatically
- Ensures local pages have tracking numbers

### Backward Compatibility

Supports both:
- **New format**: Metadata in JSONB column
- **Old format**: Direct fields on strategy (city, state, vertical, etc.)

---

## Best Practices

### 1. Batch Creation

Create strategies in batches by city/vertical:

```sql
-- Create strategies for all HVAC cities
INSERT INTO content_strategy (site_id, content_title, primary_keyword, content_type, category, status, priority_level, word_count, metadata)
SELECT 
  'homesimple',
  'Emergency AC Repair in ' || city || ', ' || state,
  'emergency AC repair ' || city || ' ' || state,
  'local_page',
  'hvac',
  'Planned',
  'High',
  2000,
  jsonb_build_object(
    'city', city,
    'state', state,
    'vertical', 'hvac',
    'page_type', 'local_page',
    'domain_id', id
  )
FROM domains
WHERE vertical = 'hvac'
  AND status = 'Active';
```

### 2. Priority Management

Set priorities based on:
- **High**: High-intent keywords, high search volume
- **Medium**: Supporting content, long-tail keywords
- **Low**: Niche topics, experimental content

### 3. Stagger Processing

Process in small batches to avoid timeouts:

```bash
# Process 3 at a time
for i in {1..10}; do
  curl -X POST ... -d '{"site_id": "homesimple", "limit": 3}'
  sleep 30  # Wait 30 seconds between batches
done
```

### 4. Quality Checks

After generation, verify:
- Local facts are integrated
- Phone numbers are present
- Content is unique (not doorway pages)
- Schema markup is generated
- Images are created

---

## Troubleshooting

### Strategies Not Processing

**Check:**
1. Status is "Planned" (not "In Progress" stuck)
2. `site_id` matches in request
3. Priority level filter matches

**Fix:**
```sql
-- Reset stuck strategies
UPDATE content_strategy
SET status = 'Planned'
WHERE status = 'In Progress'
  AND last_generation_attempt < NOW() - INTERVAL '1 hour';
```

### Missing Local Facts

**Check:**
```sql
SELECT city, state, vertical, COUNT(*) 
FROM local_facts 
WHERE verified = true
GROUP BY city, state, vertical;
```

**Fix:** Run `populate-local-facts` function for missing combinations.

### Missing Phone Numbers

**Check:**
```sql
SELECT d.city, d.state, d.vertical, d.phone_number
FROM domains d
LEFT JOIN articles a ON a.domain_id = d.id
WHERE a.page_type = 'local_page' AND a.phone_number IS NULL;
```

**Fix:** Update domains table with phone numbers or provide in metadata.

---

## Next Steps

1. **Bulk Strategy Creation**: Create script to generate strategies for all city/vertical combinations
2. **Scheduled Processing**: Set up cron job to process strategies automatically
3. **Quality Monitoring**: Track uniqueness scores and doorway risk
4. **Performance Tracking**: Monitor generation success rates and times

---

## Summary

The enhanced `batch-strategy-processor` now:
- ✅ Extracts local page metadata from strategy entries
- ✅ Automatically fetches local facts from database
- ✅ Resolves phone numbers from domains table
- ✅ Passes all local page parameters to content generation
- ✅ Supports both JSONB metadata and direct fields
- ✅ Provides detailed logging for debugging

This enables scalable, automated generation of unique local SEO pages for HomeSimple.org!

