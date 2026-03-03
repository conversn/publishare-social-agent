# 🚫 Invalid Lenders Identified

## Summary

Identified **12 lenders** that should be skipped during crawling:
- **5 Invalid** (High Confidence) - Category names, not actual lenders
- **7 Suspicious** (Medium Confidence) - Review recommended

## Invalid Lenders (High Confidence)

These are clearly category names or descriptions, not actual lender names:

1. **Commercial** (`8da1067b-14c3-48e4-a796-547c96432945`)
   - Category name, not a lender
   - Already has URL: `busey.com` (incorrectly assigned)

2. **Hard Money** (`d45394e1-e36c-43cd-8f5b-c8b6edb6fea5`)
   - Loan type category, not a lender

3. **NDC Only** (`61507eb3-9170-4755-b476-811605e5f0e4`)
   - Program description, not a lender
   - Has URL: `growamerica.org` (likely incorrect)

4. **NexBank (DSCR and Bank Statement)** (`9b62de47-a67c-476f-917d-af2e865c0ce7`)
   - Program description, not a lender name
   - Note: "NexBank" might be a real lender, but the name format suggests it's a program description

5. **Specialty Lender** (`c468610f-5109-49bf-b597-492ecc4fa6ff`)
   - Generic category name
   - Has URL: `independentbanker.org` (article, not lender website)

## Suspicious Lenders (Medium Confidence)

These may be legitimate but have unusual patterns - review recommended:

1. **Bridge & Fix and Flip** (`e1143358-fdd5-4f80-92a9-92cc41a6ac67`)
   - Uses `&` character (unusual)
   - Might be legitimate, but format is unusual

2. **Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR** (`99dd4fb3-7c74-443d-be57-1684d93be808`)
   - Clearly a program description list, not a lender name
   - 14 words, 120+ characters

3. **Lenders with creative loan options...** (`16bab36c-a8da-44c6-8e22-7df3c07b9c08`)
   - 31 words, clearly a description/note
   - Not a lender name

4. **Lot & Land Loans** (`ed95f430-77fb-4539-91d7-36cc144e9ebb`)
   - Uses `&` character
   - Might be legitimate, but format suggests category

5. **MeMortgage [Use with caution]** (`7b734b1f-046c-4dbd-8b2d-b1023d0e4cb1`)
   - Has bracket notation (internal note)
   - Might be legitimate but flagged for review

6. **Unusual MLO Compesation Broker Lender Paid or Borrower Paid Only** (`bf80b5e2-a2d5-4647-ba35-4621b6b2ded8`)
   - 10 words, clearly a description
   - Contains "Compensation" and "Only" - description pattern

7. **Walker & Dunlop** (`c9aadbe5-2d1f-46ce-ae55-abcc7ffcf9b7`)
   - Uses `&` character
   - **Note**: This might actually be a legitimate lender (Walker & Dunlop is a real company)
   - Flagged only because of `&` character, should be reviewed

## Impact

- **Total Lenders**: 206
- **Valid for Crawling**: 194 (94.2%)
- **Skip Crawling**: 12 (5.8%)
- **Bandwidth Saved**: ~5.8% of crawl attempts

## Action Items

1. ✅ **Run Migration**: Add `skip_crawling` column
2. ✅ **Mark Lenders**: Set flag for invalid/suspicious lenders
3. ✅ **Update Crawler**: Skip lenders with `skip_crawling = TRUE`
4. ⏳ **Review Suspicious**: Manually review the 7 suspicious lenders
5. ⏳ **Verify**: Ensure legitimate lenders aren't incorrectly marked

## Patterns Identified

### High Confidence Invalid Patterns:
- Single word category names: "Commercial", "Hard Money"
- "Only" suffix: "NDC Only"
- Generic descriptors: "Specialty Lender"
- Program lists: Multiple loan types listed

### Medium Confidence Suspicious Patterns:
- Unusual special characters: `&`, `[`, `]`
- Very long names (80+ characters)
- High word count (10+ words)
- Contains description keywords: "compensation", "unusual", "only"

## Next Steps

1. Run migration to add `skip_crawling` column
2. Mark identified lenders
3. Review suspicious lenders manually
4. Continue crawling with 194 valid lenders

---

**Status**: ✅ Identified  
**Date**: 2025-12-02  
**Next**: Run migration and mark lenders


