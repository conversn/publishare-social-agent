# 🔐 Google Service Account Setup for Custom Search API

## Important Note

**Google Custom Search API uses API key authentication, not service account OAuth.**

However, you can:
1. **Use the service account's project** to create an API key
2. **Use the service account** for other Google APIs (Places, etc.) if needed
3. **Store the service account JSON** as a secret for future use

## Recommended Approach: Get API Key from Service Account Project

Since you have a service account for `prospect-warehouse` project:

### Step 1: Create API Key in Same Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **prospect-warehouse**
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **API key**
5. Copy the API key
6. (Optional) Restrict the key to "Custom Search API" for security

### Step 2: Create Custom Search Engine

1. Go to [Google Custom Search](https://programmablesearchengine.google.com/)
2. Click **Add** to create a new search engine
3. Set to search the **entire web**
4. Copy the **Search Engine ID** (CX)

### Step 3: Enable Custom Search API

1. In Google Cloud Console → **APIs & Services** → **Library**
2. Search for "Custom Search API"
3. Click **Enable**

### Step 4: Set Environment Variables in Supabase

In Supabase Dashboard → Edge Functions → Settings → Secrets:

```
GOOGLE_CUSTOM_SEARCH_API_KEY=your_api_key_here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id_here
```

## Alternative: Store Service Account for Future Use

If you want to use the service account for other Google APIs later:

### Store Service Account JSON as Secret

In Supabase Dashboard → Edge Functions → Settings → Secrets:

```
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"prospect-warehouse",...}
```

**Note**: This is a large secret. Consider storing it in a secure vault instead.

## Why API Key Instead of Service Account?

1. **Simpler**: No JWT token generation needed
2. **Direct**: Works immediately with Custom Search API
3. **Standard**: Recommended by Google for Custom Search API
4. **Quota**: Same quota limits apply

## Service Account Use Cases

The service account (`ai-local@prospect-warehouse.iam.gserviceaccount.com`) is better suited for:

- ✅ **BigQuery** access
- ✅ **Cloud Storage** access
- ✅ **Other Google Cloud services**
- ✅ **Admin SDK APIs**
- ❌ **Custom Search API** (uses API key)

## Current Implementation

The crawler supports:
1. **API Key** (primary method) ✅
2. **Service Account JSON** (detected but not used for Custom Search)
3. **Fallback scraping** (if neither configured)

## Quick Setup

```bash
# 1. Get API key from prospect-warehouse project
# 2. Create Custom Search Engine
# 3. Set secrets in Supabase:

GOOGLE_CUSTOM_SEARCH_API_KEY=AIza...
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=abc123...
```

## Testing

After setup, test with:

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_lenders": 3,
    "auto_correct_urls": true
  }'
```

---

**Recommendation**: Use API key from the `prospect-warehouse` project for Custom Search API.


