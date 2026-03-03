# HTML Conversion Not Being Called - Root Cause Analysis

## Issue

The `markdown-to-html` function has **0 invocations in the past 2 days**, meaning Step 6 is not being executed at all.

## Investigation

### Current Code Location
- **Step 6** is at lines 1292-1380 in `agentic-content-gen/index.ts`
- **Condition**: `if (body.convert_to_html !== false)`
- **Batch Processor** sets: `params.convert_to_html = true;` (line 159)

### Possible Causes

1. **Condition Logic Issue**
   - Current: `body.convert_to_html !== false`
   - This should work, but maybe there's a type coercion issue
   - **Fix**: Made condition more explicit with string check

2. **Early Exit**
   - All steps before Step 6 are wrapped in try-catch and marked "non-critical"
   - They shouldn't cause early exit
   - But maybe there's an unhandled error?

3. **Parameter Not Passed**
   - Maybe `convert_to_html` isn't in the request body?
   - **Fix**: Added explicit logging to see what value is received

4. **Function Not Reaching Step 6**
   - Maybe workflow exits before Step 6?
   - **Fix**: Added logging before condition check

## Changes Made

1. **Enhanced Condition Check**:
   ```typescript
   const shouldConvertToHtml = body.convert_to_html !== false && body.convert_to_html !== 'false';
   ```
   - Now handles both boolean `false` and string `'false'`
   - More explicit about default behavior

2. **Added Debug Logging**:
   - Logs the value of `convert_to_html` before condition check
   - Logs whether condition evaluates to true/false
   - Logs article ID and content length when entering Step 6

3. **Explicit Default Behavior**:
   - If `convert_to_html` is `undefined`, `null`, or not `false`, it will run
   - This matches the documented default behavior

## Next Steps

1. **Test with New Article Generation**:
   - Generate a new article
   - Check logs for "🔍 Step 6 Check" message
   - Verify what value `convert_to_html` has
   - See if Step 6 is reached

2. **Check Function Logs**:
   - Review Supabase function logs for `agentic-content-gen`
   - Look for the debug messages
   - Verify if Step 6 is being reached

3. **Verify Batch Processor**:
   - Confirm `batch-strategy-processor` is passing `convert_to_html: true`
   - Check if parameter is being lost in transit

## Expected Behavior After Fix

When `convert_to_html` is:
- `undefined` → Should run (default true)
- `true` → Should run
- `false` → Should NOT run
- `'false'` → Should NOT run (string check)
- `null` → Should run (default true)

The function should now:
1. Log the condition check
2. Enter Step 6 if condition is true
3. Call `markdown-to-html` function
4. Save HTML to database

---

## Deployment Status

✅ **Deployed** with enhanced logging and condition check
- Function: `agentic-content-gen`
- Version: Latest
- Changes: Explicit condition check + debug logging





