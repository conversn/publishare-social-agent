# Lender Directory - Step-by-Step Execution Guide

## 🚀 Quick Start

Follow these steps in order to deploy the lender directory system.

---

## Step 1: Run Database Migration

### Option A: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql
   - Or navigate: Project → SQL Editor

2. **Open Migration File**
   - File: `supabase/migrations/20250130000000_create_lender_directory.sql`
   - Copy the entire contents

3. **Execute Migration**
   - Paste SQL into SQL Editor
   - Click "Run" button
   - Wait for completion (should take 10-30 seconds)

4. **Verify Migration**
   ```sql
   -- Run this in SQL Editor to verify
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('lenders', 'loan_programs', 'lender_programs')
   ORDER BY table_name;
   ```
   
   **Expected Result**: Should return 3 rows

5. **Check Loan Programs**
   ```sql
   SELECT COUNT(*) as program_count FROM loan_programs;
   ```
   
   **Expected Result**: Should return 30

### Option B: Supabase CLI (Alternative)

```bash
cd "02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare"
supabase db push
```

---

## Step 2: Install Dependencies

```bash
cd "02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare"
npm install
```

This will install:
- `csv-parser` (for CSV import)
- `@supabase/supabase-js` (already installed)

---

## Step 3: Set Environment Variables

Create or update `.env.local` in the publishare directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Import Configuration
IMPORT_USER_ID=your_user_id_here  # Get from auth.users table
```

**To get your keys:**
1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/api
2. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`

**To get your user ID:**
```sql
-- Run in SQL Editor
SELECT id, email FROM auth.users LIMIT 1;
```

---

## Step 4: Verify Database Connection

Run the verification script:

```bash
node scripts/verify-lender-directory-setup.js
```

This will:
- ✅ Check database connection
- ✅ Verify tables exist
- ✅ Check loan programs count
- ✅ Test RLS policies

---

## Step 5: Dry Run Import (Test)

Before importing actual data, test the import process:

```bash
npm run import-lenders:dry-run
```

**What to check:**
- ✅ No errors in parsing
- ✅ Sensitive data is removed
- ✅ Loan programs are extracted correctly
- ✅ FICO/LTV/States are extracted
- ✅ Data looks sanitized

**Review the output:**
- Check lender names are correct
- Verify highlights are sanitized (no compensation, fees, contact info)
- Confirm loan programs match expectations

---

## Step 6: Actual Data Import

Once dry-run looks good, run the actual import:

```bash
npm run import-lenders
```

**Expected Output:**
- Processing messages for each lender
- Success/error counts
- Summary of imported data

**After Import:**
```sql
-- Check imported lenders
SELECT 
  name, 
  slug, 
  min_fico_score, 
  max_ltv, 
  array_length(states_available, 1) as state_count,
  is_published
FROM lenders
ORDER BY name
LIMIT 10;
```

---

## Step 7: Manual Review & Data Enhancement

### 7.1 Review Imported Lenders

```sql
-- Get all imported lenders
SELECT 
  id,
  name,
  slug,
  min_fico_score,
  max_ltv,
  states_available,
  is_published,
  created_at
FROM lenders
ORDER BY created_at DESC;
```

### 7.2 Populate Gated Fields (Broker Portal)

For each lender, populate gated data:

```sql
-- Example: Add detailed program data
UPDATE lenders
SET detailed_program_data = '{
  "fha": {
    "min_fico": 580,
    "max_ltv": 96.5,
    "special_features": ["Streamline available", "Manual underwriting"]
  },
  "va": {
    "min_fico": 620,
    "max_ltv": 100,
    "special_features": ["No PMI", "IRRRL available"]
  }
}'::jsonb
WHERE id = 'lender-uuid-here';
```

### 7.3 Verify Loan Program Relationships

```sql
-- Check lender-program relationships
SELECT 
  l.name as lender_name,
  p.name as program_name,
  p.category,
  lp.min_fico,
  lp.max_ltv
FROM lenders l
JOIN lender_programs lp ON l.id = lp.lender_id
JOIN loan_programs p ON lp.loan_program_id = p.id
WHERE l.is_published = TRUE
ORDER BY l.name, p.name
LIMIT 20;
```

---

## Step 8: Generate SEO Content

### 8.1 Create Lender Article Pages

Use Publishare's `agentic-content-gen` edge function:

