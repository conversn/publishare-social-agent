# 🔐 Supabase Setup & Migration Permissions Verification

This guide walks you through verifying the Supabase connection and ensuring your console has the necessary permissions to execute migrations.

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Supabase CLI installed (`supabase --version`)
- [ ] Access to the Supabase project dashboard
- [ ] Your Supabase access token (for CLI authentication)

---

## Step 1: Verify Supabase Project Reference

The publishare project is linked to:
- **Project Reference**: `vpysqshhafthuxvokwqj`
- **Project URL**: `https://vpysqshhafthuxvokwqj.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj`

### 1.1 Check Current Link Status

Navigate to the publishare directory and check if the project is linked:

```bash
cd "02-Expansion-Operations-Planning/01-Products-Services/02-Software-Platforms/publishare"
supabase status
```

**Expected Output:**
```
Linked Project: vpysqshhafthuxvokwqj
API URL: https://vpysqshhafthuxvokwqj.supabase.co
```

If you see an error or different project reference, proceed to Step 2.

---

## Step 2: Link to Supabase Project

### 2.1 Authenticate with Supabase CLI

First, you need to log in to Supabase:

```bash
supabase login
```

This will:
1. Open your browser to authenticate
2. Request access token
3. Store credentials locally

**Alternative (using access token):**
```bash
echo "YOUR_ACCESS_TOKEN" | supabase login --token -
```

