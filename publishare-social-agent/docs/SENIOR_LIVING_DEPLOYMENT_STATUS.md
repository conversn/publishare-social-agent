# Senior Living Resource System - Deployment Status

## ✅ Deployment Complete

### Edge Functions Deployed

1. **`senior-resource-crawler`** ✅
   - **Status:** Deployed successfully
   - **URL:** `https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-crawler`
   - **Features:** AI-powered extraction, discovery, and enrichment
   - **Dashboard:** https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions

2. **`senior-resource-article-generator`** ✅
   - **Status:** Deployed successfully
   - **URL:** `https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-article-generator`
   - **Features:** Generates article ideas and creates content_strategy entries
   - **Dashboard:** https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions

---

## ⚠️ Database Migration Pending

### Migration File
- **File:** `supabase/migrations/20251210000001_create_senior_resources_table.sql`
- **Status:** Created locally, needs to be applied to remote database

### How to Apply Migration

**Option 1: Via Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql/new
2. Copy the contents of: `supabase/migrations/20251210000001_create_senior_resources_table.sql`
3. Paste into SQL Editor
4. Click "Run" to execute

**Option 2: Via Supabase CLI (After Migration Sync)**

If you want to sync migration history first:

```bash
# Repair migration history (if needed)
supabase migration repair --status reverted 20251203000001 20251203000002 20251203000003 20251204000001 20251205000000 20251205000001

# Pull remote migrations
supabase db pull

# Then push new migration
supabase db push
```

**Option 3: Direct SQL Execution**

You can also apply the migration directly via psql or any PostgreSQL client connected to your Supabase database.

---

## 🔧 Configuration Required

### 1. Set Perplexity API Key

The AI-powered features require a Perplexity API key:

1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/functions
2. Add secret: `PERPLEXITY_API_KEY`
3. Value: Your Perplexity API key

**Get API Key:** https://www.perplexity.ai/settings/api

---

## 🧪 Testing the Deployment

### Test 1: AI Discovery

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-crawler' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "perplexity",
    "resource_type": "assisted-living",
    "state": "CA",
    "max_resources": 5,
    "dry_run": true
  }'
```

### Test 2: Article Generator

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-article-generator' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "seniorsimple",
    "create_strategy_entries": true
  }'
```

### Test 3: Using Research Script

```bash
cd "02-Expansion-Operations-Planning/01-Products-Services/02-Software-Platforms/publishare"
node scripts/research-senior-living-resources.js \
  --source perplexity \
  --type assisted-living \
  --state CA \
  --max 10 \
  --dry-run
```

---

## 📊 Next Steps

1. ✅ **Apply Database Migration** (see above)
2. ✅ **Set Perplexity API Key** (see above)
3. ✅ **Test Functions** (see above)
4. ✅ **Run Initial Research** - Discover and store senior living resources
5. ✅ **Generate Article Backlog** - Create content_strategy entries
6. ✅ **Generate Articles** - Use `batch-strategy-processor` to create articles

---

## 📝 Migration Content Summary

The migration creates:

- **`senior_resources` table** - Main table for storing resources
- **Indexes** - For performance (site_id, slug, type, state, etc.)
- **Views** - Public and gated views
- **Helper Functions** - Location-based queries
- **Full-text Search** - Search support

See full migration file for details: `supabase/migrations/20251210000001_create_senior_resources_table.sql`

---

## ✅ Deployment Checklist

- [x] Edge functions deployed
- [ ] Database migration applied
- [ ] Perplexity API key configured
- [ ] Functions tested
- [ ] Initial research run
- [ ] Article backlog generated

---

## 🔗 Useful Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj
- **Functions Dashboard:** https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions
- **SQL Editor:** https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql/new
- **Function Secrets:** https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/functions





