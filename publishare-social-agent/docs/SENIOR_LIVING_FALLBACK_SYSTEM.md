# Senior Resource Crawler - Fallback System

## Overview

The `senior-resource-crawler` now includes a robust fallback system that automatically tries alternative APIs when the primary API (Perplexity) fails or is unavailable.

## Fallback Chain

```
Perplexity AI → DeepSeek AI → Google Custom Search API
```

### 1. **Perplexity AI** (Primary)
- **Model**: `llama-3.1-sonar-large-128k-online`
- **Use Case**: Web search with structured data extraction
- **API Key**: `PERPLEXITY_API_KEY`
- **Fallback Triggers**:
  - API key not configured
  - API request fails (non-200 status)
  - Empty response content
  - JSON parsing fails
  - Response is not an array

### 2. **DeepSeek AI** (Fallback #1)
- **Model**: `deepseek-chat`
- **Use Case**: Same as Perplexity - web search with structured data extraction
- **API Key**: `DEEPSEEK_API_KEY` or `DEEP_SEEK_API_KEY`
- **Fallback Triggers**:
  - Perplexity fails at any point
  - DeepSeek API key not configured → falls back to Google
  - DeepSeek request fails → falls back to Google

### 3. **Google Custom Search API** (Fallback #2)
- **Use Case**: Web search with basic result extraction
- **API Keys**: 
  - `GOOGLE_CUSTOM_SEARCH_API_KEY`
  - `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
- **Fallback Triggers**:
  - Both Perplexity and DeepSeek fail
  - Google API key not configured → returns empty array
  - Google request fails → returns empty array

## Implementation Details

### Discovery Function (`discoverResourcesWithPerplexity`)

The discovery function automatically falls back through the chain:

```typescript
try {
  // Try Perplexity
  return await discoverResourcesWithPerplexity(resourceType, state);
} catch (error) {
  // Fallback to DeepSeek
  try {
    return await discoverResourcesWithDeepSeek(resourceType, state);
  } catch (deepseekError) {
    // Fallback to Google
    return await discoverResourcesWithGoogle(resourceType, state);
  }
}
```

### Error Handling

Each function includes comprehensive error handling:
- **API Errors**: Captures status code, status text, and error body
- **Parsing Errors**: Logs raw content that failed to parse
- **Empty Responses**: Logs warning and falls back
- **Invalid Data**: Validates array structure before returning

### Resource Format

All APIs return resources in the same format:

```typescript
{
  name: string;
  resource_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  website_url?: string;
  email?: string;
  description?: string;
  amenities: string[];
  care_levels: string[];
  pricing_range?: { min: number; max: number; currency: string; period: string };
  accepts_medicare?: boolean;
  accepts_medicaid?: boolean;
  accepts_insurance?: boolean;
  research_source: 'perplexity' | 'deepseek' | 'google';
}
```

## Data Quality by Source

### Perplexity AI
- ✅ **Best Quality**: Structured data with full details
- ✅ Addresses, phone numbers, amenities
- ✅ Pricing ranges, insurance acceptance
- ❌ May fail due to API issues or rate limits

### DeepSeek AI
- ✅ **Good Quality**: Similar to Perplexity
- ✅ Structured data extraction
- ✅ Full resource details
- ❌ May not have web search capabilities (depends on model)

### Google Custom Search
- ⚠️ **Basic Quality**: Limited structured data
- ✅ Website URLs and titles
- ✅ Snippets/descriptions
- ❌ No addresses, phone numbers, or detailed amenities
- ❌ Location extraction from snippets (may be inaccurate)

## Usage

The fallback system is **automatic** - no configuration needed. Just call the crawler:

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-crawler' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "perplexity",
    "resource_type": "assisted-living",
    "state": "CA",
    "max_resources": 10
  }'
```

The system will:
1. Try Perplexity first
2. If Perplexity fails, try DeepSeek
3. If DeepSeek fails, try Google
4. Return results from whichever API succeeds

## Environment Variables

Set these in Supabase Edge Functions → Settings → Secrets:

```bash
# Primary API
PERPLEXITY_API_KEY=your_perplexity_key

# Fallback #1
DEEPSEEK_API_KEY=your_deepseek_key
# OR
DEEP_SEEK_API_KEY=your_deepseek_key

# Fallback #2
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_api_key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id
```

## Logging

The system logs all fallback attempts:

```
⚠️  Perplexity API failed, trying DeepSeek fallback...
⚠️  DeepSeek fallback failed, trying Google...
✅ Discovered 10 resources via Google
```

Check logs at: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions/senior-resource-crawler/logs

## Testing Results

✅ **Successfully tested**: Fallback from Perplexity → Google
- Perplexity failed (or returned empty)
- System automatically fell back to Google
- Found 10 resources, stored 3 successfully

## Future Enhancements

1. **Retry Logic**: Add retry attempts before falling back
2. **Rate Limit Handling**: Detect rate limits and wait before retrying
3. **Result Merging**: Combine results from multiple APIs
4. **Quality Scoring**: Score results by data completeness and prefer higher quality sources





