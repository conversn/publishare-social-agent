/**
 * Sync URLs from special_features to website_url column
 * 
 * Many lenders have URLs stored in special_features->website_info->url
 * but not in the website_url column. This script syncs them.
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

async function syncUrlsFromSpecialFeatures() {
  console.log('🔄 Syncing URLs from special_features to website_url column...\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No changes will be made\n');
  }

  try {
    // Get all lenders
    const { data: allLenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, website_url, special_features')
      .eq('site_id', 'rateroots');

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!allLenders || allLenders.length === 0) {
      console.log('No lenders found');
      return;
    }

    // Find lenders with URLs in special_features but not in website_url
    const lendersToUpdate = [];

    for (const lender of allLenders) {
      // Skip if already has website_url
      if (lender.website_url && lender.website_url.trim() !== '') {
        continue;
      }

      // Check special_features for website_info
      if (!lender.special_features) {
        continue;
      }

      const sf = typeof lender.special_features === 'string' 
        ? JSON.parse(lender.special_features) 
        : lender.special_features;

      if (sf && sf.website_info && sf.website_info.url) {
        const url = sf.website_info.url.trim();
        
        // Skip if URL is empty or looks like a PDF/document
        if (!url || 
            url.match(/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz)$/i) ||
            url.includes('/downloads/') ||
            url.includes('/files/') ||
            url.includes('/uploads/')) {
          continue;
        }

        lendersToUpdate.push({
          id: lender.id,
          name: lender.name,
          current_url: lender.website_url,
          new_url: url,
        });
      }
    }

    console.log(`📊 Found ${lendersToUpdate.length} lenders to update:\n`);

    if (lendersToUpdate.length === 0) {
      console.log('✅ No lenders need updating!');
      return;
    }

    // Show what will be updated
    lendersToUpdate.slice(0, 20).forEach((lender, i) => {
      console.log(`${i + 1}. ${lender.name}`);
      console.log(`   Current: ${lender.current_url || 'NULL'}`);
      console.log(`   New: ${lender.new_url}`);
    });

    if (lendersToUpdate.length > 20) {
      console.log(`\n... and ${lendersToUpdate.length - 20} more`);
    }

    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN - Would update ${lendersToUpdate.length} lenders`);
      return;
    }

    // Update lenders
    console.log(`\n🔄 Updating ${lendersToUpdate.length} lenders...\n`);

    let updated = 0;
    let errors = 0;

    for (const lender of lendersToUpdate) {
      try {
        const { error: updateError } = await supabase
          .from('lenders')
          .update({ website_url: lender.new_url })
          .eq('id', lender.id);

        if (updateError) {
          console.error(`❌ Error updating ${lender.name}: ${updateError.message}`);
          errors++;
        } else {
          console.log(`✅ ${lender.name} → ${lender.new_url}`);
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

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

syncUrlsFromSpecialFeatures()
  .then(() => {
    console.log('\n✅ Sync complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


