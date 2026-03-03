# Detailed Lender Tab Import Guide

## 📋 Overview

This guide explains how to import detailed lender data from individual Google Sheet tabs into the database. All data (including sensitive information) is imported into **gated fields** that are only accessible through authenticated broker portal access.

**Important**: Sensitive data is imported but **NEVER displayed in public CMS** (rateroots.com content only). RLS policies ensure data is protected.

---

## 🔒 Data Security

### RLS Policies
- ✅ **Public access**: Only `lenders_with_programs_public` view (excludes gated fields)
- ✅ **Gated access**: Only `lenders_with_programs_gated` view (includes all data)
- ✅ **Authentication required**: Gated view requires authenticated broker portal access
- ✅ **No public API**: All sensitive data excluded from public responses

### Gated Fields
All sensitive data is stored in these JSONB fields:
- `detailed_program_data` - Compensation, fees, program requirements
- `special_features` - Platforms, processing, underwriting
- `program_specifics` - Margins, pricing, state-specific rules
- `internal_notes` - Contact info, warnings, portal access

---

## 📥 Step 1: Export Google Sheet Tabs as CSV

### Option A: Export Individual Tabs

1. Open the [Google Sheet](https://docs.google.com/spreadsheets/d/18h352fIKCM2Dc2X3oILlYaocAMu0UTwvtBoJ0iT2c8w/edit)
2. Click on the lender tab you want to export (e.g., "AFR", "ARC", "Caliber")
3. Go to **File → Download → Comma-separated values (.csv)**
4. Save the file with a descriptive name (e.g., `AFR.csv`, `ARC.csv`)

### Option B: Export Multiple Tabs

1. For each lender tab:
   - Click the tab
   - File → Download → CSV
   - Save to a directory (e.g., `lender-tabs/`)
2. Organize all CSV files in one directory

**Recommended directory structure:**
```
lender-tabs/
  ├── AFR.csv
  ├── ARC.csv
  ├── Caliber.csv
  ├── Carrington.csv
  └── ...
```

---

## ⚙️ Step 2: Configure Environment

Set environment variables in `.env.local`:

```bash
SUPABASE_URL=https://vpysqshhafthuxvokwqj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SITE_ID=rateroots
```

---

## 🚀 Step 3: Run Import

### Single File Import

```bash
# Dry run (test without making changes)
npm run import-detailed-tabs:dry-run -- --file path/to/AFR.csv --lender-name "American Financial Resources"

# Actual import
npm run import-detailed-tabs -- --file path/to/AFR.csv --lender-name "American Financial Resources"
```

### Directory Import (Multiple Files)

```bash
# Dry run
npm run import-detailed-tabs:dry-run -- --directory path/to/lender-tabs/

# Actual import
npm run import-detailed-tabs -- --directory path/to/lender-tabs/
```

### Direct Node Command

```bash
# Single file
node scripts/import-lender-detailed-tabs.js --file lender-tabs/AFR.csv --lender-name "American Financial Resources"

# Directory
node scripts/import-lender-detailed-tabs.js --directory lender-tabs/

# Dry run
node scripts/import-lender-detailed-tabs.js --dry-run --directory lender-tabs/
```

---

## 📊 What Gets Imported

### Contact Information (Gated)
- Contact person name
- Email addresses
- Phone numbers
- Account executive details

**Stored in**: `internal_notes.contact_info` (JSONB)

### Compensation & Fees (Gated)
- MLO broker compensation percentages
- Broker fees (UW fee, Flood, Tax, Mers, Credit Report, etc.)
- NDC fees
- Processing fees

**Stored in**: `detailed_program_data.compensation` and `detailed_program_data.fees` (JSONB)

### Platform Access (Gated)
- Smart Pricer
- Loansifter
- Correspondent
- Broker
- NDC

**Stored in**: `special_features.platforms` (JSONB)

### Processing & Underwriting (Gated)
- Processing timelines (review hours, CTC days)
- Underwriting details
- Condition review process
- Manual underwriting availability

**Stored in**: `special_features.processing` and `special_features.underwriting` (JSONB)

### Warnings & Notes (Gated)
- Internal warnings ("Use with caution", "Very slow", etc.)
- Portal access instructions
- Training requirements
- Special notes

**Stored in**: `internal_notes.warnings` and `internal_notes.notes` (JSONB)

### Program Requirements (Gated)
- Program-specific FICO requirements
- Program-specific LTV ratios
- State-specific rules

**Stored in**: `detailed_program_data.requirements` (JSONB)

---

## 🔍 Lender Matching

The script matches lenders by name. If a lender isn't found:

1. **Check the lender name** in the database:
   ```sql
   SELECT name, slug FROM lenders WHERE site_id = 'rateroots' ORDER BY name;
   ```

2. **Use exact name** with `--lender-name`:
   ```bash
   node scripts/import-lender-detailed-tabs.js --file AFR.csv --lender-name "American Financial Resources (AFR)"
   ```

3. **Check for typos** in the CSV filename or lender name

---

## ✅ Verification

### Check Imported Data

```sql
-- View gated data for a specific lender
SELECT 
  name,
  detailed_program_data,
  special_features,
  internal_notes
FROM lenders
WHERE slug = 'american-financial-resources';
```

### Verify RLS Policies

```sql
-- Test public view (should exclude gated fields)
SELECT * FROM lenders_with_programs_public WHERE slug = 'american-financial-resources';

-- Test gated view (should include all data)
SELECT * FROM lenders_with_programs_gated WHERE slug = 'american-financial-resources';
```

### Check Data Structure

```sql
-- View JSONB structure
SELECT 
  name,
  jsonb_pretty(detailed_program_data) as program_data,
  jsonb_pretty(special_features) as features,
  jsonb_pretty(internal_notes::jsonb) as notes
FROM lenders
WHERE slug = 'american-financial-resources';
```

---

## 🛠️ Troubleshooting

### Lender Not Found

**Problem**: Script can't find lender in database

**Solution**:
1. Check lender name matches exactly
2. Use `--lender-name` to specify exact name
3. Verify lender was imported from main list first

### Data Not Importing

**Problem**: CSV file processed but no data imported

**Solution**:
1. Check CSV file structure (should have headers)
2. Verify data extraction patterns match your sheet format
3. Run with `--dry-run` to see what would be imported

### JSONB Structure Issues

**Problem**: Data imported but structure is incorrect

**Solution**:
1. Check the extraction functions in the script
2. Verify CSV column names match expected patterns
3. Review the raw data extraction output

---

## 📝 Example Output

```
🚀 Starting detailed lender tab import...

📄 Processing: AFR.csv

🔍 Looking up lender: "AFR"
  ✅ Found lender: American Financial Resources (AFR) (american-financial-resources)
  ✅ Updated lender with detailed data

============================================================
📊 IMPORT SUMMARY
============================================================
✅ Processed: 1
✅ Updated: 1
⚠️  Not Found: 0
❌ Errors: 0

✅ Import complete
```

---

## 🔐 Security Reminders

1. **Never display sensitive data** in public CMS content
2. **Only use gated views** for broker portal access
3. **Verify RLS policies** are active
4. **Test public API responses** to ensure no sensitive data leaks
5. **Review imported data** before making it available to brokers

---

## 📚 Related Documentation

- [Google Sheet Structure Analysis](./GOOGLE_SHEET_STRUCTURE_ANALYSIS.md)
- [Lender Directory System](./LENDER_DIRECTORY_SYSTEM.md)
- [Import Success Guide](./IMPORT_SUCCESS.md)
- [RLS Policies Documentation](../supabase/migrations/20250130000000_create_lender_directory.sql)

---

**Last Updated**: 2025-01-30  
**Status**: ✅ Ready for Use


