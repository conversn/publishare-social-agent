/**
 * Check Retirement Listicle Status
 * Checks if the retirement listicle article exists in Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRetirementListicle() {
  console.log('🔍 Checking for retirement listicle articles...\n');

  try {
    // Search for articles with similar titles
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, slug, status, site_id, content_type, created_at, updated_at')
      .eq('site_id', 'seniorsimple')
      .or('title.ilike.%12 Best Ways to Live Happy, Healthy, and Wealthy in Retirement%,title.ilike.%retirement%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching articles:', error.message);
      return;
    }

    console.log(`📄 Found ${articles?.length || 0} articles:\n`);

    if (articles && articles.length > 0) {
      articles.forEach((article, index) => {
        console.log(`${index + 1}. ${article.title}`);
        console.log(`   ID: ${article.id}`);
        console.log(`   Slug: ${article.slug}`);
        console.log(`   Status: ${article.status}`);
        console.log(`   Site ID: ${article.site_id}`);
        console.log(`   Content Type: ${article.content_type || 'N/A'}`);
        console.log(`   Created: ${new Date(article.created_at).toLocaleString()}`);
        console.log(`   Updated: ${new Date(article.updated_at).toLocaleString()}`);
        console.log('');
      });

      // Check for listicle specifically
      const listicle = articles.find(a => 
        a.title.includes('12 Best Ways') && 
        a.title.includes('Retirement')
      );

      if (listicle) {
        console.log('✅ Found retirement listicle!');
        console.log(`   View in Supabase: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/editor`);
        console.log('');
      }
    } else {
      console.log('❌ No retirement listicle articles found');
      console.log('');
    }

    // Also check for any draft articles
    const { data: drafts } = await supabase
      .from('articles')
      .select('id, title, slug, status, site_id')
      .eq('site_id', 'seniorsimple')
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(5);

    if (drafts && drafts.length > 0) {
      console.log(`📝 Recent drafts (${drafts.length}):`);
      drafts.forEach((draft, index) => {
        console.log(`   ${index + 1}. ${draft.title} (${draft.slug})`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRetirementListicle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
