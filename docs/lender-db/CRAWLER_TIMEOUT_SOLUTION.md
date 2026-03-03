# ⏱️ Crawler Timeout Solution

## Issue

The crawler is hitting Supabase Edge Function timeout limits when processing many lenders with URL correction enabled.

**Error**: `WORKER_LIMIT - Function failed due to not having enough compute resources`

## Why This Happens

With `auto_correct_urls: true`, each lender can take:
- 2 seconds delay between requests
- Google search API call (~1-2 seconds)
- URL validation (~1-2 seconds)
- Website crawl (~2-5 seconds)
- **Total: ~6-11 seconds per lender**

For 10 lenders: ~60-110 seconds (exceeds default timeout)

## Solutions

### Option 1: Run Smaller Batches (Recommended)

Run multiple smaller batches sequentially:

```bash
# Batch 1
curl -X POST ... -d '{"max_lenders": 5, "auto_correct_urls": true}'

# Wait a moment, then Batch 2
curl -X POST ... -d '{"max_lenders": 5, "auto_correct_urls": true}'

# Continue...
```

### Option 2: Disable URL Correction for Large Crawls

Run large crawls without URL correction, then fix URLs separately:

```bash
# Large crawl without URL correction
curl -X POST ... -d '{"max_lenders": 50, "auto_correct_urls": false}'

# Then fix URLs in smaller batches
curl -X POST ... -d '{"max_lenders": 5, "auto_correct_urls": true}'
```

### Option 3: Process Only Lenders Needing Correction

The crawler already filters to only process lenders without website info or business lending data. You can run:

```bash
# Process lenders that need URL correction
curl -X POST ... -d '{
  "max_lenders": 20,
  "auto_correct_urls": true,
  "crawl_all": false
}'
```

This only processes lenders missing data, reducing total time.

### Option 4: Reduce Delays (Not Recommended)

You could reduce the 2-second delay, but this risks:
- Rate limiting from Google
- Being blocked by websites
- Violating terms of service

## Recommended Approach

**Run in batches of 5 lenders with URL correction:**

```bash
# Script to run multiple batches
for i in {1..5}; do
  echo "Batch $i..."
  curl -X POST ... -d '{"max_lenders": 5, "auto_correct_urls": true}'
  sleep 10  # Wait between batches
done
```

## Current Limits

- **Supabase Edge Function Timeout**: ~60 seconds (default)
- **Recommended Batch Size with URL Correction**: 3-5 lenders
- **Recommended Batch Size without URL Correction**: 10-15 lenders

## Future Optimization

Consider:
1. **Async Processing**: Queue lenders and process in background
2. **Batch API Calls**: Group Google searches together
3. **Caching**: Cache Google search results
4. **Separate Function**: Split URL correction into separate function

---

**Status**: Use smaller batches (3-5 lenders) for URL correction


