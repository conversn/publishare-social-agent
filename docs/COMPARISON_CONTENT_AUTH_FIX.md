# Comparison Content Generator - Authentication Fix

## Issue

When `agentic-content-gen` calls `comparison-content-generator`, it receives:
```
401 {"code": 401, "message": "Invalid JWT"}
```

## Root Cause

The JWT being passed from `agentic-content-gen` to `comparison-content-generator` is invalid. This happens because:

1. **Environment Variable Not Available**: `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` might not be available in the function runtime
2. **Key Format Issue**: The key being passed might not be the correct JWT format
3. **Function-to-Function Auth**: Supabase edge functions might require special authentication for internal calls

## Solution

Since **direct calls work perfectly**, the function itself is functional. The issue is specifically with function-to-function authentication.

### Option 1: Use Direct Call (Current Workaround)

Call `comparison-content-generator` directly, then pass the result to `agentic-content-gen`:

```typescript
// Step 1: Generate comparison content
const comparisonResult = await fetch('/functions/v1/comparison-content-generator', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY
  },
  body: JSON.stringify({
    topic: 'Best College Consulting Services',
    preferred_service: 'Empowerly',
    alternatives: ['CollegeVine', 'IvyWise'],
    site_id: 'parentsimple'
  })
});

// Step 2: Use agentic-content-gen for workflow
const workflowResult = await fetch('/functions/v1/agentic-content-gen', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'apikey': SERVICE_ROLE_KEY
  },
  body: JSON.stringify({
    topic: comparisonResult.title,
    content: comparisonResult.content, // Pass generated content
    site_id: 'parentsimple',
    generate_image: true,
    generate_links: true,
    convert_to_html: true
  })
});
```

### Option 2: Fix Function-to-Function Auth (Recommended)

The proper fix requires ensuring the service role key is available and correctly formatted when `agentic-content-gen` calls `comparison-content-generator`.

**Next Steps:**
1. Verify `SUPABASE_SERVICE_ROLE_KEY` secret is set correctly in Supabase dashboard
2. Check Supabase function logs to see what JWT is actually being sent
3. Consider using Supabase's internal function invocation method if available

## Current Status

✅ **Migration**: Complete  
✅ **Functions**: Deployed  
✅ **Direct Calls**: Working perfectly  
❌ **Function-to-Function**: Authentication issue

## Verification

Direct call test:
```bash
curl -X POST "https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/comparison-content-generator" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Best College Consulting Services","preferred_service":"Empowerly","alternatives":["CollegeVine","IvyWise"],"site_id":"parentsimple"}'
```

This works ✅

## Recommendation

For now, use **Option 1** (direct call) until we can investigate the Supabase function-to-function authentication mechanism further. The system is functional - it just requires calling the comparison generator directly before passing to the workflow.


