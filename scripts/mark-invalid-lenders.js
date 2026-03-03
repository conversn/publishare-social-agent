/**
 * Mark Invalid Lenders - Set skip_crawling flag
 * 
 * Marks lenders identified as invalid/suspicious to skip during crawling
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

// Invalid lender IDs (high confidence)
const INVALID_LENDER_IDS = [
  '8da1067b-14c3-48e4-a796-547c96432945', // Commercial
  'd45394e1-e36c-43cd-8f5b-c8b6edb6fea5', // Hard Money
  '61507eb3-9170-4755-b476-811605e5f0e4', // NDC Only
  '9b62de47-a67c-476f-917d-af2e865c0ce7', // NexBank (DSCR and Bank Statement)
  'c468610f-5109-49bf-b597-492ecc4fa6ff', // Specialty Lender
];

// Suspicious lender IDs (medium confidence - review recommended)
const SUSPICIOUS_LENDER_IDS = [
  '99dd4fb3-7c74-443d-be57-1684d93be808', // Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR
  '16bab36c-a8da-44c6-8e22-7df3c07b9c08', // Lenders with creative loan options...
  'bf80b5e2-a2d5-4647-ba35-4621b6b2ded8', // Unusual MLO Compesation Broker Lender Paid or Borrower Paid Only
];

async function markInvalidLenders() {
  console.log('🏷️  Marking invalid lenders to skip crawling...\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No changes will be made\n');
  }

  try {
    // Get lender names for display
    const allIds = [...INVALID_LENDER_IDS, ...SUSPICIOUS_LENDER_IDS];
    
    // First check if skip_crawling column exists
    const { data: testLender } = await supabase
      .from('lenders')
      .select('skip_crawling')
      .limit(1)
      .single();
    
    if (testLender === null && !testLender?.hasOwnProperty('skip_crawling')) {
      console.error('❌ Column skip_crawling does not exist. Please run the migration first:');
      console.error('   See: docs/lender-db/RUN_SKIP_CRAWLING_MIGRATION.md');
      process.exit(1);
    }
    
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, skip_crawling')
      .in('id', allIds);

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    console.log(`📊 Found ${lenders.length} lenders to mark:\n`);

    // Show invalid lenders
    const invalidLenders = lenders.filter(l => INVALID_LENDER_IDS.includes(l.id));
    if (invalidLenders.length > 0) {
      console.log('❌ Invalid Lenders (High Confidence):');
      invalidLenders.forEach((lender, i) => {
        console.log(`  ${i + 1}. ${lender.name} (${lender.id})`);
        console.log(`     Current skip_crawling: ${lender.skip_crawling || false}`);
      });
    }

    // Show suspicious lenders
    const suspiciousLenders = lenders.filter(l => SUSPICIOUS_LENDER_IDS.includes(l.id));
    if (suspiciousLenders.length > 0) {
      console.log(`\n⚠️  Suspicious Lenders (Medium Confidence):`);
      suspiciousLenders.forEach((lender, i) => {
        console.log(`  ${i + 1}. ${lender.name} (${lender.id})`);
        console.log(`     Current skip_crawling: ${lender.skip_crawling || false}`);
      });
    }

    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN - Would mark ${allIds.length} lenders to skip crawling`);
      return;
    }

    // Mark all as skip_crawling
    console.log(`\n🏷️  Marking ${allIds.length} lenders to skip crawling...\n`);

    const { error: updateError } = await supabase
      .from('lenders')
      .update({ skip_crawling: true })
      .in('id', allIds);

    if (updateError) {
      throw new Error(`Failed to update lenders: ${updateError.message}`);
    }

    console.log(`✅ Successfully marked ${allIds.length} lenders to skip crawling`);
    console.log(`   - Invalid: ${INVALID_LENDER_IDS.length}`);
    console.log(`   - Suspicious: ${SUSPICIOUS_LENDER_IDS.length}`);

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

markInvalidLenders()
  .then(() => {
    console.log('\n✅ Marking complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

