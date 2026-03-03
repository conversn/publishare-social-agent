# ✅ Lender Directory - Ready for Data Import

## 🎉 Migration Complete!

All database components are successfully created and verified:

- ✅ **3 Tables**: `lenders`, `loan_programs`, `lender_programs`
- ✅ **3 Views**: Public and gated views for different access levels
- ✅ **30 Loan Programs**: Pre-populated reference data
- ✅ **4 RLS Policies**: Security configured
- ✅ **5 Triggers**: Auto-update functionality enabled

---

## 🚀 Next: Import Lender Data

### Step 1: Set Environment Variables

Create or update `.env.local` in the publishare directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Import Configuration
IMPORT_USER_ID=your_user_id_from_auth_users
```

**Get your keys:**
1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/api
2. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`
3. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if needed)

**Get your user ID:**
```sql
-- Run in Supabase SQL Editor
SELECT id, email FROM auth.users LIMIT 1;
```
Copy the `id` → `IMPORT_USER_ID`

---

### Step 2: Install Dependencies

```bash
cd "02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare"
npm install
```

This installs `csv-parser` and ensures `@supabase/supabase-js` is available.

---

### Step 3: Test Import (Dry Run)

**This tests the import without making any database changes:**

```bash
npm run import-lenders:dry-run
```

**What to check:**
- ✅ No errors in parsing
- ✅ Sensitive data is removed (no compensation, fees, contact info)
- ✅ Loan programs are extracted correctly
- ✅ FICO/LTV/States are extracted
- ✅ Data looks sanitized and consumer-safe

**Review the output:**
- Check lender names are correct
- Verify highlights are sanitized
- Confirm loan programs match expectations

---

### Step 4: Import Data

**Once dry-run looks good, run the actual import:**

```bash
npm run import-lenders
```

**Expected Output:**
- Processing messages for each lender
- Success/error counts
- Summary of imported data
- ~95 lenders imported (from CSV)

**After Import, verify:**
```sql
-- Check imported lenders
SELECT 
  COUNT(*) as total_lenders,
  COUNT(*) FILTER (WHERE is_published = TRUE) as published_lenders,
  COUNT(DISTINCT user_id) as unique_users
FROM lenders;

-- Check lender-program relationships
SELECT 
  COUNT(*) as total_relationships,
  COUNT(DISTINCT lender_id) as lenders_with_programs,
  COUNT(DISTINCT loan_program_id) as unique_programs
FROM lender_programs;
```

---

## 📋 Import Process Overview

### What the Import Script Does:

1. **Reads CSV**: Parses `RR- Lender List - Lender List.csv`
2. **Sanitizes Data**: Removes sensitive information:
   - MLO compensation percentages
   - Processing fees
   - Account executive contact info
   - Internal notes and warnings
3. **Extracts Data**:
   - Loan programs from highlights
   - FICO scores
   - LTV ratios
   - States available
4. **Transforms Data**: Converts to database format
5. **Creates Records**:
   - Inserts lenders
   - Links to loan programs
   - Sets `is_published = FALSE` (requires review)

### Data Safety:

- ✅ **Public Fields Only**: Only consumer-safe data is imported
- ✅ **Gated Fields Empty**: Detailed program data left empty for manual population
- ✅ **Requires Approval**: All lenders start as `is_published = FALSE`
- ✅ **Manual Review**: You'll review and approve before publishing

---

## 🔍 After Import: Review & Enhance

### 1. Review Imported Lenders

```sql
-- Get all imported lenders
SELECT 
  id,
  name,
  slug,
  min_fico_score,
  max_ltv,
  array_length(states_available, 1) as state_count,
  is_published,
  created_at
FROM lenders
ORDER BY created_at DESC;
```

### 2. Populate Gated Fields (Broker Portal)

For each lender, add detailed program data:

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

### 3. Verify Loan Program Relationships

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
ORDER BY l.name, p.name
LIMIT 20;
```

---

## 📝 Next Steps After Import

1. **Review Data**: Check all imported lenders for accuracy
2. **Populate Gated Fields**: Add detailed program data for broker portal
3. **Generate Content**: Create SEO article pages for each lender
4. **Link Articles**: Connect `article_id` to lenders
5. **Approve & Publish**: Set `is_published = TRUE` after review

---

## 🆘 Troubleshooting

### Import Fails: "Cannot connect to Supabase"
- **Check**: Environment variables are set correctly
- **Verify**: `SUPABASE_SERVICE_ROLE_KEY` is correct
- **Test**: `echo $SUPABASE_SERVICE_ROLE_KEY`

### Import Fails: "User ID not found"
- **Get user ID**: Run SQL query above
- **Set**: `export IMPORT_USER_ID="your-user-id"`

### Import Fails: "CSV file not found"
- **Check**: File exists at `docs/lender-db/RR- Lender List - Lender List.csv`
- **Or**: Use `--file` flag: `npm run import-lenders -- --file /path/to/file.csv`

### Sensitive Data Still Present
- **Review**: Check sanitization patterns in `scripts/import-lender-directory.js`
- **Fix**: Manually clean affected lenders via SQL

---

## ✅ Ready to Import!

Your database is ready. Follow the steps above to import lender data.

**Start with**: Set environment variables, then run dry-run test.

---

**Status**: ✅ Database Ready  
**Next**: Data Import  
**Created**: 2025-01-30


