# 🔑 Google Custom Search API Setup

## ✅ Configuration Complete

✅ **API Key**: `AIzaSyBYVBTnosf3ST4zCbFa5PVdUbatZSN4fd8`  
✅ **Search Engine ID (CX)**: `42b426fff11f742d0`

## Next Steps

### 1. Enable Custom Search API (if not already enabled)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **prospect-warehouse**
3. Navigate to **APIs & Services** → **Library**
4. Search for **"Custom Search API"**
5. Click **"Enable"**

### 2. Set Secrets in Supabase

In Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:

```
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyBYVBTnosf3ST4zCbFa5PVdUbatZSN4fd8
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=42b426fff11f742d0
```

**Copy these exact values:**
- Key: `GOOGLE_CUSTOM_SEARCH_API_KEY`
- Value: `AIzaSyBYVBTnosf3ST4zCbFa5PVdUbatZSN4fd8`

- Key: `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
- Value: `42b426fff11f742d0`

### 4. Verify Setup

After setting secrets, the crawler will automatically use the Custom Search API when `auto_correct_urls: true` is enabled.

## Testing

Once both secrets are set, test with:

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_lenders": 3,
    "auto_correct_urls": true
  }'
```

## Security Notes

⚠️ **Important**: 
- The API key is now visible in this file - consider rotating it after setup
- Restrict the API key to "Custom Search API" only in Google Cloud Console
- Set application restrictions if possible

---

**Status**: ✅ Ready to configure in Supabase

