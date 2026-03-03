/**
 * Generate All Remaining RateRoots Articles
 * 
 * Processes all remaining "Planned" RateRoots articles in succession.
 * Continues until all articles are generated or an unrecoverable error occurs.
 * 
 * Usage:
 *   node scripts/generate-all-rateroots-articles.js
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

async function checkRemainingStrategies() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_strategy?site_id=eq.rateroots&status=eq.Planned&select=id&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to check strategies: ${response.status}`);
  }

  const strategies = await response.json();
  return strategies.length;
}

async function processBatch(limit = 10) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/batch-strategy-processor`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        site_id: 'rateroots',
        limit: limit
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Batch processor failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function generateAllArticles() {
  console.log('🚀 Generating All Remaining RateRoots Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let batchNumber = 1;
  const maxPerBatch = 10;
  const delayBetweenBatches = 5000; // 5 seconds between batches

  try {
    // Check initial count
    let remaining = await checkRemainingStrategies();
    console.log(`📊 Initial check: ${remaining} articles remaining to process`);
    console.log('');

    if (remaining === 0) {
      console.log('✅ All articles have already been processed!');
      return;
    }

    // Process in batches until all are done
    while (remaining > 0) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Batch ${batchNumber} - Processing up to ${Math.min(maxPerBatch, remaining)} articles...`);
      console.log(`${'='.repeat(60)}`);
      console.log('');

      try {
        const batchLimit = Math.min(maxPerBatch, remaining);
        const result = await processBatch(batchLimit);

        totalProcessed += result.processed || 0;
        totalSucceeded += result.succeeded || 0;
        totalFailed += result.failed || 0;

        console.log(`✅ Batch ${batchNumber} complete:`);
        console.log(`   Processed: ${result.processed || 0}`);
        console.log(`   Succeeded: ${result.succeeded || 0}`);
        console.log(`   Failed: ${result.failed || 0}`);

        if (result.results && result.results.length > 0) {
          const succeeded = result.results.filter(r => r.status === 'success');
          const failed = result.results.filter(r => r.status === 'failed');
          
          if (succeeded.length > 0) {
            console.log('');
            console.log('   ✅ Successful articles:');
            succeeded.forEach((r, i) => {
              console.log(`      ${i + 1}. ${r.strategy_title.substring(0, 60)}...`);
              console.log(`         Article ID: ${r.article_id}`);
            });
          }

          if (failed.length > 0) {
            console.log('');
            console.log('   ❌ Failed articles:');
            failed.forEach((r, i) => {
              console.log(`      ${i + 1}. ${r.strategy_title.substring(0, 60)}...`);
              console.log(`         Error: ${r.error || 'Unknown error'}`);
            });
          }
        }

        // Check remaining
        remaining = await checkRemainingStrategies();
        console.log('');
        console.log(`📊 Progress: ${totalSucceeded} succeeded, ${totalFailed} failed, ${remaining} remaining`);

        // If we processed fewer than requested, we might be done or hit an issue
        if (result.processed === 0 && remaining > 0) {
          console.log('');
          console.log('⚠️  Warning: No articles were processed but some remain.');
          console.log('   This might indicate all remaining strategies are not in "Planned" status.');
          console.log('   Checking status distribution...');
          
          // Check status distribution
          const statusCheck = await fetch(
            `${SUPABASE_URL}/rest/v1/content_strategy?site_id=eq.rateroots&select=status`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (statusCheck.ok) {
            const allStrategies = await statusCheck.json();
            const statusCounts = {};
            allStrategies.forEach(s => {
              statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
            });
            console.log('   Status distribution:', statusCounts);
          }
          
          break;
        }

        batchNumber++;

        // If there are more articles, wait before next batch
        if (remaining > 0) {
          console.log('');
          console.log(`⏳ Waiting ${delayBetweenBatches / 1000} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }

      } catch (error) {
        console.error('');
        console.error(`❌ Error in batch ${batchNumber}:`, error.message);
        console.error('');
        console.error('Continuing with next batch in 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        batchNumber++;
        continue;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ ALL ARTICLES PROCESSING COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Final Statistics:');
    console.log(`  Total Processed: ${totalProcessed}`);
    console.log(`  Total Succeeded: ${totalSucceeded}`);
    console.log(`  Total Failed: ${totalFailed}`);
    console.log(`  Success Rate: ${totalProcessed > 0 ? ((totalSucceeded / totalProcessed) * 100).toFixed(1) : 0}%`);
    console.log(`  Batches Run: ${batchNumber - 1}`);
    console.log('');

    // Final check
    const finalRemaining = await checkRemainingStrategies();
    if (finalRemaining === 0) {
      console.log('🎉 All 50 articles have been successfully processed!');
    } else {
      console.log(`⚠️  ${finalRemaining} articles still remain in "Planned" status.`);
      console.log('   You may need to review failed articles and retry.');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Fatal error:', error.message);
    console.error('');
    console.error('Progress before error:');
    console.error(`  Processed: ${totalProcessed}`);
    console.error(`  Succeeded: ${totalSucceeded}`);
    console.error(`  Failed: ${totalFailed}`);
    process.exit(1);
  }
}

// Main execution
generateAllArticles()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });




