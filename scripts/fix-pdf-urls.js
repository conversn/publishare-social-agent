/**
 * Fix PDF URLs in Lender Database
 * 
 * Removes incorrect PDF/document URLs from lenders and sets website_url to null
 * so the crawler can find the correct URL.
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

// Patterns that indicate document files, not websites
const DOCUMENT_PATTERNS = [
  /\.pdf$/i,
  /\.docx?$/i,
  /\.xlsx?$/i,
  /\/downloads\//i,
  /\/files\//i,
  /\/uploads\//i,
  /\/wp-content\/uploads\//i,
  /\.gov\.ng/i, // Nigerian government domain (often PDFs)
  /worldbank\.org.*\.pdf/i,
  /ndic\.gov\.ng/i,
];

async function fixPdfUrls() {
  console.log('🔍 Finding lenders with PDF/document URLs...\n');

  try {
    // Fetch all lenders with website_url
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, website_url')
      .not('website_url', 'is', null)
      .eq('site_id', 'rateroots');

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!lenders || lenders.length === 0) {
      console.log('No lenders found');
      return;
    }

    // Find lenders with PDF/document URLs
    const lendersToFix = lenders.filter(lender => {
      return DOCUMENT_PATTERNS.some(pattern => pattern.test(lender.website_url));
    });

    console.log(`📊 Found ${lendersToFix.length} lenders with PDF/document URLs:\n`);

    if (lendersToFix.length === 0) {
      console.log('✅ No PDF URLs found!');
      return;
    }

    // Show what will be fixed
    lendersToFix.forEach((lender, index) => {
      console.log(`${index + 1}. ${lender.name}`);
      console.log(`   Current URL: ${lender.website_url}\n`);
    });

    // Check if dry-run
    const isDryRun = process.argv.includes('--dry-run');
    if (isDryRun) {
      console.log('🔍 DRY RUN - No changes will be made\n');
      return;
    }

    console.log('🧹 Fixing PDF URLs (setting to null for re-crawl)...\n');

    let updated = 0;
    let errors = 0;

    for (const lender of lendersToFix) {
      try {
        // Set website_url to null so crawler can find correct URL
        const { error: updateError } = await supabase
          .from('lenders')
          .update({ website_url: null })
          .eq('id', lender.id);

        if (updateError) {
          console.error(`❌ Error updating ${lender.name}: ${updateError.message}`);
          errors++;
        } else {
          console.log(`✅ ${lender.name} - URL cleared (was: ${lender.website_url})`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${lender.name}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Updated: ${updated} lenders`);
    console.log(`❌ Errors: ${errors} lenders`);
    console.log(`\n🎯 Next Steps:`);
    console.log(`1. Re-run crawler with auto_correct_urls: true`);
    console.log(`2. Crawler will find correct URLs for these lenders`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run fix
fixPdfUrls()
  .then(() => {
    console.log('\n✅ Fix complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


