/**
 * Lender Directory CSV Import Script
 * 
 * Purpose: Import lender data from CSV while sanitizing sensitive information
 * 
 * Usage:
 *   node scripts/import-lender-directory.js [--dry-run] [--file path/to/file.csv]
 * 
 * Features:
 *   - Removes all sensitive data (compensation, contact info, internal notes)
 *   - Parses loan programs from highlights
 *   - Transforms data to database format
 *   - Supports manual review workflow
 *   - Separates public vs gated data
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parser');
const readline = require('readline');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const CSV_FILE = process.argv.includes('--file') 
  ? process.argv[process.argv.indexOf('--file') + 1]
  : path.join(__dirname, '../docs/lender-db/RR- Lender List - Lender List.csv');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========================================
// SENSITIVE DATA PATTERNS (To Remove)
// ========================================

const SENSITIVE_PATTERNS = [
  // Compensation patterns
  /MLO.*Comp/i,
  /compensation/i,
  /comp\s*%/i,
  /\d+\.?\d*\s*%/i, // Percentage patterns
  /\$\d+/i, // Dollar amounts (processing fees)
  
  // Contact patterns
  /Account Executive/i,
  /Email/i,
  /Phone Number/i,
  /@.*\.com/i, // Email addresses
  /\d{3}[-.]?\d{3}[-.]?\d{4}/i, // Phone numbers
  
  // Internal notes
  /\[.*Missing.*Margin/i,
  /\[.*Use with caution/i,
  /\[.*USE AT YOUR OWN RISK/i,
  /Internal/i,
  /Broker.*NDC/i,
  /GC margin/i,
  /SVL margin/i,
  /Smart Pricer/i,
  /LoanSifter/i,
  
  // Warnings
  /Very slow/i,
  /Pending/i,
  /No longer active/i,
  /shut down/i,
];

// ========================================
// LOAN PROGRAM MAPPING
// ========================================

const LOAN_PROGRAM_MAP = {
  // Government
  'FHA': 'fha',
  'VA': 'va',
  'USDA': 'usda',
  
  // Conventional
  'Conventional': 'conventional',
  'Conv': 'conventional',
  'High Balance': 'high-balance',
  'HomeReady': 'homeready',
  'Home Possible': 'home-possible',
  'HomePossible': 'home-possible',
  
  // Non-QM
  'DSCR': 'dscr',
  'DCSR': 'dscr', // Common typo
  'Bank Statement': 'bank-statement',
  'Bank statement': 'bank-statement',
  'Asset Depletion': 'asset-depletion',
  'ITIN': 'itin',
  'Foreign National': 'foreign-national',
  'Foreign': 'foreign-national',
  'No Ratio': 'no-ratio',
  'VOE Only': 'voe-only',
  'VOE only': 'voe-only',
  '1099 Only': '1099-only',
  '1099 only': '1099-only',
  'P&L Only': 'pl-only',
  'P&L only': 'pl-only',
  'WVOE': 'voe-only',
  
  // Jumbo
  'Jumbo': 'jumbo',
  'Super Jumbo': 'super-jumbo',
  
  // Commercial
  'Commercial': 'commercial',
  'Multifamily': 'multifamily',
  'Multi Family': 'multifamily',
  'Multi family': 'multifamily',
  'Mixed Use': 'mixed-use',
  'Mix Use': 'mixed-use',
  
  // Specialty
  'Reverse': 'reverse',
  'HELOC': 'heloc',
  'Construction': 'construction',
  'Renovation': 'renovation',
  'Bridge': 'bridge',
  'Fix and Flip': 'fix-flip',
  'Fix & Flip': 'fix-flip',
  'Land': 'land',
  'Lot': 'land',
  'Manufactured': 'manufactured',
  'DPA': 'dpa',
  'Down Payment Assistance': 'dpa',
  'Second': 'heloc',
  '2nd': 'heloc',
  'Piggyback': 'heloc',
  'Stand Alone 2nd': 'heloc',
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Sanitize text by removing sensitive patterns
 */
function sanitizeText(text) {
  if (!text) return '';
  
  let sanitized = text;
  
  // Remove sensitive patterns
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Extract loan programs from highlights text
 */
function extractLoanPrograms(highlights) {
  if (!highlights) return [];
  
  const programs = new Set();
  const upperHighlights = highlights.toUpperCase();
  
  // Check each program in the map
  Object.entries(LOAN_PROGRAM_MAP).forEach(([key, slug]) => {
    if (upperHighlights.includes(key.toUpperCase())) {
      programs.add(slug);
    }
  });
  
  // Also check for common patterns
  if (upperHighlights.includes('NON QM') || upperHighlights.includes('NON-QM')) {
    programs.add('dscr');
    programs.add('bank-statement');
  }
  
  return Array.from(programs);
}

/**
 * Extract FICO score from text
 */
function extractFICO(text) {
  if (!text) return null;
  
  const ficoMatch = text.match(/(\d{3})\s*FICO/i);
  if (ficoMatch) {
    return parseInt(ficoMatch[1]);
  }
  
  // Also check for "down to X FICO" or "X FICO"
  const downToMatch = text.match(/down to (\d{3})\s*fico/i);
  if (downToMatch) {
    return parseInt(downToMatch[1]);
  }
  
  return null;
}

/**
 * Extract LTV from text
 */
function extractLTV(text) {
  if (!text) return null;
  
  const ltvMatch = text.match(/(\d{1,2})\s*%?\s*LTV/i);
  if (ltvMatch) {
    return parseFloat(ltvMatch[1]);
  }
  
  // Check for "up to X% LTV"
  const upToMatch = text.match(/up to (\d{1,2})\s*%?\s*LTV/i);
  if (upToMatch) {
    return parseFloat(upToMatch[1]);
  }
  
  return null;
}

/**
 * Extract states from text
 */
function extractStates(text) {
  if (!text) return [];
  
  const stateCodes = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];
  
  const foundStates = [];
  const upperText = text.toUpperCase();
  
  stateCodes.forEach(state => {
    if (upperText.includes(state)) {
      foundStates.push(state);
    }
  });
  
  // Also check for "All 50 States" or "Nationwide"
  if (upperText.includes('ALL 50') || upperText.includes('NATIONWIDE') || upperText.includes('ALL STATES')) {
    return stateCodes; // All states
  }
  
  return foundStates;
}

/**
 * Create slug from lender name
 */
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse highlights into array
 */
function parseHighlights(highlights) {
  if (!highlights) return [];
  
  // Split by common delimiters
  const items = highlights
    .split(/[,;]| and /i)
    .map(item => sanitizeText(item.trim()))
    .filter(item => item.length > 0 && item.length < 200); // Reasonable length
  
  return items.slice(0, 10); // Max 10 highlights
}

// ========================================
// DATA TRANSFORMATION
// ========================================

/**
 * Transform CSV row to lender database format
 */
function transformLenderData(row, userId, siteId = 'rateroots') {
  const lenderName = row['Investor/Lender']?.trim();
  if (!lenderName) return null;
  
  const highlights = row['Highlights/ Key Words'] || '';
  const sanitizedHighlights = sanitizeText(highlights);
  
  // Extract data
  const loanPrograms = extractLoanPrograms(highlights);
  const minFico = extractFICO(highlights);
  const maxLtv = extractLTV(highlights);
  const states = extractStates(highlights);
  
  // Parse highlights array
  const highlightsArray = parseHighlights(sanitizedHighlights);
  
  // Create lender object
  const lender = {
    // Public fields
    name: lenderName,
    slug: createSlug(lenderName),
    description: sanitizedHighlights.substring(0, 500) || null, // Max 500 chars
    highlights: highlightsArray.length > 0 ? highlightsArray : null,
    min_fico_score: minFico,
    max_ltv: maxLtv,
    max_loan_amount: null, // Extract if available in future
    states_available: states.length > 0 ? states : null,
    
    // Integration fields
    user_id: userId,
    site_id: siteId,
    article_id: null, // Will be created later
    organization_id: null, // Will be linked later
    
    // Gated fields (empty for now, populated manually)
    detailed_program_data: {},
    special_features: {},
    internal_notes: null,
    program_specifics: {},
    
    // Publication status
    is_published: false, // Requires manual approval
    publication_notes: 'Imported from CSV - requires review',
  };
  
  return {
    lender,
    loanPrograms, // For junction table
    rawHighlights: highlights, // For manual review
  };
}

// ========================================
// DATABASE OPERATIONS
// ========================================

/**
 * Get or create loan program by slug
 */
async function getOrCreateLoanProgram(slug, name, category) {
  // Try to find existing
  const { data: existing } = await supabase
    .from('loan_programs')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (existing) {
    return existing.id;
  }
  
  // Create if not exists
  const { data: created, error } = await supabase
    .from('loan_programs')
    .insert({
      name: name,
      slug: slug,
      category: category || 'SPECIALTY',
      is_active: true,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`Error creating loan program ${slug}:`, error);
    return null;
  }
  
  return created.id;
}

/**
 * Create lender in database
 */
async function createLender(lenderData, loanProgramSlugs) {
  if (DRY_RUN) {
    console.log('  [DRY RUN] Would create lender:', lenderData.name);
    return { id: 'dry-run-id', lender: lenderData };
  }
  
  // Check if lender already exists
  const { data: existing } = await supabase
    .from('lenders')
    .select('id')
    .eq('site_id', lenderData.site_id)
    .eq('slug', lenderData.slug)
    .single();
  
  if (existing) {
    console.log(`  ⚠️  Lender already exists: ${lenderData.name} (${existing.id})`);
    return { id: existing.id, lender: lenderData, exists: true };
  }
  
  // Create lender
  const { data: created, error } = await supabase
    .from('lenders')
    .insert(lenderData)
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ Error creating lender ${lenderData.name}:`, error);
    return null;
  }
  
  console.log(`  ✅ Created lender: ${lenderData.name} (${created.id})`);
  
  // Create lender-program relationships
  if (loanProgramSlugs.length > 0) {
    await createLenderPrograms(created.id, loanProgramSlugs);
  }
  
  return { id: created.id, lender: lenderData };
}

/**
 * Create lender-program relationships
 */
async function createLenderPrograms(lenderId, programSlugs) {
  const relationships = [];
  
  for (const slug of programSlugs) {
    // Determine category from slug
    let category = 'SPECIALTY';
    if (['fha', 'va', 'usda'].includes(slug)) category = 'GOVERNMENT';
    else if (['conventional', 'high-balance', 'homeready', 'home-possible'].includes(slug)) category = 'CONVENTIONAL';
    else if (['dscr', 'bank-statement', 'asset-depletion', 'itin', 'foreign-national', 'no-ratio', 'voe-only', '1099-only', 'pl-only'].includes(slug)) category = 'NON_QM';
    else if (['jumbo', 'super-jumbo'].includes(slug)) category = 'JUMBO';
    else if (['commercial', 'multifamily', 'mixed-use'].includes(slug)) category = 'COMMERCIAL';
    
    // Get program name from slug
    const programName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    const programId = await getOrCreateLoanProgram(slug, programName, category);
    if (programId) {
      relationships.push({
        lender_id: lenderId,
        loan_program_id: programId,
        public_features: null, // Will be populated manually
      });
    }
  }
  
  if (relationships.length > 0 && !DRY_RUN) {
    const { error } = await supabase
      .from('lender_programs')
      .insert(relationships);
    
    if (error) {
      console.error(`  ⚠️  Error creating lender-program relationships:`, error);
    } else {
      console.log(`  ✅ Created ${relationships.length} lender-program relationships`);
    }
  }
}

// ========================================
// MAIN IMPORT FUNCTION
// ========================================

async function importLenders() {
  console.log('🚀 Starting lender directory import...\n');
  console.log(`📁 CSV File: ${CSV_FILE}`);
  console.log(`🔧 Dry Run: ${DRY_RUN ? 'YES' : 'NO'}\n`);
  
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }
  
  // Get user ID (use first admin user or create system user)
  // For now, we'll need to pass this or use a system user
  const userId = process.env.IMPORT_USER_ID || '00000000-0000-0000-0000-000000000000';
  
  if (userId === '00000000-0000-0000-0000-000000000000') {
    console.warn('⚠️  Using placeholder user ID. Set IMPORT_USER_ID environment variable.');
  }
  
  const lenders = [];
  const errors = [];
  
  // Read CSV file
  // The CSV has a multi-line header (lines 1-10), so we need to skip those
  return new Promise((resolve, reject) => {
    let lineNumber = 0;
    let skipHeaderLines = 10; // Skip first 10 lines (header rows)
    
    fs.createReadStream(CSV_FILE)
      .pipe(csv({
        skipLinesWithError: true,
        headers: ['Investor/Lender', 'Lender Information', 'VA', 'Loan Sifter', 'Broker', 'NDC Corr.', 'MLO Broker Lender Paid Comp MLO makes below %', 'Processing Fee- ONLY WHEN LENDER PAID- otherwise its $795', 'Account Executive', 'Email', 'Phone Number', 'Highlights/ Key Words'],
        skipEmptyLines: true
      }))
      .on('data', (row) => {
        lineNumber++;
        
        // Skip the first 10 rows (header rows)
        if (lineNumber <= skipHeaderLines) {
          return;
        }
        
        try {
          const lenderName = row['Investor/Lender']?.trim();
          
          // Skip empty rows and header rows
          if (!lenderName || lenderName === 'Investor/Lender' || lenderName.startsWith('Click Here')) {
            return;
          }
          
          // Skip section headers
          if (lenderName.includes('%') || lenderName.includes('Compensation') || lenderName === '2% to MLO Compesation Broker Lender Paid') {
            return;
          }
          
          const transformed = transformLenderData(row, userId);
          if (transformed) {
            lenders.push(transformed);
          }
        } catch (error) {
          errors.push({ row, error: error.message });
        }
      })
      .on('end', async () => {
        console.log(`\n📊 Found ${lenders.length} lenders to import`);
        console.log(`⚠️  ${errors.length} rows had errors\n`);
        
        if (errors.length > 0) {
          console.log('Errors:');
          errors.forEach(({ row, error }) => {
            console.log(`  - ${row['Investor/Lender']}: ${error}`);
          });
          console.log('');
        }
        
        // Import lenders
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < lenders.length; i++) {
          const { lender, loanPrograms, rawHighlights } = lenders[i];
          
          console.log(`[${i + 1}/${lenders.length}] Processing: ${lender.name}`);
          console.log(`  Programs: ${loanPrograms.join(', ') || 'None detected'}`);
          console.log(`  FICO: ${lender.min_fico_score || 'N/A'}`);
          console.log(`  LTV: ${lender.max_ltv || 'N/A'}%`);
          console.log(`  States: ${lender.states_available?.length || 0}`);
          
          const result = await createLender(lender, loanPrograms);
          
          if (result) {
            if (result.exists) {
              skipCount++;
            } else {
              successCount++;
            }
          } else {
            errorCount++;
          }
          
          console.log(''); // Blank line
        }
        
        console.log('\n✅ Import complete!');
        console.log(`  ✅ Created: ${successCount}`);
        console.log(`  ⏭️  Skipped (exists): ${skipCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📝 Total: ${lenders.length}\n`);
        
        if (DRY_RUN) {
          console.log('🔧 This was a dry run. No data was actually imported.\n');
        } else {
          console.log('📋 Next steps:');
          console.log('  1. Review imported lenders in the database');
          console.log('  2. Manually populate gated fields (detailed_program_data, special_features)');
          console.log('  3. Create SEO article pages for each lender');
          console.log('  4. Approve and publish lenders\n');
        }
        
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error);
        reject(error);
      });
  });
}

// ========================================
// RUN IMPORT
// ========================================

if (require.main === module) {
  importLenders()
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importLenders, transformLenderData, sanitizeText, extractLoanPrograms };

