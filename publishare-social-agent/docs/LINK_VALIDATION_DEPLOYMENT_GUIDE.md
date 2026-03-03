# Link Validation System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Link Validation System to preview/production. This system prevents 404 errors from broken internal links by validating, tracking, and repairing links automatically.

---

## Prerequisites

- Supabase CLI installed and authenticated
- Access to Supabase project: `vpysqshhafthuxvokwqj`
- Service role key available
- Node.js installed (for validation scripts)

---

## Deployment Steps

### Step 1: Deploy Database Migration

**File**: `supabase/migrations/20250129000000_add_link_validation_system.sql`

```bash
cd supabase
supabase db push --include-all
```

**What this does**:
- Adds `article_route_path` column to `sites` table
- Creates `link_validation_results` table
- Creates `broken_links_summary` view
- Sets route paths: RateRoots = `/library`, SeniorSimple = `/articles`

**Verification**:
```sql
-- Check sites table has article_route_path
SELECT id, article_route_path FROM sites;

-- Check link_validation_results table exists
SELECT COUNT(*) FROM link_validation_results;
```

---

### Step 2: Deploy Edge Functions

Deploy all three edge functions in order:

#### 2.1 Deploy link-validator

```bash
supabase functions deploy link-validator
```

**Endpoint**: `/functions/v1/link-validator`

**Purpose**: Validates internal links in articles

**Verification**:
```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/link-validator \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"site_id": "rateroots", "validate_all": false}'
```

#### 2.2 Deploy link-repair

```bash
supabase functions deploy link-repair
```

**Endpoint**: `/functions/v1/link-repair`

**Purpose**: Automatically repairs broken links

**Verification**:
```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/link-repair \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"site_id": "rateroots", "repair_all": false}'
```

#### 2.3 Deploy ai-link-suggestions (Updated)

```bash
supabase functions deploy ai-link-suggestions
```

**Endpoint**: `/functions/v1/ai-link-suggestions`

**Purpose**: Generates link suggestions (now only real articles, no fake keyword links)

**Changes**:
- ✅ Only suggests real articles from database
- ✅ Filters by `site_id` for site-specific links
- ✅ Uses correct route paths from `sites.article_route_path`
- ✅ Removed fake keyword-based suggestions

**Verification**:
```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/ai-link-suggestions \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content": "Business loans are important", "site_id": "rateroots", "max_suggestions": 3}'
```

#### 2.4 Deploy agentic-content-gen (Updated)

```bash
supabase functions deploy agentic-content-gen
```

**Endpoint**: `/functions/v1/agentic-content-gen`

**Changes**:
- Now passes `site_id` to `ai-link-suggestions` for correct URL patterns

---

### Step 3: Run Initial Validation

**Script**: `scripts/validate-all-links.js`

```bash
cd scripts
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key' \
  node validate-all-links.js --site rateroots
```

**Expected Output**:
```
✅ Validation Complete!
📊 Summary:
   Articles validated: 48
   Links checked: 100
   Broken links: 0
```

---

### Step 4: Clean Up Existing Broken Links (If Any)

If validation finds broken keyword-based links (like `/articles/loans`), remove them:

**Script**: `scripts/remove-broken-keyword-links.js`

```bash
cd scripts
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key' \
  node remove-broken-keyword-links.js --site=rateroots
```

**What it does**:
- Removes fake keyword-based links (e.g., `/articles/loans`, `/articles/business`)
- Replaces them with plain text
- Updates articles in database

---

## Configuration

### Site Route Paths

Route paths are stored in `sites.article_route_path`:

| Site ID | Route Path | Frontend Route |
|---------|-----------|----------------|
| `rateroots` | `/library` | `/library/[slug]` |
| `seniorsimple` | `/articles` | `/articles/[slug]` |

**To update route paths**:
```sql
UPDATE sites 
SET article_route_path = '/your-route-path' 
WHERE id = 'site-id';
```

---

## Testing

### Test Link Validation

```bash
# Validate all RateRoots articles
node scripts/validate-all-links.js --site rateroots

# Validate all articles
node scripts/validate-all-links.js

# Validate and repair
node scripts/validate-all-links.js --site rateroots --repair
```

### Test Link Suggestions

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/ai-link-suggestions \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "SBA loans are government-backed financing options",
    "site_id": "rateroots",
    "max_suggestions": 5
  }'
