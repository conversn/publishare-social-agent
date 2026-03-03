# JWT Authentication Fix for Function-to-Function Calls

## Issue

Multiple functions are returning **401 "Invalid JWT"** errors:
- `markdown-to-html`
- `article-metadata-enhancer`
- `link-validator`
- `external-link-inserter`

## Root Cause

All function-to-function calls were using `supabaseKey` which might be:
- An anon key (not valid for internal calls)
- Not a valid JWT token
- Not the service role key

## Solution

Created a helper function `getServiceRoleKey()` that:
1. **Prioritizes environment variable**: `SUPABASE_SERVICE_ROLE_KEY`
2. **Validates JWT format**: Ensures key starts with `eyJ` (JWT token format)
3. **Falls back safely**: Uses passed key only if it's a valid JWT
4. **Throws clear error**: If no valid JWT is found

## Changes Applied

### 1. Helper Function
```typescript
const getServiceRoleKey = (): string => {
  const envServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (envServiceKey && envServiceKey.startsWith('eyJ')) {
    return envServiceKey;
  }
  // Fallback to passed key if it's a valid JWT
  if (supabaseKey && supabaseKey.startsWith('eyJ')) {
    return supabaseKey;
  }
  // If neither is a valid JWT, throw error
  throw new Error('Service role key (JWT) required for internal function calls. Ensure SUPABASE_SERVICE_ROLE_KEY is set.');
};
```

### 2. Updated All Function Calls

**Before:**
```typescript
'Authorization': `Bearer ${supabaseKey}`
```

**After:**
```typescript
const serviceRoleKey = getServiceRoleKey();
'Authorization': `Bearer ${serviceRoleKey}`,
'apikey': serviceRoleKey
```

### 3. Functions Updated
- ✅ `external-link-inserter` call
- ✅ `link-validator` call
- ✅ `markdown-to-html` call
- ✅ `article-metadata-enhancer` call

## JWT Secret

The user provided JWT secret: `6d380947-49e2-43cd-9995-7244b64e074d`

**Note**: For Supabase edge functions, we don't need to manually sign JWTs. The service role key IS already a valid JWT token. We just need to ensure we're using it correctly.

## Next Steps

1. **Verify Environment Variable**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Supabase project settings
2. **Test Workflow**: Generate a new article to verify all function calls work
3. **Check Logs**: Verify no more 401 errors appear

## Expected Behavior

After the fix:
- All function-to-function calls use valid JWT tokens
- No more 401 "Invalid JWT" errors
- HTML conversion works during workflow
- Metadata enhancement works during workflow
- Link validation works during workflow
- External link insertion works during workflow

---

## Deployment Status

✅ **Deployed**: `agentic-content-gen` with updated authentication
- All function calls now use `getServiceRoleKey()` helper
- Validates JWT format before use
- Provides clear error messages if key is missing





