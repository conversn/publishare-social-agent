# 🔍 Google URL Correction Feature

## Overview

The lender website crawler now includes **automatic URL correction** via Google search. When the crawler encounters invalid URLs (DNS errors, connection failures, etc.), it can automatically search Google to find the correct website URL and update the database.

## Features

- ✅ **Automatic URL Detection**: Detects DNS errors, connection failures, and invalid certificates
- ✅ **Google Search Integration**: Searches for lender name + "mortgage website"
- ✅ **Dual Search Methods**: 
  - Google Custom Search API (recommended, requires API key)
  - Fallback to Google search scraping
- ✅ **URL Validation**: Tests found URLs before updating database
- ✅ **Automatic Retry**: Retries crawl with corrected URL
- ✅ **Report Integration**: Shows corrected URLs in human-readable report

## Usage

### Enable URL Correction

Add `auto_correct_urls: true` to your crawler request:

```bash
curl -X POST https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "max_lenders": 10,
    "auto_correct_urls": true,
    "focus_business_lending": true
  }'
```

### Example Response

The response includes a new `url_corrected` field:

```json
{
  "success": true,
  "crawled": 10,
  "updated": 8,
  "url_corrected": 3,
  "results": [
    {
      "lender_name": "Cardinal Financial",
      "url_corrected": true,
      "original_url": "https://www.cardinal.com",
      "website_url": "https://www.cardinalmortgage.com",
      "status": "success"
    }
  ]
}
```

## Google Custom Search API Setup (Recommended)

For better results and reliability, set up Google Custom Search API:

### 1. Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Custom Search API"
4. Create credentials (API Key)
5. Restrict API key to "Custom Search API" for security

### 2. Create Custom Search Engine

1. Go to [Google Custom Search](https://programmablesearchengine.google.com/)
2. Click "Add" to create a new search engine
3. Set search engine to search the entire web
4. Copy the **Search Engine ID** (CX)

### 3. Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```
GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSyBYVBTnosf3ST4zCbFa5PVdUbatZSN4fd8
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=42b426fff11f742d0
```

✅ **Configuration Complete**: Both API key and Search Engine ID are ready. See `API_KEY_SETUP.md` for setup instructions.

### Benefits of Custom Search API

- ✅ More reliable results
- ✅ Higher rate limits
- ✅ Better structured data
- ✅ No risk of being blocked

## Fallback Method

If Google Custom Search API is not configured, the crawler falls back to:

1. **Google Search Scraping**: Fetches Google search results page
2. **HTML Parsing**: Extracts URLs from search results
3. **URL Filtering**: Filters out Google, social media, and non-lender sites
4. **Validation**: Tests URLs before using them

**Note**: This method is less reliable and may be rate-limited by Google.

## How It Works

### 1. Error Detection

When a crawl fails with:
- DNS errors (`dns error`, `failed to lookup`)
- Connection errors (`Connection`, `Name or service not known`)
- Certificate errors (`invalid peer certificate`)

The crawler triggers URL correction.

### 2. Google Search

Searches for: `"{Lender Name} mortgage website"`

Example: `"Cardinal Financial mortgage website"`

### 3. URL Extraction

- **Custom Search API**: Returns structured JSON with URLs
- **Scraping**: Parses HTML to extract search result URLs

### 4. URL Filtering

Filters out:
- Google's own pages
- Social media (YouTube, Facebook, LinkedIn, Twitter)
- Non-lender sites
- Keeps only `.com`, `.net`, `.org` domains

### 5. URL Validation

Tests each found URL:
- Sends HEAD request
- Checks if accessible (200 OK)
- Validates it's a real website

### 6. Database Update

If valid URL found:
- Updates `lenders.website_url` in database
- Stores original URL in `special_features.website_info.original_url`
- Marks as corrected: `special_features.website_info.url_corrected = true`

### 7. Retry Crawl

Automatically retries crawling with the corrected URL.

## Report Integration

The human-readable report includes a new section:

```
🔧 URLs CORRECTED VIA GOOGLE SEARCH
--------------------------------------------------------------------------------

1. Cardinal Financial
   Original: https://www.cardinal.com
   Corrected: https://www.cardinalmortgage.com

2. Bay Valley Mortgage
   Original: https://www.bayvalleyqualitybanc.com
   Corrected: https://www.bayvalleymortgage.com
```

## Rate Limiting

- **2 second delay** between Google searches
- **5 second timeout** for URL validation
- **Respectful crawling** to avoid being blocked

## Best Practices

1. **Use Custom Search API**: More reliable and faster
2. **Start Small**: Test with `max_lenders: 5` first
3. **Monitor Results**: Review corrected URLs in report
4. **Manual Review**: Some corrections may need manual verification
5. **Rate Limiting**: Don't run too frequently to avoid Google rate limits

## Limitations

- ⚠️ Google search may not always find the correct URL
- ⚠️ Some lenders may not have a public website
- ⚠️ Scraping method may be blocked by Google
- ⚠️ Found URLs may not be the official lender website
- ⚠️ Rate limiting may slow down crawling

## Troubleshooting

### No URLs Found

- Check if lender name is correct
- Try searching manually on Google
- Lender may not have a public website

### URLs Found But Invalid

- URL may require authentication
- Website may be temporarily down
- URL may be a redirect that fails

### Rate Limited

- Reduce `max_lenders` per run
- Add longer delays between requests
- Use Custom Search API for better limits

## Next Steps

1. ✅ Set up Google Custom Search API (recommended)
2. ✅ Test with small batch (`max_lenders: 5`)
3. ✅ Review corrected URLs in report
4. ✅ Run full crawl with `auto_correct_urls: true`
5. ✅ Monitor results and verify corrections

---

**Status**: ✅ Deployed and Ready  
**Last Updated**: 2025-12-02

