# Category Context Migration

## Purpose

Instead of discarding "invalid" lender names, convert them to **category headings** that provide context and organization for lenders. This preserves the original data structure while making it useful.

## Analysis Results

✅ **Found 10 category headings** in the database:
- Commercial
- Hard Money
- NDC Only
- Specialty Lender
- Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR
- Lenders with creative loan options...
- Unusual MLO Compensation...
- Provident (Commercial)
- Private Commercial
- Private Commercial Loans

✅ **Found 95 lender-category relationships** through keyword matching

## Migration Strategy

### Step 1: Run Migration

Execute the migration in Supabase SQL Editor:

**File**: `supabase/migrations/20251202000003_add_category_context.sql`

This migration:
1. Adds `skip_crawling` column (if it doesn't exist from previous migration)
2. Adds `category_context` field to store section headings
3. Adds `is_category_heading` flag to mark category records
4. Marks known category headings
5. Sets `skip_crawling = TRUE` for category headings

### Step 2: Assign Category Context

After migration, run the assignment script:

```bash
# Dry run first
npm run assign-categories:dry-run

# Then assign
npm run assign-categories
```

This script:
- Analyzes lender descriptions/highlights
- Matches keywords to categories
- Assigns `category_context` to lenders

## Benefits

1. **Preserves Data Structure**: Original CSV organization is maintained
2. **Enriches Lender Data**: Categories provide context for lenders
3. **Better Organization**: Can filter/group lenders by category
4. **No Data Loss**: Category headings become useful metadata
5. **SEO Value**: Category context can enhance descriptions

## Usage

After migration, you can:

```sql
-- Find all lenders in a category
SELECT name, description, category_context 
FROM lenders 
WHERE category_context = 'Commercial';

-- Find all category headings
SELECT name, description 
FROM lenders 
WHERE is_category_heading = TRUE;

-- Count lenders per category
SELECT category_context, COUNT(*) 
FROM lenders 
WHERE category_context IS NOT NULL
GROUP BY category_context;
```

## Next Steps

1. ✅ Run migration
2. ✅ Assign category context
3. ⏳ Review assignments (adjust if needed)
4. ⏳ Use categories for filtering/organization
5. ⏳ Enhance lender descriptions with category context

---

**Status**: Ready to execute  
**Date**: 2025-12-02

