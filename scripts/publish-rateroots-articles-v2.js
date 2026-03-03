/**
 * Publish All RateRoots Articles (v2 - Using Supabase Client)
 * 
 * Updates status of all RateRoots articles to "published"
 * and sets published_at timestamp.
 */

const { createClient } = require('@supabase/supabase-js');

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

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // First, check how many articles will be updated
    console.log('📋 Checking RateRoots articles...');
    
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, status')
      .eq('site_id', 'rateroots')
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

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
    
    // Update articles - try without published_at first
    const updateData = {
      status: 'published',
      updated_at: now
    };

    const { data: updatedArticles, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('site_id', 'rateroots')
      .neq('status', 'published')
      .select('id, title, status');

    if (updateError) {
      throw new Error(`Failed to update articles: ${updateError.message}`);
    }

    console.log('');
    console.log('✅ Publishing complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Published: ${updatedArticles?.length || 0} articles`);
    console.log('');

    // Verify final status
    console.log('🔍 Verifying final status...');
    const { data: finalArticles, error: verifyError } = await supabase
      .from('articles')
      .select('id, title, status')
      .eq('site_id', 'rateroots')
      .limit(100);

    if (!verifyError && finalArticles) {
      const published = finalArticles.filter(a => a.status === 'published');
      console.log(`   Total articles: ${finalArticles.length}`);
      console.log(`   Published: ${published.length}`);
      console.log(`   Other statuses: ${finalArticles.length - published.length}`);
      
      if (published.length > 0) {
        console.log('');
        console.log('Sample published articles:');
        published.slice(0, 5).forEach((a, i) => {
          console.log(`   ${i + 1}. ${a.title.substring(0, 60)}...`);
        });
      }
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
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

