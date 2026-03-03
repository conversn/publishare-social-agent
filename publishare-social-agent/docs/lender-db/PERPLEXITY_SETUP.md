# Perplexity AI Integration Setup

## Overview

The lender website crawler now uses Perplexity AI as a fallback when Google search doesn't find results. Perplexity is particularly good at understanding context and finding official websites even with unusual or complex lender names.

## Setup Instructions

### 1. Get Perplexity API Key

1. Go to [Perplexity AI](https://www.perplexity.ai/)
2. Sign up or log in
3. Navigate to API settings
4. Create a new API key
5. Copy the API key

### 2. Add to Supabase Secrets

Add the Perplexity API key to your Supabase Edge Functions secrets:

```bash
supabase secrets set PERPLEXITY_API_KEY=your_api_key_here --project-ref vpysqshhafthuxvokwqj
```

Or via Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secret: `PERPLEXITY_API_KEY`
3. Value: Your Perplexity API key

## How It Works

### Search Flow

1. **Name Variations**: Generate multiple name variations
   - Remove suffixes (Mortgage, Lending, etc.)
   - Add suffixes if missing
   - Extract acronyms
   - Remove prefixes (The, A, An)

2. **Google Custom Search API**: Try each variation with multiple query patterns
   - `{name} mortgage website`
   - `{name} official website`
   - `{name} home page`
   - `site:{name}.com`

3. **Google Scraping Fallback**: If API fails, try scraping (limited to 3 variations)

4. **Perplexity AI Fallback**: If Google doesn't find results
   - Uses `llama-3.1-sonar-small-128k-online` model
   - Asks: "What is the official website URL for {name} mortgage lender?"
   - Extracts URL from response
   - Validates URL (rejects PDFs, documents, file paths)

### Name Variation Examples

**Input**: "United Wholesale Mortgage (UWM)"

**Variations Generated**:
- "United Wholesale Mortgage"
- "United Wholesale"
- "United Wholesale Mortgage Mortgage" (redundant, filtered)
- "United Wholesale Lending"
- "UWM"

**Search Queries** (for each variation):
- "United Wholesale Mortgage mortgage website"
- "United Wholesale Mortgage official website"
- "United Wholesale Mortgage home page"
- "site:unitedwholesalemortgage.com"

## Benefits

1. **Better Coverage**: Finds URLs even with complex names
2. **Context Understanding**: Perplexity understands mortgage industry context
3. **Official Sources**: Perplexity prioritizes official websites
4. **Fallback Chain**: Multiple strategies ensure maximum success rate

## Cost Considerations

- **Google Custom Search API**: Free tier: 100 queries/day
- **Perplexity AI**: Pay-per-use, typically $0.0001-0.001 per query
- **Scraping**: Free but rate-limited

## Monitoring

The crawler logs which method found the URL:
- `✅ Found URL with variation "{name}" and query "{query}"` (Google API)
- `✅ Found URL via scraping with variation "{name}"` (Google scraping)
- `✅ Found URL via Perplexity: {url}` (Perplexity AI)

## Troubleshooting

### Perplexity Not Working

1. Check API key is set: `supabase secrets list --project-ref vpysqshhafthuxvokwqj`
2. Verify API key is valid
3. Check Perplexity API status
4. Review Edge Function logs for errors

### Rate Limits

- Google Custom Search: 100 queries/day (free tier)
- Perplexity: Check your plan limits
- Scraping: Add delays between requests

## Example Response

```json
{
  "corrected": true,
  "newUrl": "https://www.unitedwholesale.com",
  "method": "perplexity"
}
```

---

**Status**: ✅ Integrated  
**Date**: 2025-12-02  
**Model**: llama-3.1-sonar-small-128k-online


