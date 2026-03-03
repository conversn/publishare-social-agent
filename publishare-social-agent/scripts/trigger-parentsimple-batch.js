/**
 * Manual Trigger Script for ParentSimple Batch Content Generation
 * 
 * Usage:
 *   node scripts/trigger-parentsimple-batch.js [options]
 * 
 * Options:
 *   --limit <number>     Number of articles to process (default: 5, max: 10)
 *   --priority <level>   Filter by priority: High, Medium, Low
 *   --content-type <type> Filter by content type: pillar-page, article, comparison, how-to
 *   --dry-run            Preview what would be processed without actually processing
 *   --site <site_id>     Site ID to process (default: parentsimple)
 * 
 * Examples:
 *   node scripts/trigger-parentsimple-batch.js --limit 5
 *   node scripts/trigger-parentsimple-batch.js --limit 10 --priority High
 *   node scripts/trigger-parentsimple-batch.js --limit 5 --content-type pillar-page
 *   node scripts/trigger-parentsimple-batch.js --dry-run
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                                   process.env.SUPABASE_ANON_KEY ||
                                   '';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    limit: 5,
    priority: null,
    contentType: null,
    dryRun: false,
    site: 'parentsimple',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--priority' && args[i + 1]) {
      options.priority = args[i + 1];
      i++;
    } else if (arg === '--content-type' && args[i + 1]) {
      options.contentType = args[i + 1];
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--site' && args[i + 1]) {
      options.site = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Manual Trigger Script for ParentSimple Batch Content Generation

Usage:
  node scripts/trigger-parentsimple-batch.js [options]

Options:
  --limit <number>        Number of articles to process (default: 5, max: 10)
  --priority <level>      Filter by priority: High, Medium, Low
  --content-type <type>   Filter by content type: pillar-page, article, comparison, how-to
  --dry-run               Preview what would be processed without actually processing
  --site <site_id>        Site ID to process (default: parentsimple)
  --help, -h              Show this help message

Examples:
  node scripts/trigger-parentsimple-batch.js --limit 5
  node scripts/trigger-parentsimple-batch.js --limit 10 --priority High
  node scripts/trigger-parentsimple-batch.js --limit 5 --content-type pillar-page
  node scripts/trigger-parentsimple-batch.js --dry-run
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

  if (options.contentType) {
    body.content_type = options.contentType;
  }

  console.log('🚀 Triggering batch strategy processor for ParentSimple...');
  console.log('Options:', JSON.stringify(body, null, 2));
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
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

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
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

