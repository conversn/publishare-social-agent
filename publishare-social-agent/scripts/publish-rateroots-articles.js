/**
 * Publish All RateRoots Articles
 * 
 * Updates status of all RateRoots articles to "published"
 * and sets published_at timestamp.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function publishArticles() {
  console.log('🚀 Publishing All RateRoots Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  try {
    // First, check how many articles will be updated
    console.log('📋 Checking RateRoots articles...');
    
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?site_id=eq.rateroots&select=id,title,status&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!checkResponse.ok) {
      throw new Error(`Failed to fetch articles: ${checkResponse.status}`);
    }

    const articles = await checkResponse.json();
    const draftArticles = articles.filter(a => a.status !== 'published');
    
    console.log(`   Total RateRoots articles: ${articles.length}`);
    console.log(`   Articles to publish: ${draftArticles.length}`);
    console.log(`   Already published: ${articles.length - draftArticles.length}`);
    console.log('');

    if (draftArticles.length === 0) {
      console.log('✅ All articles are already published!');
      return;
    }

    // Update all articles to published
    console.log('📢 Publishing articles...');
    
    const now = new Date().toISOString();
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/articles`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          status: 'published',
          published_at: now,
          updated_at: now
        })
      }
    );

    // Use RPC or direct update with filter
    // Supabase REST doesn't support WHERE in PATCH, so we'll update each article
    let publishedCount = 0;
    let errorCount = 0;

    for (const article of draftArticles) {
      try {
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/articles?id=eq.${article.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              status: 'published',
              published_at: now,
              updated_at: now
            })
          }
        );

        if (updateResponse.ok) {
          publishedCount++;
        } else {
          errorCount++;
          console.log(`   ⚠️  Failed to publish: ${article.title.substring(0, 50)}...`);
        }
      } catch (error) {
        errorCount++;
        console.log(`   ⚠️  Error publishing ${article.id}: ${error.message}`);
      }
    }

    console.log('');
    console.log('✅ Publishing complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Published: ${publishedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${draftArticles.length}`);
    console.log('');

    // Verify final status
    console.log('🔍 Verifying final status...');
    const verifyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?site_id=eq.rateroots&select=id,title,status,published_at&limit=100`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (verifyResponse.ok) {
      const finalArticles = await verifyResponse.json();
      const published = finalArticles.filter(a => a.status === 'published');
      console.log(`   Total articles: ${finalArticles.length}`);
      console.log(`   Published: ${published.length}`);
      console.log(`   Other statuses: ${finalArticles.length - published.length}`);
    }

  } catch (error) {
    console.error('❌ Error publishing articles:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
publishArticles()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });




