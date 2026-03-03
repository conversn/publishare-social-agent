/**
 * Enhance RateRoots Articles Metadata
 * 
 * Runs article-metadata-enhancer on all RateRoots articles
 * to generate missing metadata fields.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function enhanceArticles() {
  console.log('🚀 Enhancing RateRoots Articles Metadata');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  try {
    console.log('📋 Calling article-metadata-enhancer for RateRoots...');
    console.log('');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/article-metadata-enhancer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          site_id: 'rateroots',
          limit: 100
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Metadata enhancer failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Metadata enhancement complete!');
    console.log('');
    console.log('Results:');
    console.log(`  Processed: ${result.processed || 0}`);
    console.log(`  Total Fields Updated: ${result.total_updated_fields || 0}`);
    console.log(`  Total Errors: ${result.total_errors || 0}`);
    console.log('');

    if (result.results && result.results.length > 0) {
      const successful = result.results.filter(r => r.success);
      const failed = result.results.filter(r => !r.success);

      if (successful.length > 0) {
        console.log(`✅ ${successful.length} articles enhanced successfully:`);
        successful.slice(0, 10).forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.title.substring(0, 60)}...`);
          console.log(`      Updated ${r.updated} fields`);
        });
        if (successful.length > 10) {
          console.log(`   ... and ${successful.length - 10} more`);
        }
        console.log('');
      }

      if (failed.length > 0) {
        console.log(`❌ ${failed.length} articles had errors:`);
        failed.slice(0, 5).forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.title.substring(0, 60)}...`);
          console.log(`      Errors: ${r.errors?.join(', ') || 'Unknown'}`);
        });
        console.log('');
      }
    }

    return result;

  } catch (error) {
    console.error('❌ Error enhancing articles:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
enhanceArticles()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });




