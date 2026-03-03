# 🔐 Supabase Secrets Setup for Google Custom Search

## Quick Setup Guide

### Step 1: Access Supabase Secrets

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj)
2. Navigate to **Project Settings** (gear icon in sidebar)
3. Click **Edge Functions** → **Secrets**

### Step 2: Add Secrets

Click **"Add new secret"** and add these two secrets:

#### Secret 1:
- **Name**: `GOOGLE_CUSTOM_SEARCH_API_KEY`
- **Value**: `AIzaSyBYVBTnosf3ST4zCbFa5PVdUbatZSN4fd8`

#### Secret 2:
- **Name**: `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
- **Value**: `42b426fff11f742d0`

### Step 3: Verify

After adding both secrets, they should appear in your secrets list.

### Step 4: Test

Once secrets are set, test the crawler with URL correction enabled:

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_lenders": 5,
    "auto_correct_urls": true,
    "focus_business_lending": true
  }'
```

## What Happens Next

Once secrets are configured:
- ✅ Crawler will use Google Custom Search API for URL correction
- ✅ More reliable than scraping method
- ✅ Better rate limits
- ✅ Structured search results

## Troubleshooting

### "API key not valid" error
- Verify API key is correct: `AIzaSyBYVBTnosf3ST4zCbFa5PVdUbatZSN4fd8`
- Check that Custom Search API is enabled in Google Cloud Console

### "Invalid search engine ID" error
- Verify Search Engine ID is correct: `42b426fff11f742d0`
- Check that the search engine is set to search the entire web

### Secrets not working
- Ensure secrets are set in **Edge Functions** → **Secrets** (not regular environment variables)
- Redeploy the edge function if needed: `supabase functions deploy lender-website-crawler`

---

**Status**: ✅ Ready to configure  
**Next**: Add secrets in Supabase Dashboard