**To get your access token:**
1. Go to: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Copy the token (you'll only see it once!)

### 2.2 Link to the Project

Link your local project to the Supabase project:

```bash
supabase link --project-ref vpysqshhafthuxvokwqj
```

**Expected Output:**
```
Finished supabase link.
```

**What this does:**
- Creates/updates `.temp/project-ref` file
- Links your local migrations to the remote project
- Enables `supabase db push` commands

### 2.3 Verify Link

Confirm the link was successful:

```bash
supabase status
```

You should see:
```
Linked Project: vpysqshhafthuxvokwqj
API URL: https://vpysqshhafthuxvokwqj.supabase.co
DB URL: postgresql://postgres:[YOUR-PASSWORD]@db.vpysqshhafthuxvokwqj.supabase.co:5432/postgres
```

---

## Step 3: Verify Database Connection Permissions

### 3.1 Test Database Connection

Test that you can connect to the database:

```bash
supabase db remote commit
```

**Expected Output:**
```
Fetching remote migration history...
```

If this succeeds, your connection is working.

### 3.2 Check Migration Status

See which migrations are applied vs pending:

```bash
supabase migration list
```

This shows:
- ✅ Applied migrations (already in database)
- ⏳ Pending migrations (need to be applied)

---

## Step 4: Verify API Keys & Permissions

### 4.1 Get Your API Keys

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/api

2. **Copy Required Keys:**
   - **anon public** key → Used for client-side operations
   - **service_role** key → Used for server-side operations (migrations, admin tasks)
   - ⚠️ **Keep service_role key secret!** Never commit it to git.

### 4.2 Set Environment Variables

Create or update `.env.local` in the publishare directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**File Location:**
```
02-Expansion-Operations-Planning/01-Products-Services/02-Software-Platforms/publishare/.env.local
```

### 4.3 Verify Environment Variables

Test that your environment variables are loaded:

```bash
# From publishare directory
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET')"
```

Or use a test script:

```bash
node scripts/test-supabase-connection.js
```

---

## Step 5: Test Migration Execution

### 5.1 Check Pending Migrations

See what migrations need to be applied:

```bash
supabase migration list
```

### 5.2 Test Migration Push (Dry Run)

Before pushing, check what would be applied:

```bash
supabase db diff
```

This shows the difference between local and remote schemas.

### 5.3 Execute a Test Migration

**Option A: Push All Pending Migrations (Recommended)**

```bash
supabase db push
```

This will:
- Show pending migrations
- Ask for confirmation
- Apply migrations in order
- Update migration history

**Option B: Push Specific Migration**

```bash
supabase db push --include-all
```

**Option C: Manual SQL Execution (If CLI Fails)**

If `supabase db push` fails due to connection issues:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql

2. **Copy Migration SQL**
   - Open the migration file from: `supabase/migrations/[timestamp]_[name].sql`
   - Copy entire contents

3. **Execute in SQL Editor**
   - Paste SQL
   - Click "Run"
   - Verify success message

---

## Step 6: Verify Permissions

### 6.1 Check Service Role Permissions

The service role key should have full database access. Test it:

```bash
# Create a test script
cat > test-permissions.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPermissions() {
  // Test 1: Read access
  const { data: articles, error: readError } = await supabase
    .from('articles')
    .select('id')
    .limit(1);
  
  console.log('✅ Read permission:', readError ? '❌ FAILED' : '✅ PASSED');
  if (readError) console.log('   Error:', readError.message);

  // Test 2: Write access (create a test record)
  const { data: testData, error: writeError } = await supabase
    .from('articles')
    .insert({ title: 'Permission Test', site_id: 'rateroots' })
    .select();
  
  console.log('✅ Write permission:', writeError ? '❌ FAILED' : '✅ PASSED');
  if (writeError) console.log('   Error:', writeError.message);
  
  // Cleanup test record
  if (testData && testData[0]) {
    await supabase.from('articles').delete().eq('id', testData[0].id);
  }
}

testPermissions();
EOF

node test-permissions.js
```

### 6.2 Verify RLS (Row Level Security) Bypass

Service role key should bypass RLS. If you get permission errors, the service role key may not be configured correctly.

---

## Step 7: Troubleshooting Common Issues

### Issue 1: "Project not linked"

**Solution:**
```bash
supabase link --project-ref vpysqshhafthuxvokwqj
```

### Issue 2: "Authentication failed"

**Solution:**
1. Re-authenticate: `supabase login`
2. Check access token is valid
3. Verify you have access to the project

### Issue 3: "Connection timeout"

**Possible Causes:**
- Network/firewall blocking connection
- Supabase connection pooler issues
- VPN interference

**Solutions:**
1. **Retry after a few minutes** (may be transient)
2. **Use SQL Editor** for manual execution
3. **Check network settings** (firewall, VPN)
4. **Try direct database connection** (port 5432 instead of pooler)

### Issue 4: "Permission denied" when executing migrations

**Solutions:**
1. **Verify service role key** is correct
2. **Check RLS policies** aren't blocking operations
3. **Use SQL Editor** with your user account (has full permissions)
4. **Check database user permissions** in Supabase dashboard

### Issue 5: "Migration already applied"

**Solution:**
```bash
# Check migration history
supabase migration list

# If migration shows as applied but schema doesn't match:
supabase db reset  # ⚠️ WARNING: This resets the database!
```

---

## Step 8: Final Verification Checklist

Before executing migrations, verify:

- [ ] ✅ Supabase CLI is installed and authenticated
- [ ] ✅ Project is linked (`supabase status` shows correct project)
- [ ] ✅ Environment variables are set (`.env.local` exists)
- [ ] ✅ Service role key is configured
- [ ] ✅ Database connection works (`supabase db remote commit`)
- [ ] ✅ Can read from database (test query succeeds)
- [ ] ✅ Can write to database (test insert succeeds)
- [ ] ✅ Migration files exist in `supabase/migrations/`
- [ ] ✅ Pending migrations are identified (`supabase migration list`)

---

## Step 9: Execute Migrations

Once all checks pass, you're ready to execute migrations:

### Recommended Method: Supabase CLI

```bash
# Push all pending migrations
supabase db push

# Or push with auto-confirmation
supabase db push --yes
```

### Alternative Method: SQL Editor

If CLI has issues:

1. Open: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql
2. For each pending migration:
   - Open file: `supabase/migrations/[filename].sql`
   - Copy SQL content
   - Paste in SQL Editor
   - Click "Run"
   - Verify success

---

## Step 10: Verify Migration Success

After executing migrations:

### 10.1 Check Migration History

```bash
supabase migration list
```

All migrations should show as ✅ applied.

### 10.2 Verify Schema Changes

```sql
-- Example: Check if a new table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'your_new_table';
```

### 10.3 Test Application

Start your application and verify:
- ✅ No database errors
- ✅ New features work as expected
- ✅ Data is accessible

---

## 🔑 Key Files & Locations

```
publishare/
├── .env.local                    # Environment variables (create this)
├── supabase/
│   ├── migrations/              # Migration SQL files
│   │   └── [timestamp]_[name].sql
│   └── .temp/
│       └── project-ref          # Linked project reference
└── integrations/supabase/
    └── client.ts                # Supabase client configuration
```

---

## 📚 Additional Resources

- **Supabase CLI Docs**: https://supabase.com/docs/reference/cli
- **Migration Guide**: https://supabase.com/docs/guides/cli/local-development#database-migrations
- **Project Dashboard**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj
- **SQL Editor**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql
- **API Settings**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/api

---

## 🆘 Getting Help

If you encounter issues:

1. **Check this guide** - Most common issues are covered
2. **Review Supabase logs** - Dashboard → Logs → Database
3. **Check migration files** - Ensure SQL syntax is correct
4. **Verify permissions** - Service role key has full access
5. **Test connection** - Use `supabase status` to verify link

---

**Last Updated**: 2025-01-30  
**Status**: ✅ Ready for Migration Execution








