/**
 * Process All Lenders - Systematic cleanup
 * 
 * Processes all lenders in manageable batches with proper error handling
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRAWLER_URL = 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/lender-website-crawler';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCrawlerBatch(batchNum, maxLenders = 10) {
  try {
    const response = await fetch(CRAWLER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crawl_all: false, // Only process lenders without URLs
        max_lenders: maxLenders,
        auto_correct_urls: true,
        focus_business_lending: true,
        update_existing: true,
        site_id: 'rateroots',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Batch ${batchNum} error:`, error.message);
    return null;
  }
}

async function processAllLenders() {
  console.log('🔄 Processing all lenders systematically...\n');

  let totalCrawled = 0;
  let totalUpdated = 0;
  let totalCorrected = 0;
  let totalBL = 0;
  let totalErrors = 0;
  let batchNum = 0;
  let consecutiveZeros = 0;

  while (batchNum < 50) {
    batchNum++;
    console.log(`\n=== Batch ${batchNum} ===`);

    const result = await runCrawlerBatch(batchNum, 10);

    if (!result) {
      console.log('⚠️  Batch failed, waiting 10 seconds...');
      await sleep(10000);
      continue;
    }

    const crawled = result.crawled || 0;
    const updated = result.updated || 0;
    const corrected = result.url_corrected || 0;
    const foundBL = result.found_business_lending || 0;
    const errors = result.errors || 0;

    totalCrawled += crawled;
    totalUpdated += updated;
    totalCorrected += corrected;
    totalBL += foundBL;
    totalErrors += errors;

    console.log(`Crawled: ${crawled} | Updated: ${updated} | URLs Corrected: ${corrected} | Business Lending: ${foundBL} | Errors: ${errors}`);
    console.log(`Running Totals: Crawled: ${totalCrawled} | Updated: ${totalUpdated} | URLs Corrected: ${totalCorrected} | Business Lending: ${totalBL} | Errors: ${totalErrors}`);

    if (crawled === 0) {
      consecutiveZeros++;
      if (consecutiveZeros >= 3) {
        console.log('\n✅ No more lenders to process (3 consecutive batches with 0 lenders)');
        break;
      }
    } else {
      consecutiveZeros = 0;
    }

    // Wait between batches
    if (batchNum < 50) {
      console.log('⏳ Waiting 8 seconds...');
      await sleep(8000);
    }
  }

  console.log('\n📊 FINAL SUMMARY:');
  console.log('═══════════════════════════════════════');
  console.log(`Total Crawled: ${totalCrawled} lenders`);
  console.log(`Total Updated: ${totalUpdated} lenders`);
  console.log(`Total URLs Corrected: ${totalCorrected} lenders`);
  console.log(`Total Business Lending Found: ${totalBL} lenders`);
  console.log(`Total Errors: ${totalErrors} lenders`);
  console.log('═══════════════════════════════════════');
}

// Run
processAllLenders()
  .then(() => {
    console.log('\n✅ Processing complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