```

**Expected**: Only real article suggestions with `/library/` URLs

---

## Monitoring

### Check Broken Links Summary

```sql
SELECT * FROM broken_links_summary;
```

### Check Validation Results

```sql
SELECT 
  a.title,
  lvr.link_url,
  lvr.is_valid,
  lvr.validation_status,
  lvr.error_message
FROM link_validation_results lvr
JOIN articles a ON a.id = lvr.article_id
WHERE lvr.is_valid = false
ORDER BY a.title;
```

### Count Broken Links by Site

```sql
SELECT 
  a.site_id,
  COUNT(*) as broken_links
FROM link_validation_results lvr
JOIN articles a ON a.id = lvr.article_id
WHERE lvr.is_valid = false
GROUP BY a.site_id;
```

---

## Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution**: Migration is idempotent, but if column exists, skip that part:
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sites' AND column_name = 'article_route_path';

-- If exists, manually set route paths:
UPDATE sites SET article_route_path = '/library' WHERE id = 'rateroots';
UPDATE sites SET article_route_path = '/articles' WHERE id = 'seniorsimple';
```

### Issue: Function deployment fails

**Solution**: 
1. Check Supabase CLI is authenticated: `supabase projects list`
2. Verify function files exist in `supabase/functions/`
3. Check function syntax: `deno check supabase/functions/link-validator/index.ts`

### Issue: Validation finds no links

**Solution**: 
- Check if articles have `html_body` or `content` populated
- Verify articles are published: `status = 'published'`
- Check route path is set: `SELECT article_route_path FROM sites WHERE id = 'rateroots'`

### Issue: Links still showing 404s

**Solution**:
1. Run validation: `node scripts/validate-all-links.js --site rateroots`
2. Check validation results: `SELECT * FROM link_validation_results WHERE is_valid = false`
3. Run repair: `node scripts/validate-all-links.js --site rateroots --repair`
4. Verify frontend routes match `article_route_path`

---

## Post-Deployment Checklist

- [ ] Migration deployed successfully
- [ ] All edge functions deployed
- [ ] Initial validation run (0 broken links)
- [ ] Route paths configured correctly
- [ ] Test link suggestions return real articles only
- [ ] Test new article generation creates valid links
- [ ] Monitoring queries work

---

## Scheduled Validation (Optional)

Set up a cron job to validate links periodically:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/publishare && SUPABASE_SERVICE_ROLE_KEY='key' node scripts/validate-all-links.js
```

Or use Supabase Edge Function cron (if available):
```json
{
  "cron": "0 2 * * *",
  "function": "link-validator",
  "body": {
    "validate_all": true,
    "repair": true
  }
}
```

---

## Rollback Plan

If issues occur, rollback steps:

1. **Disable link validation** (temporary):
   ```sql
   -- No direct disable, but can skip validation in agentic-content-gen
   ```

2. **Revert functions** (if needed):
   ```bash
   # Redeploy previous versions
   supabase functions deploy ai-link-suggestions --version previous
   ```

3. **Remove validation table** (if needed):
   ```sql
   DROP TABLE IF EXISTS link_validation_results CASCADE;
   ALTER TABLE sites DROP COLUMN IF EXISTS article_route_path;
   ```

---

## Files Changed

| File | Purpose | Status |
|------|---------|--------|
| `migrations/20250129000000_add_link_validation_system.sql` | Database schema | ✅ Deploy |
| `functions/link-validator/index.ts` | Link validation | ✅ Deploy |
| `functions/link-repair/index.ts` | Link repair | ✅ Deploy |
| `functions/ai-link-suggestions/index.ts` | Updated suggestions | ✅ Deploy |
| `functions/agentic-content-gen/index.ts` | Pass site_id | ✅ Deploy |
| `scripts/validate-all-links.js` | Validation script | ✅ Use |
| `scripts/remove-broken-keyword-links.js` | Cleanup script | ✅ Use |

---

## Success Criteria

✅ **Deployment is successful when**:
1. Migration runs without errors
2. All functions deploy successfully
3. Validation finds 0 broken links (or repairs them)
4. New articles generate valid links only
5. Link suggestions return real articles with correct URLs

---

## Support

**Documentation**:
- Full system docs: `docs/LINK_VALIDATION_SYSTEM.md`
- Architecture: See migration file comments

**Common Issues**:
- See Troubleshooting section above
- Check Supabase function logs in dashboard

---

**Last Updated**: 2025-01-29
**Status**: ✅ Ready for Preview Deployment




