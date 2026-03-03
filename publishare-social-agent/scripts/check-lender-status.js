/**
 * Check Lender Status - See which lenders need processing
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

async function checkLenderStatus() {
  console.log('📊 Checking lender status...\n');

  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('lenders')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', 'rateroots');

    if (countError) {
      throw new Error(`Failed to count lenders: ${countError.message}`);
    }

    // Get lenders without website_url
    const { count: noWebsiteCount } = await supabase
      .from('lenders')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', 'rateroots')
      .is('website_url', null);

    // Get lenders with website_url (not null, not empty)
    const { count: withWebsiteCount } = await supabase
      .from('lenders')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', 'rateroots')
      .not('website_url', 'is', null)
      .neq('website_url', '');

    // Get lenders with PDF URLs
    const { data: pdfLenders } = await supabase
      .from('lenders')
      .select('id, name, website_url')
      .eq('site_id', 'rateroots')
      .not('website_url', 'is', null)
      .or('website_url.ilike.%.pdf,website_url.ilike.%/downloads/%,website_url.ilike.%/files/%,website_url.ilike.%/uploads/%');

    // Get lenders without website info in special_features
    const { count: noWebsiteInfoCount } = await supabase
      .from('lenders')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', 'rateroots')
      .is('special_features->website_info', null);

    // Get lenders without business lending data
    const { count: noBusinessLendingCount } = await supabase
      .from('lenders')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', 'rateroots')
      .is('special_features->business_lending', null);

    // Also check for URLs in special_features
    const { data: allLenders } = await supabase
      .from('lenders')
      .select('id, website_url, special_features')
      .eq('site_id', 'rateroots');

    let withUrlInSpecialFeatures = 0;
    if (allLenders) {
      withUrlInSpecialFeatures = allLenders.filter(l => {
        if (l.website_url && l.website_url.trim() !== '') return false; // Already counted
        if (!l.special_features) return false;
        const sf = typeof l.special_features === 'string' 
          ? JSON.parse(l.special_features) 
          : l.special_features;
        return sf && sf.website_info && sf.website_info.url && sf.website_info.url.trim() !== '';
      }).length;
    }

    const totalWithUrls = withWebsiteCount + withUrlInSpecialFeatures;

    console.log('📈 Lender Statistics:');
    console.log(`Total Lenders: ${totalCount}`);
    console.log(`With Website URL (in column): ${withWebsiteCount}`);
    console.log(`With URL in special_features only: ${withUrlInSpecialFeatures}`);
    console.log(`Total With URLs: ${totalWithUrls}`);
    console.log(`Without Website URL: ${noWebsiteCount}`);
    console.log(`With PDF URLs: ${pdfLenders?.length || 0}`);
    console.log(`Without Website Info: ${noWebsiteInfoCount}`);
    console.log(`Without Business Lending Data: ${noBusinessLendingCount}`);

    if (pdfLenders && pdfLenders.length > 0) {
      console.log(`\n⚠️  Lenders with PDF URLs (${pdfLenders.length}):`);
      pdfLenders.forEach((lender, i) => {
        console.log(`  ${i + 1}. ${lender.name}`);
        console.log(`     URL: ${lender.website_url}`);
      });
    }

    // Get sample of lenders that need processing
    const { data: needsProcessing } = await supabase
      .from('lenders')
      .select('id, name, website_url')
      .eq('site_id', 'rateroots')
      .or('website_url.is.null,special_features->website_info.is.null')
      .limit(10);

    if (needsProcessing && needsProcessing.length > 0) {
      console.log(`\n📋 Sample of lenders needing processing (${needsProcessing.length} shown):`);
      needsProcessing.forEach((lender, i) => {
        console.log(`  ${i + 1}. ${lender.name} - URL: ${lender.website_url || 'NULL'}`);
      });
    } else {
      console.log('\n✅ All lenders appear to have been processed!');
    }

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

checkLenderStatus()
  .then(() => {
    console.log('\n✅ Status check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

