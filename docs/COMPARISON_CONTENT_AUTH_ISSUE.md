# Comparison Content Generator - Authentication Issue

## Status

✅ **Migration**: Deployed successfully  
✅ **Functions**: All deployed  
✅ **Direct Call**: Works perfectly  
❌ **Via agentic-content-gen**: Authentication error

## Issue

When `agentic-content-gen` calls `comparison-content-generator`, it receives:
```
500 {"success":false,"error":"Comparison content generator failed: Unauthorized"}
```

However, direct calls to `comparison-content-generator` work fine.

## Investigation

### What Works
- Direct API call to `comparison-content-generator` ✅
- Migration deployed ✅
- All functions deployed ✅

### What Doesn't Work
- `agentic-content-gen` → `comparison-content-generator` ❌
- Returns "Unauthorized" error

## Possible Causes

1. **Environment Variable Not Available**: When `agentic-content-gen` calls `comparison-content-generator`, the service role key might not be in the environment
2. **Header Passing Issue**: The key might not be passed correctly in headers
3. **Supabase Function-to-Function Auth**: Internal function calls might need different authentication

## Current Implementation

### agentic-content-gen calls comparison-content-generator:
```typescript
const comparisonResponse = await fetch(`${supabaseUrl}/functions/v1/comparison-content-generator`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
    'apikey': supabaseKey
  },
  body: JSON.stringify({...})
});
```

### comparison-content-generator auth:
```typescript
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                   Deno.env.get('SUPABASE_ANON_KEY') ||
                   bearerToken ||
                   apikeyHeader ||
                   '';
```

## Solution Options

### Option 1: Use Environment Variable (Recommended)
Ensure `SUPABASE_SERVICE_ROLE_KEY` is set as a secret in Supabase, and comparison generator uses it from environment for internal calls.

### Option 2: Fix Header Passing
Verify that `supabaseKey` in `agentic-content-gen` is not empty when calling comparison generator.

### Option 3: Use Internal Function URL
Supabase might have an internal function URL that doesn't require authentication.

## Next Steps

1. Check Supabase function logs in dashboard to see actual error
2. Verify `SUPABASE_SERVICE_ROLE_KEY` secret is set correctly
3. Test with environment variable approach
4. Consider using Supabase's internal function invocation method if available

## Workaround

For now, you can call `comparison-content-generator` directly, then pass the result to `agentic-content-gen` for the rest of the workflow:

```typescript
// Step 1: Generate comparison content
const comparisonResult = await fetch('/functions/v1/comparison-content-generator', {
  body: JSON.stringify({
    topic: 'Best College Consulting Services',
    preferred_service: 'Empowerly',
    alternatives: ['CollegeVine', 'IvyWise'],
    site_id: 'parentsimple'
  })
});

// Step 2: Use agentic-content-gen for workflow
const workflowResult = await fetch('/functions/v1/agentic-content-gen', {
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

## Status

**Current**: Authentication issue when called from agentic-content-gen  
**Direct calls**: Working ✅  
**Migration**: Complete ✅  
**Functions**: Deployed ✅

Need to investigate Supabase function-to-function authentication.