```typescript
// Example API call
const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({
    topic: 'AmWest Funding mortgage lenders',
    title: 'AmWest Funding Mortgage Loans & Programs | RateRoots',
    site_id: 'rateroots',
    aeo_optimized: true,
    aeo_content_type: 'definition',
    template: 'lender-page',
    lender_data: {
      name: 'AmWest Funding',
      programs: ['FHA', 'VA', 'DSCR'],
      min_fico: 620,
      max_ltv: 95,
      states: ['CA', 'NV', 'AZ']
    },
    generate_schema: true,
    convert_to_html: true,
    auto_publish: false
  })
});
```

### 8.2 Link Articles to Lenders

After creating article, link it to lender:

```sql
-- Link article to lender
UPDATE lenders
SET article_id = 'article-uuid-here'
WHERE slug = 'amwest-funding';
```

### 8.3 Generate Program Category Pages

Create pages for each loan program:

```typescript
// Example: DSCR loans page
{
  topic: 'DSCR mortgage lenders',
  title: 'DSCR Mortgage Lenders | Best DSCR Loan Rates | RateRoots',
  site_id: 'rateroots',
  aeo_optimized: true,
  aeo_content_type: 'definition',
  template: 'program-page',
  program_data: {
    name: 'DSCR',
    category: 'NON_QM',
    lender_count: 45
  }
}
```

---

## Step 9: Approve & Publish

### 9.1 Final Review Checklist

For each lender, verify:
- [ ] Data is accurate
- [ ] No sensitive information exposed
- [ ] Loan programs are correct
- [ ] Highlights are consumer-safe
- [ ] Article page is created and linked
- [ ] Schema markup is generated
- [ ] AEO fields are populated

### 9.2 Publish Lenders

```sql
-- Publish approved lenders
UPDATE lenders
SET 
  is_published = TRUE,
  publication_notes = 'Approved and published',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM lenders 
  WHERE [your_approval_criteria]
);
```

### 9.3 Verify Published Lenders

```sql
-- Check published lenders
SELECT 
  COUNT(*) as published_count,
  COUNT(DISTINCT article_id) as with_articles,
  COUNT(DISTINCT organization_id) as with_organizations
FROM lenders
WHERE is_published = TRUE;
```

---

## Step 10: Monitor & Optimize

### 10.1 Check Public API

```bash
# Test public lender endpoint
curl "https://vpysqshhafthuxvokwqj.supabase.co/rest/v1/lenders?is_published=eq.true&limit=5" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 10.2 Verify Gated Data is Protected

```bash
# This should NOT return gated fields
curl "https://vpysqshhafthuxvokwqj.supabase.co/rest/v1/lenders?select=*&is_published=eq.true&limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 10.3 Monitor Performance

- Track search rankings for lender pages
- Monitor featured snippet appearances
- Track quiz conversions from directory pages
- Review lead quality from directory traffic

---

## Troubleshooting

### Migration Fails

**Error**: Table already exists
- **Solution**: Drop existing tables first (if safe to do so)
- **Or**: Use `CREATE TABLE IF NOT EXISTS` (already in migration)

**Error**: Foreign key constraint fails
- **Solution**: Ensure `sites` table exists with 'rateroots' entry
- **Check**: `SELECT * FROM sites WHERE id = 'rateroots';`

### Import Fails

**Error**: Cannot connect to Supabase
- **Solution**: Check environment variables
- **Verify**: `echo $SUPABASE_URL`

**Error**: User ID not found
- **Solution**: Get valid user ID from `auth.users` table
- **Set**: `export IMPORT_USER_ID="your-user-id"`

**Error**: CSV file not found
- **Solution**: Check file path
- **Default**: `docs/lender-db/RR- Lender List - Lender List.csv`

### Data Issues

**Issue**: Sensitive data in highlights
- **Solution**: Review sanitization patterns in import script
- **Fix**: Manually clean affected lenders

**Issue**: Missing loan programs
- **Solution**: Check program extraction logic
- **Fix**: Manually add programs via SQL

---

## Next Steps After Setup

1. **Create Frontend Components**
   - Lender directory listing page
   - Lender detail page
   - Search and filter UI

2. **Build Member Portal**
   - Broker authentication
   - Gated data access
   - Advanced search with AI

3. **Integrate with Quiz**
   - Add lender CTAs to quiz
   - Route leads to matching lenders
   - Track conversions

4. **Content Optimization**
   - Generate more answer pages
   - Create comparison articles
   - Build state-specific guides

---

## Support

If you encounter issues:
1. Check this guide
2. Review `LENDER_DIRECTORY_SYSTEM.md`
3. Check Supabase logs
4. Verify environment variables

---

**Last Updated**: 2025-01-30  
**Status**: ✅ Ready for Execution


