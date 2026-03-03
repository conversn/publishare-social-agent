/**
 * Verify Database URLs - Direct database check
 * 
 * Queries the database directly to verify actual website_url counts
 * and compare with script logic
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

async function verifyDatabaseUrls() {
  console.log('🔍 Direct Database Verification\n');
  console.log('='.repeat(80));

  try {
    // Get ALL lenders for rateroots
    const { data: allLenders, error: allError } = await supabase
      .from('lenders')
      .select('id, name, website_url, special_features')
      .eq('site_id', 'rateroots');

    if (allError) {
      throw new Error(`Failed to fetch lenders: ${allError.message}`);
    }

    if (!allLenders || allLenders.length === 0) {
      console.log('No lenders found');
      return;
    }

    console.log(`\n📊 Total Lenders: ${allLenders.length}\n`);

    // Count by website_url status
    const withUrl = allLenders.filter(l => l.website_url && l.website_url.trim() !== '');
    const withoutUrl = allLenders.filter(l => !l.website_url || l.website_url.trim() === '');
    const nullUrl = allLenders.filter(l => l.website_url === null);
    const emptyUrl = allLenders.filter(l => l.website_url === '');

    console.log('📈 Website URL Status:');
    console.log(`  With URL (not null, not empty): ${withUrl.length}`);
    console.log(`  Without URL (null or empty): ${withoutUrl.length}`);
    console.log(`  NULL: ${nullUrl.length}`);
    console.log(`  Empty string: ${emptyUrl.length}`);

    // Check special_features for website_info
    const withWebsiteInfo = allLenders.filter(l => {
      if (!l.special_features) return false;
      const sf = typeof l.special_features === 'string' 
        ? JSON.parse(l.special_features) 
        : l.special_features;
      return sf && sf.website_info;
    });

    const withBusinessLending = allLenders.filter(l => {
      if (!l.special_features) return false;
      const sf = typeof l.special_features === 'string' 
        ? JSON.parse(l.special_features) 
        : l.special_features;
      return sf && sf.business_lending;
    });

    console.log(`\n📈 Special Features Status:`);
    console.log(`  With website_info in special_features: ${withWebsiteInfo.length}`);
    console.log(`  With business_lending in special_features: ${withBusinessLending.length}`);

    // Show sample of lenders with URLs
    console.log(`\n📋 Sample of Lenders WITH Website URLs (first 20):`);
    withUrl.slice(0, 20).forEach((lender, i) => {
      console.log(`  ${i + 1}. ${lender.name}`);
      console.log(`     URL: ${lender.website_url}`);
    });

    if (withUrl.length > 20) {
      console.log(`  ... and ${withUrl.length - 20} more`);
    }

    // Show sample of lenders without URLs
    console.log(`\n📋 Sample of Lenders WITHOUT Website URLs (first 20):`);
    withoutUrl.slice(0, 20).forEach((lender, i) => {
      console.log(`  ${i + 1}. ${lender.name}`);
      console.log(`     URL: ${lender.website_url || 'NULL'}`);
    });

    if (withoutUrl.length > 20) {
      console.log(`  ... and ${withoutUrl.length - 20} more`);
    }

    // Check for PDF URLs
    const pdfUrls = withUrl.filter(l => {
      const url = l.website_url.toLowerCase();
      return url.includes('.pdf') || 
             url.includes('/downloads/') || 
             url.includes('/files/') || 
             url.includes('/uploads/');
    });

    if (pdfUrls.length > 0) {
      console.log(`\n⚠️  Found ${pdfUrls.length} lenders with PDF/document URLs:`);
      pdfUrls.forEach((lender, i) => {
        console.log(`  ${i + 1}. ${lender.name}`);
        console.log(`     URL: ${lender.website_url}`);
      });
    }

    // Check for lenders with website_info but no website_url
    const hasWebsiteInfoButNoUrl = allLenders.filter(l => {
      if (!l.website_url || l.website_url.trim() === '') {
        if (l.special_features) {
          const sf = typeof l.special_features === 'string' 
            ? JSON.parse(l.special_features) 
            : l.special_features;
          return sf && sf.website_info;
        }
      }
      return false;
    });

    if (hasWebsiteInfoButNoUrl.length > 0) {
      console.log(`\n📌 Found ${hasWebsiteInfoButNoUrl.length} lenders with website_info but no website_url:`);
      hasWebsiteInfoButNoUrl.slice(0, 10).forEach((lender, i) => {
        console.log(`  ${i + 1}. ${lender.name}`);
        const sf = typeof lender.special_features === 'string' 
          ? JSON.parse(lender.special_features) 
          : lender.special_features;
        if (sf && sf.website_info && sf.website_info.url) {
          console.log(`     Found URL in website_info: ${sf.website_info.url}`);
        }
      });
    }

    // Summary comparison
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY COMPARISON:');
    console.log(`  Total Lenders: ${allLenders.length}`);
    console.log(`  With website_url column populated: ${withUrl.length}`);
    console.log(`  With website_info in special_features: ${withWebsiteInfo.length}`);
    console.log(`  Potential total with URLs: ${withUrl.length + hasWebsiteInfoButNoUrl.length}`);

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

verifyDatabaseUrls()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


