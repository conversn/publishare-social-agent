# Import CSV Files - Quick Guide

## 📁 Where to Place CSV Files

The import script expects CSV files in this directory:
```
02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare/docs/lender-db/lender-tabs/
```

## 📥 If Files Are in Google Drive Folder

If you downloaded the CSV files from Google Drive to your Downloads folder:

1. **Find the folder** (usually named something like "Copy of SVL Lender List_CSV_Exports")
2. **Copy all CSV files** to the lender-tabs directory:

```bash
# Example: If files are in Downloads
cp ~/Downloads/"Copy of SVL Lender List_CSV_Exports"/*.csv \
   "02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare/docs/lender-db/lender-tabs/"
```

## ✅ Verify Files Are Ready

```bash
cd "02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare/docs/lender-db/lender-tabs"
ls -1 *.csv | wc -l  # Should show count of CSV files
ls -1 *.csv | head -10  # Show first 10 files
```

## 🚀 Run Import

Once files are in place:

```bash
cd "02-Expansion-Operations-Planning/Products-Services/2. Software-Platforms/publishare"

# Dry run first
npm run import-detailed-tabs:dry-run -- --directory docs/lender-db/lender-tabs/

# Actual import
npm run import-detailed-tabs -- --directory docs/lender-db/lender-tabs/
```


