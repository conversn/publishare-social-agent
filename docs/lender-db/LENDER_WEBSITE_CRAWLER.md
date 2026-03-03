# Lender Website Crawler - Edge Function

## 📋 Overview

Smart agent edge function that crawls lender websites to find and update information. Specifically focuses on:
- **Business lending information** (SBA loans, commercial loans, etc.)
- **Public contact information** (phones, emails)
- **Service offerings** (loan types, programs)
- **State availability**
- **Website metadata**

All discovered data is stored in **gated fields** and never displayed in public CMS.

---

## 🚀 Usage

### Endpoint

```
POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler
```

### Request Body

```json
{
  "lender_id": "optional-uuid",           // Crawl specific lender
  "site_id": "rateroots",                // Default: 'rateroots'
  "crawl_all": false,                    // Crawl all lenders (default: false)
  "max_lenders": 10,                     // Max lenders per run (default: 10)
  "focus_business_lending": true,        // Focus on business lending (default: true)
  "update_existing": true,               // Update database (default: true)
  "dry_run": false                       // Test without updating (default: false)
}
```

### Response

```json
{
  "success": true,
  "crawled": 10,
  "updated": 8,
  "found_business_lending": 3,
  "errors": 1,
  "results": [
    {
      "lender_id": "uuid",
      "lender_name": "American Financial Resources",
      "website_url": "https://www.afrwholesale.com",
      "found_data": {
        "business_lending": true,
        "business_loan_types": ["SBA", "commercial"],
        "public_info": {
          "website_title": "AFR Wholesale",
          "services_mentioned": ["FHA", "VA", "conventional"],
          "states_mentioned": ["CA", "NV", "AZ"]
        },
        "updated_fields": ["special_features", "internal_notes"]
      },
      "status": "success"
    }
  ],
  "timestamp": "2025-12-02T00:00:00.000Z"
}
```

---

## 🔍 What It Crawls

### Business Lending Detection

Searches for keywords:
- Business loan
- Commercial loan
- SBA loan
- Small business
- Business financing
- Commercial mortgage
- Business credit
- Equipment financing
- Working capital
- Business line of credit
- Invoice factoring
- Merchant cash advance
- Business term loan

### Public Information Extraction

1. **Contact Information** (stored in gated `internal_notes`)
   - Phone numbers
   - Email addresses
   - Source: website_crawl

2. **Service Offerings**
   - Residential mortgage
   - Refinance
   - Home purchase
   - FHA, VA, USDA
   - Conventional, Jumbo
   - Non-QM, DSCR
   - Investment property

3. **State Availability**
   - Extracts state codes mentioned
   - Updates `states_available` if not already set

4. **Website Metadata**
   - Website title
   - Last crawled timestamp
   - URL

---

## 📊 Data Storage

### `special_features` JSONB Field

```json
{
  "website_info": {
    "url": "https://www.lender.com",
    "title": "Lender Name",
    "last_crawled": "2025-12-02T00:00:00.000Z"
  },
  "business_lending": {
    "available": true,
    "loan_types": ["SBA", "commercial"],
    "confidence": 0.85,
    "detected_at": "2025-12-02T00:00:00.000Z"
  }
}
```

### `internal_notes` JSONB Field

```json
{
  "public_contact_info": {
    "phones": ["555-1234", "555-5678"],
    "emails": ["info@lender.com"],
    "source": "website_crawl",
    "crawled_at": "2025-12-02T00:00:00.000Z"
  }
}
```

### `states_available` Array Field

Updated if not already set:
```json
["CA", "NV", "AZ", "TX", "FL"]
```

---

## 🔒 Security & Privacy

### Gated Data
- ✅ All crawled data stored in gated fields
- ✅ Contact info in `internal_notes` (broker portal only)
- ✅ Business lending info in `special_features` (broker portal only)
- ❌ Never displayed in public CMS

### Rate Limiting
- 2 second delay between requests
- 10 second timeout per request
- Respects website response times

### User Agent
```
Mozilla/5.0 (compatible; RateRootsBot/1.0; +https://rateroots.com/bot)
```

---

## 🛠️ Deployment

### Deploy Function

```bash
cd supabase/functions
supabase functions deploy lender-website-crawler --project-ref vpysqshhafthuxvokwqj
```

### Set Secrets (if needed)

```bash
supabase secrets set SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co --project-ref vpysqshhafthuxvokwqj
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key --project-ref vpysqshhafthuxvokwqj
```

---

## 📝 Usage Examples

### Crawl Single Lender

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lender_id": "89dced6c-66ee-4648-b0ff-981ffc2c1eda",
    "focus_business_lending": true
  }'
```

### Dry Run (Test)

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_lenders": 5,
    "dry_run": true
  }'
```

### Crawl All Lenders (Batch)

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "crawl_all": true,
    "max_lenders": 50,
    "focus_business_lending": true
  }'
```

### Focus on Business Lending Only

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "crawl_all": false,
    "max_lenders": 20,
    "focus_business_lending": true,
    "update_existing": true
  }'
```

---

## 🔄 Scheduling

### Option 1: Supabase Cron Jobs

Create a cron job to run weekly:

```sql
-- Add to Supabase SQL Editor
SELECT cron.schedule(
  'crawl-lender-websites',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'max_lenders', 20,
      'focus_business_lending', true
    )
  );
  $$
);
```

### Option 2: GitHub Actions

Create a scheduled workflow:

```yaml
name: Weekly Lender Crawl
on:
  schedule:
    - cron: '0 2 * * 0' # Every Sunday at 2 AM
jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - name: Crawl Lender Websites
        run: |
          curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"max_lenders": 20, "focus_business_lending": true}'
```

---

## 📊 Monitoring

### Check Crawl Results

```sql
-- View lenders with business lending
SELECT 
  name,
  special_features->'business_lending' as business_lending,
  special_features->'website_info' as website_info
FROM lenders
WHERE special_features->'business_lending'->>'available' = 'true'
ORDER BY name;
```

### Check Last Crawled

```sql
-- View crawl timestamps
SELECT 
  name,
  special_features->'website_info'->>'last_crawled' as last_crawled,
  special_features->'website_info'->>'url' as website_url
FROM lenders
WHERE special_features->'website_info' IS NOT NULL
ORDER BY (special_features->'website_info'->>'last_crawled') DESC NULLS LAST;
```

### Check Contact Info Found

```sql
-- View public contact info (gated)
SELECT 
  name,
  internal_notes->'public_contact_info' as contact_info
FROM lenders
WHERE internal_notes->'public_contact_info' IS NOT NULL;
```

---

## ⚠️ Error Handling

### Common Errors

1. **"No website URL found"**
   - Lender doesn't have website URL in database
   - Solution: Add website URL manually or improve URL detection

2. **"HTTP 403" or "HTTP 429"**
   - Website blocking crawler
   - Solution: Respect rate limits, may need to skip

3. **"Timeout"**
   - Website too slow to respond
   - Solution: Already handled with 10s timeout

4. **"No content retrieved"**
   - Website returned empty or invalid content
   - Solution: Check website manually

---

## 🔗 Related Documentation

- [Lender Directory System](./LENDER_DIRECTORY_SYSTEM.md)
- [RLS Policies and Security](./RLS_POLICIES_AND_SECURITY.md)
- [Detailed Tab Import Guide](./DETAILED_TAB_IMPORT_GUIDE.md)

---

**Created**: 2025-12-02  
**Status**: ✅ Ready for Deployment  
**Next**: Deploy and test with sample lenders


