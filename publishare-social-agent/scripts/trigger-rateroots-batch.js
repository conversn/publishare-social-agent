/**
 * Manual Trigger Script for RateRoots Batch Content Generation
 * 
 * Usage:
 *   node scripts/trigger-rateroots-batch.js [options]
 * 
 * Options:
 *   --limit <number>     Number of articles to process (default: 3, max: 10)
 *   --priority <level>   Filter by priority: Critical, High, Medium, Low
 *   --dry-run            Preview what would be processed without actually processing
 *   --site <site_id>     Site ID to process (default: rateroots)
 * 
 * Examples:
 *   node scripts/trigger-rateroots-batch.js --limit 3
 *   node scripts/trigger-rateroots-batch.js --limit 5 --priority High
 *   node scripts/trigger-rateroots-batch.js --dry-run
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.SUPABASE_ANON_KEY ||
                          process.env.SUPABASE_SERVICE_ROLE_KEY ||
                          '';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 3,
    priority: null,
    dryRun: false,
    site: 'rateroots',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--priority' && args[i + 1]) {
      options.priority = args[i + 1];
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--site' && args[i + 1]) {
      options.site = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Manual Trigger Script for RateRoots Batch Content Generation

Usage:
  node scripts/trigger-rateroots-batch.js [options]

Options:
  --limit <number>     Number of articles to process (default: 3, max: 10)
  --priority <level>   Filter by priority: Critical, High, Medium, Low
  --dry-run            Preview what would be processed without actually processing
  --site <site_id>     Site ID to process (default: rateroots)
  --help, -h           Show this help message

Examples:
  node scripts/trigger-rateroots-batch.js --limit 3
  node scripts/trigger-rateroots-batch.js --limit 5 --priority High
  node scripts/trigger-rateroots-batch.js --dry-run
      `);
      process.exit(0);
    }
  }

  return options;
}

async function triggerBatchProcessing(options) {
  const url = `${SUPABASE_URL}/functions/v1/batch-strategy-processor`;
  
  const body = {
    site_id: options.site,
    limit: Math.min(options.limit, 10),
    dry_run: options.dryRun,
  };

  if (options.priority) {
    body.priority_level = options.priority;
  }

  console.log('🚀 Triggering batch strategy processor...');
  console.log('Options:', JSON.stringify(body, null, 2));
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Batch processing complete!');
    console.log('');
    console.log('Results:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Succeeded: ${result.succeeded}`);
    console.log(`  Failed: ${result.failed}`);
    console.log('');

    if (result.results && result.results.length > 0) {
      console.log('Detailed Results:');
      result.results.forEach((r, index) => {
        console.log(`  ${index + 1}. ${r.strategy_title}`);
        console.log(`     Status: ${r.status === 'success' ? '✅ Success' : '❌ Failed'}`);
        if (r.article_id) {
          console.log(`     Article ID: ${r.article_id}`);
        }
        if (r.error) {
          console.log(`     Error: ${r.error}`);
        }
        console.log('');
      });
    }

    if (result.message) {
      console.log(`ℹ️  ${result.message}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Error triggering batch processing:', error.message);
    process.exit(1);
  }
}

// Main execution
const options = parseArgs();

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set');
  console.error('   Please set it in your .env file or export it before running this script');
  process.exit(1);
}

triggerBatchProcessing(options)
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

