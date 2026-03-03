/**
 * Generate First RateRoots Article
 * 
 * Generates the first article from the RateRoots content strategy
 * using the batch-strategy-processor function.
 * 
 * Usage:
 *   node scripts/generate-first-rateroots-article.js
 * 
 * Requires: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function generateFirstArticle() {
  console.log('🚀 Generating First RateRoots Article');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('');
    console.error('Please set one of these environment variables:');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY (recommended)');
    console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('  - SUPABASE_ANON_KEY');
    console.error('');
    console.error('You can get your keys from:');
    console.error('  - Supabase Dashboard → Project Settings → API');
    console.error('  - Or run: supabase status');
    console.error('');
    process.exit(1);
  }

  // First, show what strategy will be processed
  console.log('📋 Checking first RateRoots strategy...');
  console.log('');

  try {
    const strategyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/content_strategy?site_id=eq.rateroots&status=eq.Planned&limit=1&order=priority_level.desc&order=target_date.asc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!strategyResponse.ok) {
      throw new Error(`Failed to fetch strategy: ${strategyResponse.status}`);
    }

    const strategies = await strategyResponse.json();
    
    if (!strategies || strategies.length === 0) {
      console.log('⚠️  No "Planned" strategies found for RateRoots');
      console.log('   All strategies may have been processed already.');
      process.exit(0);
    }

    const strategy = strategies[0];
    console.log('✅ Found strategy to process:');
    console.log(`   Title: ${strategy.content_title || strategy.primary_keyword}`);
    console.log(`   ID: ${strategy.id}`);
    console.log(`   Priority: ${strategy.priority_level || 'N/A'}`);
    console.log(`   Target Date: ${strategy.target_date || 'N/A'}`);
    console.log('');

    // Now call the batch processor
    console.log('🔄 Calling batch-strategy-processor...');
    console.log('');

    const batchResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/batch-strategy-processor`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          site_id: 'rateroots',
          limit: 1
        }),
      }
    );

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      throw new Error(`Batch processor failed: ${batchResponse.status} - ${errorText}`);
    }

    const result = await batchResponse.json();

    console.log('✅ Batch processing complete!');
    console.log('');
    console.log('Results:');
    console.log(`  Processed: ${result.processed || 0}`);
    console.log(`  Succeeded: ${result.succeeded || 0}`);
    console.log(`  Failed: ${result.failed || 0}`);
    console.log('');

    if (result.results && result.results.length > 0) {
      console.log('Article Generation Details:');
      result.results.forEach((r, index) => {
        console.log(`  ${index + 1}. ${r.strategy_title}`);
        if (r.status === 'success') {
          console.log(`     ✅ Status: Success`);
          console.log(`     📄 Article ID: ${r.article_id}`);
          console.log(`     🔗 View: ${SUPABASE_URL.replace('/rest/v1', '')}/articles/${r.article_id}`);
        } else {
          console.log(`     ❌ Status: Failed`);
          console.log(`     Error: ${r.error || 'Unknown error'}`);
        }
        console.log('');
      });
    }

    if (result.processed === 0) {
      console.log('ℹ️  No strategies were processed. They may have already been completed.');
    }

    return result;

  } catch (error) {
    console.error('❌ Error generating article:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
generateFirstArticle()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });




