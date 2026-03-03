/**
 * Lender Detailed Tab Import Script
 * 
 * Purpose: Import detailed lender data from individual Google Sheet tabs
 *          Includes ALL data (sensitive and non-sensitive) into gated fields
 * 
 * Usage:
 *   node scripts/import-lender-detailed-tabs.js [--dry-run] [--file path/to/lender-tab.csv] [--lender-name "Lender Name"]
 *   node scripts/import-lender-detailed-tabs.js [--dry-run] [--directory path/to/csv/directory]
 * 
 * Features:
 *   - Imports ALL data including sensitive fields (compensation, fees, contact info)
 *   - Structures data in JSONB fields for gated access
 *   - Matches lenders by name to existing records
 *   - Updates gated fields: detailed_program_data, special_features, program_specifics, internal_notes
 *   - RLS policies ensure data is only accessible via authenticated broker portal
 *   - Never displayed in public CMS (rateroots.com content only)
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
  : null;
const CSV_DIRECTORY = process.argv.includes('--directory')
  ? process.argv[process.argv.indexOf('--directory') + 1]
  : null;
const LENDER_NAME = process.argv.includes('--lender-name')
  ? process.argv[process.argv.indexOf('--lender-name') + 1]
  : null;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_ID = process.env.SITE_ID || 'rateroots';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========================================
// DATA EXTRACTION FUNCTIONS
// ========================================

/**
 * Extract contact information from sheet data
 */
function extractContactInfo(data) {
  const contactInfo = {};
  
  // Look for contact person name
  const contactPersonPatterns = [
    /Contact Information/i,
    /Contact Person/i,
    /Account Executive/i,
    /Account Manager/i
  ];
  
  // Look for email
  const emailPattern = /[\w\.-]+@[\w\.-]+\.\w+/;
  
  // Look for phone
  const phonePattern = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  
  // Search through all values
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const valueStr = String(value).trim();
    
    // Extract email
    if (emailPattern.test(valueStr) && !contactInfo.email) {
      contactInfo.email = valueStr.match(emailPattern)[0];
    }
    
    // Extract phone
    if (phonePattern.test(valueStr) && !contactInfo.phone) {
      contactInfo.phone = valueStr.match(phonePattern)[0];
    }
    
    // Extract contact person (if it's a name-like value)
    if (contactPersonPatterns.some(p => key.match(p)) && valueStr.length > 3 && valueStr.length < 50) {
      if (!contactInfo.name) {
        contactInfo.name = valueStr;
      }
    }
  }
  
  return Object.keys(contactInfo).length > 0 ? contactInfo : null;
}

/**
 * Extract compensation and fees
 */
function extractCompensationAndFees(data) {
  const compensation = {};
  const fees = {
    broker: {},
    ndc: {},
    processing: null
  };
  
  // Patterns for compensation
  const compPatterns = [
    /MLO.*Comp/i,
    /compensation/i,
    /comp\s*%/i,
    /(\d+\.?\d*)\s*%/i
  ];
  
  // Patterns for fees
  const feePatterns = [
    /UW fee/i,
    /Underwriting fee/i,
    /Processing fee/i,
    /Flood/i,
    /Tax/i,
    /Mers/i,
    /Credit Report/i,
    /Doc Fee/i
  ];
  
  // Extract compensation percentage
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const valueStr = String(value).trim();
    
    // Compensation
    if (compPatterns.some(p => key.match(p) || valueStr.match(p))) {
      const percentMatch = valueStr.match(/(\d+\.?\d*)\s*%/);
      if (percentMatch) {
        compensation.mlo_broker_percentage = parseFloat(percentMatch[1]);
      }
    }
    
    // Fees
    if (feePatterns.some(p => key.match(p))) {
      const dollarMatch = valueStr.match(/\$(\d+)/);
      if (dollarMatch) {
        const feeAmount = parseFloat(dollarMatch[1]);
        const feeKey = key.toLowerCase().replace(/\s+/g, '_');
        
        if (key.match(/NDC|ndc/i)) {
          fees.ndc[feeKey] = feeAmount;
        } else if (key.match(/Processing|processing/i)) {
          fees.processing = feeAmount;
        } else {
          fees.broker[feeKey] = feeAmount;
        }
      }
    }
  }
  
  return {
    compensation: Object.keys(compensation).length > 0 ? compensation : null,
    fees: Object.keys(fees.broker).length > 0 || Object.keys(fees.ndc).length > 0 || fees.processing ? fees : null
  };
}

/**
 * Extract platform access information
 */
function extractPlatformAccess(data) {
  const platforms = [];
  
  const platformPatterns = [
    /Smart Pricer/i,
    /Loansifter/i,
    /Loan Sifter/i,
    /Correspondent/i,
    /Broker/i,
    /NDC/i,
    /Portal/i
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const valueStr = String(value).trim();
    
    if (platformPatterns.some(p => valueStr.match(p))) {
      if (valueStr.match(/Smart Pricer/i)) platforms.push('smart_pricer');
      if (valueStr.match(/Loansifter|Loan Sifter/i)) platforms.push('loansifter');
      if (valueStr.match(/Correspondent/i)) platforms.push('correspondent');
      if (valueStr.match(/Broker/i)) platforms.push('broker');
      if (valueStr.match(/NDC/i)) platforms.push('ndc');
    }
  }
  
  return platforms.length > 0 ? [...new Set(platforms)] : null;
}

/**
 * Extract processing and underwriting information
 */
function extractProcessingInfo(data) {
  const processing = {};
  const underwriting = {};
  
  // Processing timeline patterns
  const timelinePatterns = [
    /(\d+)\s*(hr|hour|hrs|hours)/i,
    /(\d+)\s*(day|days)/i,
    /Review.*(\d+)/i,
    /CTC.*(\d+)/i
  ];
  
  // Underwriting patterns
  const uwPatterns = [
    /Underwriter/i,
    /UW/i,
    /Condition/i,
    /Approval/i,
    /Manual/i
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const valueStr = String(value).trim();
    
    // Processing timelines
    if (timelinePatterns.some(p => valueStr.match(p))) {
      const hoursMatch = valueStr.match(/(\d+)\s*(hr|hour|hrs|hours)/i);
      const daysMatch = valueStr.match(/(\d+)\s*(day|days)/i);
      
      if (hoursMatch) {
        processing.review_hours = parseInt(hoursMatch[1]);
      }
      if (daysMatch) {
        processing.ctc_days = parseInt(daysMatch[1]);
      }
    }
    
    // Underwriting details
    if (uwPatterns.some(p => valueStr.match(p))) {
      if (key.match(/Condition|condition/i)) {
        underwriting.condition_review = valueStr;
      }
      if (key.match(/Approval|approval/i)) {
        underwriting.approval_process = valueStr;
      }
      if (valueStr.match(/Manual/i)) {
        underwriting.manual_underwriting = true;
      }
    }
  }
  
  return {
    processing: Object.keys(processing).length > 0 ? processing : null,
    underwriting: Object.keys(underwriting).length > 0 ? underwriting : null
  };
}

/**
 * Extract warnings and internal notes
 */
function extractWarningsAndNotes(data) {
  const warnings = [];
  const notes = [];
  
  const warningPatterns = [
    /Use with caution/i,
    /USE AT YOUR OWN RISK/i,
    /Very slow/i,
    /Pending/i,
    /No longer active/i,
    /shut down/i,
    /Warning/i,
    /Caution/i
  ];
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const valueStr = String(value).trim();
    
    if (warningPatterns.some(p => valueStr.match(p))) {
      warnings.push(valueStr);
    }
    
    // Internal notes (non-warning context)
    if (key.match(/Note|Internal|Portal|Login|Instruction/i)) {
      notes.push(`${key}: ${valueStr}`);
    }
  }
  
  return {
    warnings: warnings.length > 0 ? warnings : null,
    notes: notes.length > 0 ? notes : null
  };
}

/**
 * Extract program-specific requirements
 */
function extractProgramRequirements(data) {
  const requirements = {};
  
  // FICO patterns
  const ficoPattern = /FICO.*?(\d{3})/i;
  // LTV patterns
  const ltvPattern = /LTV.*?(\d+)/i;
  // State patterns
  const statePattern = /\b([A-Z]{2})\b/;
  
  for (const [key, value] of Object.entries(data)) {
    if (!value) continue;
    const valueStr = String(value).trim();
    
    // Extract FICO
    if (ficoPattern.test(valueStr)) {
      const match = valueStr.match(ficoPattern);
      if (match && !requirements.min_fico) {
        requirements.min_fico = parseInt(match[1]);
      }
    }
    
    // Extract LTV
    if (ltvPattern.test(valueStr)) {
      const match = valueStr.match(ltvPattern);
      if (match && !requirements.max_ltv) {
        requirements.max_ltv = parseInt(match[1]);
      }
    }
  }
  
  return Object.keys(requirements).length > 0 ? requirements : null;
}

// ========================================
// MAIN PROCESSING FUNCTION
// ========================================

/**
 * Process a single lender tab CSV file
 */
async function processLenderTab(csvFilePath, lenderNameOverride = null) {
  console.log(`\n📄 Processing: ${path.basename(csvFilePath)}`);
  
  return new Promise((resolve, reject) => {
    const rows = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csv({
        skipLinesWithError: true,
        skipEmptyLines: true,
        headers: true
      }))
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', async () => {
        try {
          // Combine all rows into a single data object
          const combinedData = {};
          rows.forEach(row => {
            Object.entries(row).forEach(([key, value]) => {
              if (value && value.trim()) {
                combinedData[key] = value.trim();
              }
            });
          });
          
          // Extract lender name from filename or data
          let lenderName = lenderNameOverride;
          if (!lenderName) {
            // Try to extract from filename
            const filename = path.basename(csvFilePath, '.csv');
            lenderName = filename.replace(/^[0-9]+\s*/, '').trim();
          }
          
          // Extract all data
          const contactInfo = extractContactInfo(combinedData);
          const { compensation, fees } = extractCompensationAndFees(combinedData);
          const platforms = extractPlatformAccess(combinedData);
          const { processing, underwriting } = extractProcessingInfo(combinedData);
          const { warnings, notes } = extractWarningsAndNotes(combinedData);
          const programRequirements = extractProgramRequirements(combinedData);
          
          // Build structured data objects
          const detailedProgramData = {
            compensation: compensation || null,
            fees: fees || null,
            requirements: programRequirements || null
          };
          
          const specialFeatures = {
            platforms: platforms || null,
            processing: processing || null,
            underwriting: underwriting || null
          };
          
          const internalNotes = {
            contact_info: contactInfo || null,
            warnings: warnings || null,
            notes: notes || null
          };
          
          resolve({
            lenderName,
            detailedProgramData,
            specialFeatures,
            internalNotes,
            rawData: combinedData
          });
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

/**
 * Find lender by name in database
 */
async function findLenderByName(lenderName, siteId) {
  // Try exact match first
  let { data, error } = await supabase
    .from('lenders')
    .select('id, name, slug')
    .eq('site_id', siteId)
    .ilike('name', lenderName)
    .limit(1)
    .single();
  
  if (data) return data;
  
  // Try partial match
  const { data: partialMatch, error: partialError } = await supabase
    .from('lenders')
    .select('id, name, slug')
    .eq('site_id', siteId)
    .ilike('name', `%${lenderName}%`)
    .limit(5);
  
  if (partialMatch && partialMatch.length > 0) {
    // Return closest match
    return partialMatch[0];
  }
  
  return null;
}

/**
 * Update lender with detailed data
 */
async function updateLenderWithDetailedData(lenderId, data) {
  const updateData = {
    detailed_program_data: data.detailedProgramData,
    special_features: data.specialFeatures,
    internal_notes: JSON.stringify(data.internalNotes),
    updated_at: new Date().toISOString()
  };
  
  if (DRY_RUN) {
    console.log('  🔍 DRY RUN - Would update lender:', lenderId);
    console.log('  📊 Update data:', JSON.stringify(updateData, null, 2));
    return { success: true, dryRun: true };
  }
  
  const { data: updated, error } = await supabase
    .from('lenders')
    .update(updateData)
    .eq('id', lenderId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update lender: ${error.message}`);
  }
  
  return { success: true, data: updated };
}

// ========================================
// MAIN IMPORT FUNCTION
// ========================================

async function importDetailedTabs() {
  console.log('🚀 Starting detailed lender tab import...\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No database changes will be made\n');
  }
  
  const results = {
    processed: 0,
    updated: 0,
    notFound: 0,
    errors: []
  };
  
  try {
    // Single file mode
    if (CSV_FILE) {
      if (!fs.existsSync(CSV_FILE)) {
        throw new Error(`CSV file not found: ${CSV_FILE}`);
      }
      
      const processed = await processLenderTab(CSV_FILE, LENDER_NAME);
      results.processed++;
      
      console.log(`\n🔍 Looking up lender: "${processed.lenderName}"`);
      const lender = await findLenderByName(processed.lenderName, SITE_ID);
      
      if (!lender) {
        console.log(`  ⚠️  Lender not found: "${processed.lenderName}"`);
        results.notFound++;
        console.log('\n💡 Tip: Use --lender-name "Exact Lender Name" to specify the name');
        return results;
      }
      
      console.log(`  ✅ Found lender: ${lender.name} (${lender.slug})`);
      
      const updateResult = await updateLenderWithDetailedData(lender.id, {
        detailedProgramData: processed.detailedProgramData,
        specialFeatures: processed.specialFeatures,
        internalNotes: processed.internalNotes
      });
      
      if (updateResult.success) {
        results.updated++;
        console.log(`  ✅ Updated lender with detailed data`);
      }
    }
    // Directory mode
    else if (CSV_DIRECTORY) {
      if (!fs.existsSync(CSV_DIRECTORY)) {
        throw new Error(`Directory not found: ${CSV_DIRECTORY}`);
      }
      
      const files = fs.readdirSync(CSV_DIRECTORY)
        .filter(file => file.endsWith('.csv'))
        .map(file => path.join(CSV_DIRECTORY, file));
      
      console.log(`📁 Found ${files.length} CSV files in directory\n`);
      
      for (const file of files) {
        try {
          const processed = await processLenderTab(file);
          results.processed++;
          
          console.log(`\n🔍 Looking up lender: "${processed.lenderName}"`);
          const lender = await findLenderByName(processed.lenderName, SITE_ID);
          
          if (!lender) {
            console.log(`  ⚠️  Lender not found: "${processed.lenderName}"`);
            results.notFound++;
            continue;
          }
          
          console.log(`  ✅ Found lender: ${lender.name} (${lender.slug})`);
          
          const updateResult = await updateLenderWithDetailedData(lender.id, {
            detailedProgramData: processed.detailedProgramData,
            specialFeatures: processed.specialFeatures,
            internalNotes: processed.internalNotes
          });
          
          if (updateResult.success) {
            results.updated++;
            console.log(`  ✅ Updated lender with detailed data`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing ${file}:`, error.message);
          results.errors.push({ file, error: error.message });
        }
      }
    }
    else {
      throw new Error('Must provide either --file or --directory option');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Processed: ${results.processed}`);
    console.log(`✅ Updated: ${results.updated}`);
    console.log(`⚠️  Not Found: ${results.notFound}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(({ file, error }) => {
        console.log(`  - ${path.basename(file)}: ${error}`);
      });
    }
    
    if (DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - No changes were made to the database');
    }
    
    return results;
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  }
}

// ========================================
// RUN IMPORT
// ========================================

if (require.main === module) {
  importDetailedTabs()
    .then(() => {
      console.log('\n✅ Import complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

module.exports = { importDetailedTabs, processLenderTab };


