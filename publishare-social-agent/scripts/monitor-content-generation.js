/**
 * Monitor Content Generation Progress
 * 
 * Checks how many articles have been generated for Early Years and Middle School
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function monitorProgress() {
  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  try {
    // Get articles for Early Years and Middle School
    const { data: articles, error } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, created_at')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    const earlyYears = articles?.filter(a => a.primary_ux_category_slug === 'early-years') || [];
    const middleSchool = articles?.filter(a => a.primary_ux_category_slug === 'middle-school') || [];

    console.log('📊 Content Generation Progress');
    console.log('='.repeat(60));
    console.log('');
    console.log(`👶 Early Years: ${earlyYears.length} articles`);
    console.log(`   Published: ${earlyYears.filter(a => a.status === 'published').length}`);
    console.log(`   Draft: ${earlyYears.filter(a => a.status === 'draft').length}`);
    console.log(`   With Images: ${earlyYears.filter(a => a.featured_image_url).length}`);
    console.log(`   With HTML: ${earlyYears.filter(a => a.html_body).length}`);
    console.log('');
    console.log(`🎓 Middle School: ${middleSchool.length} articles`);
    console.log(`   Published: ${middleSchool.filter(a => a.status === 'published').length}`);
    console.log(`   Draft: ${middleSchool.filter(a => a.status === 'draft').length}`);
    console.log(`   With Images: ${middleSchool.filter(a => a.featured_image_url).length}`);
    console.log(`   With HTML: ${middleSchool.filter(a => a.html_body).length}`);
    console.log('');
    console.log(`📈 Total: ${articles?.length || 0} articles`);
    console.log(`   Target: 20 articles (10 Early Years + 10 Middle School)`);
    console.log(`   Progress: ${((articles?.length || 0) / 20 * 100).toFixed(0)}%`);
    console.log('');

    if (articles && articles.length > 0) {
      console.log('Recent Articles:');
      articles.slice(0, 5).forEach((article, index) => {
        const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
        const statusEmoji = article.status === 'published' ? '✅' : '📝';
        console.log(`   ${index + 1}. ${emoji} ${statusEmoji} ${article.title.substring(0, 50)}...`);
        console.log(`      Created: ${new Date(article.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

monitorProgress()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });


