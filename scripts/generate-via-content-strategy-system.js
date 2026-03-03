/**
 * Generate Early Years and Middle School Content via Content Strategy System
 * 
 * This script uses the proper workflow:
 * 1. content-strategist → Creates content_strategy entries
 * 2. batch-strategy-processor → Processes strategies through agentic-content-gen
 * 
 * This ensures all articles go through the full workflow:
 * - UX categories (auto-assigned via mapping)
 * - Meta tags (OG, Twitter, SEO)
 * - AEO optimization
 * - SEO optimization
 * - Featured images
 * - Internal linking
 * - HTML conversion
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function generateViaContentStrategy() {
  console.log('🚀 Generating Content via Content Strategy System');
  console.log('='.repeat(60));
  console.log('');
  console.log('Workflow:');
  console.log('  1. content-strategist → Creates content_strategy entries');
  console.log('  2. batch-strategy-processor → Generates articles via agentic-content-gen');
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const siteId = 'parentsimple';
  const targetCategories = ['early-years', 'middle-school'];

  try {
    // Step 1: Call content-strategist to create strategy entries
    console.log('📋 Step 1: Calling content-strategist to create strategy entries...');
    console.log(`   Target categories: ${targetCategories.join(', ')}`);
    console.log('');

    const strategyResponse = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        site_id: siteId,
        create_strategy_entries: true,
        ux_categories: targetCategories
      })
    });

    if (!strategyResponse.ok) {
      const errorText = await strategyResponse.text();
      throw new Error(`Content strategist failed: ${strategyResponse.status} - ${errorText}`);
    }

    const strategyData = await strategyResponse.json();
    
    console.log('✅ Strategy entries created!');
    console.log(`   Created: ${strategyData.strategy_entries_created || 0} entries`);
    console.log(`   Message: ${strategyData.message || 'Strategy entries ready for processing'}`);
    console.log('');

    if (!strategyData.strategy_entries_created || strategyData.strategy_entries_created === 0) {
      console.log('⚠️  No strategy entries were created. This might mean:');
      console.log('   - Categories already have content');
      console.log('   - No gaps found for target categories');
      console.log('   - Check content-strategist response for details');
      console.log('');
      return;
    }

    // Step 2: Process strategies via batch-strategy-processor
    console.log('🚀 Step 2: Processing strategies via batch-strategy-processor...');
    console.log('   This will generate articles through agentic-content-gen with full workflow');
    console.log('');

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    const totalToProcess = strategyData.strategy_entries_created;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    while (processed < totalToProcess) {
      const remaining = totalToProcess - processed;
      const currentBatchSize = Math.min(batchSize, remaining);

      console.log(`📦 Processing batch: ${processed + 1}-${processed + currentBatchSize} of ${totalToProcess}...`);

      const batchResponse = await fetch(`${SUPABASE_URL}/functions/v1/batch-strategy-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          site_id: siteId,
          limit: currentBatchSize,
          priority_level: undefined // Process all priorities
        })
      });

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        console.log(`   ⚠️  Batch failed: ${errorText.substring(0, 200)}`);
        failed += currentBatchSize;
      } else {
        const batchData = await batchResponse.json();
        succeeded += batchData.succeeded || 0;
        failed += batchData.failed || 0;
        
        console.log(`   ✅ Batch complete: ${batchData.succeeded || 0} succeeded, ${batchData.failed || 0} failed`);
        
        if (batchData.results) {
          batchData.results.forEach((result) => {
            if (result.status === 'success') {
              console.log(`      ✅ ${result.strategy_title.substring(0, 50)}... → ${result.article_id}`);
            } else {
              console.log(`      ❌ ${result.strategy_title.substring(0, 50)}... → ${result.error}`);
            }
          });
        }
      }

      processed += currentBatchSize;
      console.log('');

      // Wait between batches to avoid rate limiting
      if (processed < totalToProcess) {
        console.log('   ⏳ Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('');
      }
    }

    // Step 3: Summary
    console.log('='.repeat(60));
    console.log('✅ Processing Complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Strategy Entries Created: ${strategyData.strategy_entries_created}`);
    console.log(`   Articles Generated: ${succeeded}`);
    console.log(`   Failed: ${failed}`);
    console.log('');

    // Step 4: Verify results
    console.log('🔍 Verifying generated articles...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: articles, error: articlesError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', targetCategories)
      .order('created_at', { ascending: false });

    if (!articlesError && articles) {
      const earlyYears = articles.filter(a => a.primary_ux_category_slug === 'early-years');
      const middleSchool = articles.filter(a => a.primary_ux_category_slug === 'middle-school');

      console.log(`   👶 Early Years: ${earlyYears.length} articles`);
      console.log(`      Published: ${earlyYears.filter(a => a.status === 'published').length}`);
      console.log(`      Draft: ${earlyYears.filter(a => a.status === 'draft').length}`);
      console.log(`      With Images: ${earlyYears.filter(a => a.featured_image_url).length}`);
      console.log(`      With HTML: ${earlyYears.filter(a => a.html_body).length}`);
      console.log('');
      console.log(`   🎓 Middle School: ${middleSchool.length} articles`);
      console.log(`      Published: ${middleSchool.filter(a => a.status === 'published').length}`);
      console.log(`      Draft: ${middleSchool.filter(a => a.status === 'draft').length}`);
      console.log(`      With Images: ${middleSchool.filter(a => a.featured_image_url).length}`);
      console.log(`      With HTML: ${middleSchool.filter(a => a.html_body).length}`);
      console.log('');
    }

    console.log('📌 Next Steps:');
    console.log('   1. Review generated articles in CMS');
    console.log('   2. Verify UX categories are assigned correctly');
    console.log('   3. Check that all articles have required elements:');
    console.log('      - Featured images');
    console.log('      - HTML body');
    console.log('      - Meta tags');
    console.log('      - AEO optimization');
    console.log('   4. Publish articles when ready');
    console.log('   5. Re-run content-strategist to verify all gaps are filled');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
generateViaContentStrategy()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

