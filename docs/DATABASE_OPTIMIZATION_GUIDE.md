# Database Optimization Guide - Fix User Relationship Error

## Error Message
```
Failed to load articles: Could not find a relationship between 'articles' and 'user_id' in the schema cache
```

## Root Cause
Supabase PostgREST cannot find the foreign key relationship between `articles.user_id` and `auth.users(id)`. This happens when:
1. The foreign key constraint doesn't exist
2. The schema cache needs to be refreshed
3. The relationship isn't properly defined

## Solution

### Step 1: Run the Optimization SQL Script

1. **Open Supabase SQL Editor:**
   - Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql
   - Or navigate: Dashboard → SQL Editor

2. **Copy the SQL Script:**
   - Open: `scripts/optimize-database-for-users.sql`
   - Copy the entire contents

3. **Paste and Run:**
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for completion (should take 10-30 seconds)

4. **Verify Results:**
   - Check for any error messages
   - Look for "NOTICE" messages indicating successful operations
   - The script will show verification queries at the end

### Step 2: Refresh Supabase Schema Cache

After running the SQL:

1. **Option A: Automatic (Recommended)**
   - Wait 1-2 minutes for automatic cache refresh
   - Supabase refreshes schema cache automatically

2. **Option B: Manual Refresh**
   - Go to: Dashboard → Settings → API
   - Click "Refresh Schema Cache" (if available)
   - Or restart your Supabase project

3. **Option C: Force Refresh via API**
   - The SQL script includes queries that trigger cache refresh
   - No additional action needed

### Step 3: Test the Application

1. **Refresh your browser** (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)
2. **Navigate to:** `/cms/articles`
3. **Verify:**
   - Articles load without errors
   - User-specific filtering works
   - No relationship errors in console

## What the Script Does

### 1. Ensures Proper Foreign Key Relationship
- Adds `user_id` column if missing
- Creates foreign key: `articles.user_id → auth.users(id)`
- Sets up proper CASCADE deletion

### 2. Creates Performance Indexes
- `idx_articles_user_id` - Fast user lookups
- `idx_articles_user_id_status` - Filtered queries
- `idx_articles_user_id_created_at` - Sorted queries
- Additional indexes for optimal performance

### 3. Sets Up Row Level Security (RLS)
- Enables RLS on articles table
- Creates policies for user data isolation
- Ensures users can only see their own articles

### 4. Adds User Ownership to Related Tables
- `article_categories` - User-specific categories
- `tags` - User-specific tags
- `personas` - User-specific personas
- `content_strategy` - User-specific strategies
- `media_library` - User-specific media

### 5. Creates Helper Functions
- `get_user_authors()` - Get user's authors with article counts
- `get_user_dashboard_stats()` - Dashboard statistics

### 6. Optimizes Database
- Analyzes tables for better query planning
- Creates indexes for common query patterns
- Sets up proper constraints

## Verification

After running the script, verify:

```sql
-- Check foreign key exists
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'articles'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id';
```

Expected result: Should show `articles_user_id_fkey` constraint.

## Troubleshooting

### Error: "column user_id does not exist"
- The script will add it automatically
- If it still fails, check if you have permissions

### Error: "relation auth.users does not exist"
- This is normal - `auth.users` is in the `auth` schema
- The script handles this correctly

### Error persists after running script
1. **Check Supabase logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for any errors during script execution

2. **Verify foreign key exists:**
   - Run the verification query above
   - Should return at least one row

3. **Refresh schema cache:**
   - Wait 2-3 minutes
   - Or restart Supabase project

4. **Check RLS policies:**
   - Dashboard → Authentication → Policies
   - Verify articles table has RLS enabled

### Still seeing relationship errors
1. **Clear browser cache**
2. **Hard refresh the page** (Cmd+Shift+R)
3. **Check browser console** for specific error messages
4. **Verify you're authenticated** - RLS requires valid auth session

## Quick Fix (Temporary Workaround)

If you need articles to load immediately while fixing the database:

**Modify the query in `app/cms/articles/page.tsx`:**

Change from:
```typescript
.select(`
  id,
  title,
  status,
  ...
  user_id,
  author_id
`)
```

To:
```typescript
.select('*')
.eq('user_id', user.id)  // Add explicit filter
```

This bypasses the relationship lookup and filters directly.

## Files Created

1. **`scripts/optimize-database-for-users.sql`** - Main optimization script
2. **`scripts/run-database-optimization.js`** - Verification script
3. **`DATABASE_OPTIMIZATION_GUIDE.md`** - This guide

## Next Steps After Optimization

1. ✅ Run the SQL script in Supabase
2. ✅ Wait for schema cache refresh (1-2 minutes)
3. ✅ Test articles page
4. ✅ Verify user isolation works
5. ✅ Check performance improvements

## Support

If issues persist:
- Check Supabase Dashboard → Logs
- Review SQL script output for errors
- Verify foreign key constraint exists
- Ensure RLS policies are active

