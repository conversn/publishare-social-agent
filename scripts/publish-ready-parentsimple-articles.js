/**
 * Publish Ready ParentSimple Articles
 * 
 * Publishes all articles that have:
 * - Featured image
 * - HTML body
 * - Canonical URL
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function publishReadyArticles() {
  console.log('🚀 Publishing Ready ParentSimple Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  try {
    // Get all articles for Early Years and Middle School
    const { data: articles, error: articlesError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, canonical_url')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .in('status', ['draft', 'published']);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    // Filter articles ready to publish
    const readyToPublish = articles?.filter(article => {
      return article.featured_image_url && 
             article.html_body && 
             article.canonical_url &&
             article.status !== 'published';
    }) || [];

    const alreadyPublished = articles?.filter(a => a.status === 'published') || [];
    const needsWork = articles?.filter(a => {
      return !readyToPublish.find(r => r.id === a.id) && 
             a.status !== 'published';
    }) || [];

    console.log(`📊 Status Summary:`);
    console.log(`   ✅ Ready to publish: ${readyToPublish.length}`);
    console.log(`   ✅ Already published: ${alreadyPublished.length}`);
    console.log(`   ⏳ Needs work: ${needsWork.length}`);
    console.log('');

    if (readyToPublish.length === 0) {
      console.log('ℹ️  No articles ready to publish yet.');
      console.log('   Articles need: featured_image_url, html_body, and canonical_url');
      console.log('');
      
      if (needsWork.length > 0) {
        console.log('Articles still needing work:');
        for (const article of needsWork.slice(0, 5)) {
          const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
          const missing = [];
          if (!article.featured_image_url) missing.push('image');
          if (!article.html_body) missing.push('HTML');
          if (!article.canonical_url) missing.push('canonical');
          console.log(`   ${emoji} ${article.title.substring(0, 50)}...`);
          console.log(`      Missing: ${missing.join(', ')}`);
        }
        if (needsWork.length > 5) {
          console.log(`   ... and ${needsWork.length - 5} more`);
        }
      }
      return;
    }

    // Publish ready articles
    console.log('🚀 Publishing articles...');
    console.log('');

    let published = 0;
    let failed = 0;

    for (const article of readyToPublish) {
      const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
      try {
        const { error: updateError } = await supabase
          .from('articles')
          .update({ status: 'published' })
          .eq('id', article.id);

        if (updateError) {
          console.log(`   ${emoji} ❌ Failed: ${article.title.substring(0, 50)}...`);
          console.log(`      Error: ${updateError.message}`);
          failed++;
        } else {
          console.log(`   ${emoji} ✅ Published: ${article.title.substring(0, 50)}...`);
          published++;
        }
      } catch (error) {
        console.log(`   ${emoji} ❌ Error: ${error.message}`);
        failed++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Publishing Complete!');
    console.log('');
    console.log(`   Published: ${published}`);
    console.log(`   Failed: ${failed}`);
    console.log('');

    // Final status
    const { data: finalArticles } = await supabase
      .from('articles_with_primary_ux_category')
      .select('status, primary_ux_category_slug')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school']);

    const earlyYears = finalArticles?.filter(a => a.primary_ux_category_slug === 'early-years') || [];
    const middleSchool = finalArticles?.filter(a => a.primary_ux_category_slug === 'middle-school') || [];

    console.log('📊 Final Status:');
    console.log(`   👶 Early Years: ${earlyYears.length} articles`);
    console.log(`      Published: ${earlyYears.filter(a => a.status === 'published').length}`);
    console.log(`      Draft: ${earlyYears.filter(a => a.status === 'draft').length}`);
    console.log('');
    console.log(`   🎓 Middle School: ${middleSchool.length} articles`);
    console.log(`      Published: ${middleSchool.filter(a => a.status === 'published').length}`);
    console.log(`      Draft: ${middleSchool.filter(a => a.status === 'draft').length}`);
    console.log('');

    console.log('🎉 Articles are now live on the site!');
    console.log('   Category pages:');
    console.log('   - /category/early-years');
    console.log('   - /category/middle-school');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
publishReadyArticles()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


