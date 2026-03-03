# ⚠️ Crawler Resource Limit Issue

## Current Status

The crawler is experiencing `WORKER_LIMIT` errors, indicating the Supabase Edge Function is hitting resource constraints.

**Error**: `Function failed due to not having enough compute resources`

## Possible Causes

1. **Temporary Supabase Resource Issue**: The platform may be experiencing high load
2. **Function Deployment Issue**: The function may need to be redeployed
3. **Memory/CPU Limits**: The function may be exceeding allocated resources
4. **Concurrent Execution Limits**: Too many functions running simultaneously

## Immediate Actions

### 1. Check Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj)
2. Navigate to **Edge Functions** → **lender-website-crawler**
3. Check **Logs** for detailed error messages
4. Check **Metrics** for resource usage

### 2. Try Again Later

The issue may be temporary. Wait 5-10 minutes and try again with a small batch:

```bash
curl -X POST ... -d '{
  "max_lenders": 3,
  "auto_correct_urls": true
}'
```

### 3. Redeploy Function

If the issue persists, redeploy the function:

```bash
cd publishare
supabase functions deploy lender-website-crawler --project-ref vpysqshhafthuxvokwqj
```

### 4. Check Function Code

Review the function for potential memory leaks or infinite loops that could cause resource exhaustion.

## Alternative: Run Without URL Correction

For now, you can run crawls without URL correction (faster, less resource-intensive):

```bash
curl -X POST ... -d '{
  "max_lenders": 10,
  "auto_correct_urls": false,
  "focus_business_lending": true
}'
```

Then fix URLs separately in smaller batches when resources are available.

## Long-term Solutions

1. **Optimize Function**: Reduce memory usage, optimize code
2. **Upgrade Plan**: Consider Supabase Pro plan for higher limits
3. **Batch Processing**: Process lenders in smaller batches with delays
4. **Separate Functions**: Split URL correction into a separate function

## Next Steps

1. ✅ Check Supabase logs for detailed errors
2. ✅ Wait 5-10 minutes and retry
3. ✅ Try redeploying the function
4. ✅ Run without URL correction if needed
5. ✅ Contact Supabase support if issue persists

---

**Status**: ⚠️ Resource limit issue - investigating


