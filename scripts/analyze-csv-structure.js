/**
 * Analyze CSV Structure
 * 
 * Examines the original CSV to understand if "invalid" lender names
 * are actually category headings that group lenders below them
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const CSV_FILE = path.join(__dirname, '../docs/lender-db/RR- Lender List - Lender List.csv');

// Known category headings
const CATEGORY_HEADINGS = [
  'Commercial',
  'Hard Money',
  'NDC Only',
  'Specialty Lender',
  'Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR',
  'Lenders with creative loan options',
  'Unusual MLO Compesation Broker Lender Paid or Borrower Paid Only',
];

async function analyzeCsvStructure() {
  console.log('🔍 Analyzing CSV structure to identify category headings...\n');
  console.log('='.repeat(80));

  const rows = [];
  let lineNumber = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_FILE)
      .pipe(csv({
        skipLinesWithError: true,
        headers: ['Investor/Lender', 'Lender Information', 'VA', 'Loan Sifter', 'Broker', 'NDC Corr.', 'MLO Broker Lender Paid Comp MLO makes below %', 'Processing Fee- ONLY WHEN LENDER PAID- otherwise its $795', 'Account Executive', 'Email', 'Phone Number', 'Highlights/ Key Words'],
        skipEmptyLines: true
      }))
      .on('data', (row) => {
        lineNumber++;
        const lenderName = row['Investor/Lender']?.trim();
        if (lenderName) {
          rows.push({
            lineNumber,
            lenderName,
            highlights: row['Highlights/ Key Words']?.trim() || '',
            broker: row['Broker']?.trim() || '',
            ndc: row['NDC Corr.']?.trim() || '',
          });
        }
      })
      .on('end', () => {
        console.log(`📊 Total rows analyzed: ${rows.length}\n`);

        // Find category headings and lenders that follow them
        const categoryGroups = [];
        let currentCategory = null;
        let lendersInCategory = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const isCategoryHeading = CATEGORY_HEADINGS.some(cat => 
            row.lenderName.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(row.lenderName.toLowerCase())
          );

          if (isCategoryHeading) {
            // Save previous category group if it exists
            if (currentCategory && lendersInCategory.length > 0) {
              categoryGroups.push({
                category: currentCategory,
                lenders: [...lendersInCategory],
              });
            }
            // Start new category
            currentCategory = row.lenderName;
            lendersInCategory = [];
            console.log(`\n📌 Found category heading at line ${row.lineNumber}: "${row.lenderName}"`);
          } else if (currentCategory) {
            // This lender belongs to the current category
            lendersInCategory.push({
              lineNumber: row.lineNumber,
              name: row.lenderName,
              highlights: row.highlights.substring(0, 100),
            });
          }
        }

        // Save last category group
        if (currentCategory && lendersInCategory.length > 0) {
          categoryGroups.push({
            category: currentCategory,
            lenders: [...lendersInCategory],
          });
        }

        // Display results
        console.log(`\n${'='.repeat(80)}`);
        console.log('📊 CATEGORY GROUPING ANALYSIS:\n');

        categoryGroups.forEach((group, idx) => {
          console.log(`\n${idx + 1}. Category: "${group.category}"`);
          console.log(`   Lenders in this category: ${group.lenders.length}`);
          console.log(`   First 5 lenders:`);
          group.lenders.slice(0, 5).forEach((lender, i) => {
            console.log(`     ${i + 1}. ${lender.name} (line ${lender.lineNumber})`);
          });
          if (group.lenders.length > 5) {
            console.log(`     ... and ${group.lenders.length - 5} more`);
          }
        });

        // Also check for lenders that appear BEFORE category headings
        console.log(`\n${'='.repeat(80)}`);
        console.log('🔍 Checking for lenders that appear BEFORE category headings:\n');

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const isCategoryHeading = CATEGORY_HEADINGS.some(cat => 
            row.lenderName.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(row.lenderName.toLowerCase())
          );

          if (isCategoryHeading && i > 0) {
            const previousRow = rows[i - 1];
            if (previousRow && !CATEGORY_HEADINGS.some(cat => 
              previousRow.lenderName.toLowerCase().includes(cat.toLowerCase())
            )) {
              console.log(`⚠️  Category "${row.lenderName}" (line ${row.lineNumber})`);
              console.log(`   Preceded by: "${previousRow.lenderName}" (line ${previousRow.lineNumber})`);
            }
          }
        }

        // Summary
        console.log(`\n${'='.repeat(80)}`);
        console.log('📊 SUMMARY:');
        console.log(`  Total category headings found: ${categoryGroups.length}`);
        const totalLendersInCategories = categoryGroups.reduce((sum, group) => sum + group.lenders.length, 0);
        console.log(`  Total lenders grouped under categories: ${totalLendersInCategories}`);
        console.log(`  Average lenders per category: ${(totalLendersInCategories / categoryGroups.length).toFixed(1)}`);

        resolve();
      })
      .on('error', reject);
  });
}

analyzeCsvStructure()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


