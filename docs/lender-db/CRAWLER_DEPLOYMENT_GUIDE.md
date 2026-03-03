# Lender Website Crawler - Deployment Guide

## 🚀 Quick Deployment

### Step 1: Run Database Migration

Add `website_url` column to lenders table:

```bash
cd supabase
supabase db push
```

Or run in Supabase SQL Editor:
```sql
-- File: supabase/migrations/20251202000000_add_website_url_to_lenders.sql
ALTER TABLE lenders 
ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_lenders_website_url 
ON lenders(website_url) 
WHERE website_url IS NOT NULL;
```

### Step 2: Deploy Edge Function

```bash
cd supabase/functions
supabase functions deploy lender-website-crawler --project-ref vpysqshhafthuxvokwqj
```

### Step 3: Test Function

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_lenders": 1,
    "dry_run": true
  }'
```

---

## ✅ Verification

### Check Function is Deployed

```bash
supabase functions list --project-ref vpysqshhafthuxvokwqj | grep lender-website-crawler
```

### Test with Single Lender

```bash
# Get a lender ID first
# Then test crawl
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lender_id": "YOUR_LENDER_ID",
    "dry_run": false
  }'
```

### Verify Data Updated

```sql
-- Check for business lending info
SELECT 
  name,
  special_features->'business_lending' as business_lending,
  special_features->'website_info' as website_info
FROM lenders
WHERE special_features->'business_lending' IS NOT NULL
LIMIT 5;
```

---

## 📋 Full Documentation

See [LENDER_WEBSITE_CRAWLER.md](./LENDER_WEBSITE_CRAWLER.md) for complete usage guide.

---

**Status**: ✅ Ready for Deployment


