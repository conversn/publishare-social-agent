# HTML Conversion 401 Error - Root Cause Analysis

## Issue

The `markdown-to-html` function is returning **401 Unauthorized** errors when called from `agentic-content-gen`. This is a gateway-level authentication issue, not a function-level issue.

## Error Details

- **Error**: `POST | 401 | https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/markdown-to-html`
- **Headers Sent**: Both `Authorization: Bearer <key>` and `apikey: <key>` headers
- **Key Format**: Hash shows `sb_secret_hnHJ3` prefix, suggesting a secret key is being used

## Root Cause

Supabase edge functions require authentication at the **gateway level** before the request reaches the function code. The 401 error indicates:

1. **Missing Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` environment variable may not be set in the `agentic-content-gen` function's environment
2. **Invalid Key Format**: The key being passed might not be a valid JWT token (service role keys are JWT tokens starting with `eyJ`)
3. **Key Source Issue**: The function might be falling back to an anon key instead of service role key

## Fixes Applied

### 1. Enhanced Authentication in `agentic-content-gen`
- Prioritizes `SUPABASE_SERVICE_ROLE_KEY` from environment
- Falls back to passed key only if environment variable not set
- Added logging to show key source and format

### 2. Improved Authentication in `markdown-to-html`
- Better key detection from headers
- Proper error handling for missing keys
- Returns 401 with clear error message if no key found

### 3. Added Debug Logging
- Logs key source (environment vs passed)
- Logs key format (JWT check)
- Logs key prefix for debugging

## Next Steps

1. **Verify Environment Variable**:
   - Check Supabase dashboard to ensure `SUPABASE_SERVICE_ROLE_KEY` is set for `agentic-content-gen`
   - Environment variables are shared across all edge functions in a project

2. **Test with New Article**:
   - Generate a new article to test the fix
   - Check logs for authentication details
   - Verify HTML conversion succeeds

3. **If Still Failing**:
   - Check function logs for key source and format
   - Verify the service role key is a valid JWT (starts with `eyJ`)
   - Ensure the key has proper permissions

## Expected Behavior

After the fix:
- Function should log: `HTML conversion auth: source=environment, isJWT=true, prefix=eyJ...`
- `markdown-to-html` should receive valid authentication
- HTML conversion should complete successfully
- Article should have `html_body` populated

## Deployment Status

✅ **Deployed**:
- `agentic-content-gen` - Enhanced authentication with logging
- `markdown-to-html` - Improved key detection and error handling

---

## Key Insight

Supabase edge functions authenticate at the **gateway level**. The gateway checks the `Authorization` or `apikey` header before forwarding the request to the function. If the key is invalid or missing, the gateway returns 401 before the function code runs.

For internal function-to-function calls, you **must** use the service role key (JWT token starting with `eyJ`), not the anon key or any other key format.





