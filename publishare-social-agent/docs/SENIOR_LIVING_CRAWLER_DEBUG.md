# Senior Resource Crawler - Debugging Guide

## Current Status

✅ **Article Generator**: Working perfectly - Generated 20 article ideas
❌ **Resource Crawler**: Returning 0 resources - Perplexity API error

## Error Analysis

### Error Log
```
Perplexity API error: {}
```

This indicates:
- Perplexity API is being called
- Response is not OK (status code != 200)
- Error response body is empty or not JSON

## Debugging Steps

### 1. Check Function Logs

Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions/senior-resource-crawler/logs

Look for:
- `Perplexity API error (discovery):` - Should now show detailed error info
- Status code (401, 403, 429, 500, etc.)
- Error message from Perplexity

### 2. Test Perplexity API Directly

The function uses:
- **Model**: `llama-3.1-sonar-large-128k-online`
- **Query**: "What are the best assisted-living facilities in CA? Include their names, addresses..."

Possible issues:
- **Rate limiting**: Too many requests
- **API key issue**: Key not accessible in edge function environment
- **Model availability**: Model might not be available
- **Query format**: Query might be too complex

### 3. Compare with Working Functions

Check how other functions (like `business-lender-research-agent`) call Perplexity:
- Same model?
- Same API endpoint?
- Same headers?
- Same error handling?

### 4. Test with Simpler Query

Try a simpler Perplexity query to see if it's a query complexity issue:

```typescript
// Instead of complex query, try:
"What are 5 assisted living facilities in California? Return as JSON array."
```

## Recent Fixes Applied

1. ✅ Improved error handling - Now captures actual error text
2. ✅ Better error propagation - Errors are thrown instead of silently returning []
3. ✅ Error reporting in response - Errors now appear in API response
4. ✅ Try-catch blocks - All Perplexity calls wrapped in try-catch

## Next Steps

1. **Check logs** - See what the actual Perplexity error is
2. **Test API key** - Verify it's accessible in edge function
3. **Test simpler query** - See if query complexity is the issue
4. **Compare models** - Try different Perplexity model if needed

## Alternative Approach

If Perplexity continues to fail, we can:
1. Use directory page scraping (Caring.com, A Place for Mom)
2. Use Google Custom Search API (like lender crawler does)
3. Manual data entry for initial seed data
4. Use the article generator (which is working) to create content without resource data

## Current Working Features

✅ **Article Generator** - Successfully created 20 content strategy entries:
- 6 Pillar Pages
- 5 Comparison Articles  
- 5 Cost Guides
- 4 Decision Guides

These are ready to generate articles via `batch-strategy-processor` or `agentic-content-gen`.





