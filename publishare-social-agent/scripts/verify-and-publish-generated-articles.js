/**
 * Verify and Publish Generated Articles
 * 
 * Verifies that all generated Early Years and Middle School articles have:
 * - UX categories assigned
 * - Featured images
 * - HTML body
 * - Meta tags
 * - AEO optimization
 * 
 * Then publishes them if all checks pass.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function verifyAndPublish() {
  console.log('🔍 Verifying and Publishing Generated Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  try {
    // Get all draft articles for Early Years and Middle School
    const { data: articles, error } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, canonical_url, focus_keyword, og_title, og_description, schema_markup, aeo_summary')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .in('status', ['draft', 'published'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    console.log(`📋 Found ${articles.length} articles to verify`);
    console.log('');

    const verified = [];
    const needsWork = [];
    const published = [];

    for (const article of articles) {
      const checks = {
        hasUxCategory: !!article.primary_ux_category_slug,
        hasImage: !!article.featured_image_url,
        hasHtml: !!article.html_body,
        hasCanonical: !!article.canonical_url,
        hasFocusKeyword: !!article.focus_keyword,
        hasOgTags: !!(article.og_title && article.og_description),
        hasSchema: !!article.schema_markup,
        hasAeo: !!article.aeo_summary,
        isPublished: article.status === 'published'
      };

      const allChecksPass = Object.values(checks).slice(0, -1).every(v => v === true);

      if (allChecksPass) {
        if (checks.isPublished) {
          published.push({ article, checks });
        } else {
          verified.push({ article, checks });
        }
      } else {
        needsWork.push({ article, checks });
      }
    }

    // Display results
    console.log('📊 Verification Results:');
    console.log(`   ✅ Ready to Publish: ${verified.length}`);
    console.log(`   ✅ Already Published: ${published.length}`);
    console.log(`   ⚠️  Needs Work: ${needsWork.length}`);
    console.log('');

    if (needsWork.length > 0) {
      console.log('⚠️  Articles Needing Work:');
      needsWork.forEach((item, index) => {
        const emoji = item.article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
        console.log(`   ${index + 1}. ${emoji} ${item.article.title.substring(0, 50)}...`);
        console.log(`      Missing:`);
        if (!item.checks.hasUxCategory) console.log(`         - UX Category`);
        if (!item.checks.hasImage) console.log(`         - Featured Image`);
        if (!item.checks.hasHtml) console.log(`         - HTML Body`);
        if (!item.checks.hasCanonical) console.log(`         - Canonical URL`);
        if (!item.checks.hasFocusKeyword) console.log(`         - Focus Keyword`);
        if (!item.checks.hasOgTags) console.log(`         - OG Tags`);
        if (!item.checks.hasSchema) console.log(`         - Schema Markup`);
        if (!item.checks.hasAeo) console.log(`         - AEO Summary`);
        console.log('');
      });
    }

    if (verified.length > 0) {
      console.log('✅ Articles Ready to Publish:');
      verified.forEach((item, index) => {
        const emoji = item.article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
        console.log(`   ${index + 1}. ${emoji} ${item.article.title.substring(0, 50)}...`);
      });
      console.log('');

      // Ask to publish (in automated mode, we'll publish)
      console.log('🚀 Publishing verified articles...');
      
      for (const item of verified) {
        try {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ status: 'published' })
            .eq('id', item.article.id);

          if (updateError) {
            console.log(`   ⚠️  Failed to publish "${item.article.title}": ${updateError.message}`);
          } else {
            console.log(`   ✅ Published: ${item.article.title.substring(0, 50)}...`);
          }
        } catch (error) {
          console.log(`   ⚠️  Error publishing "${item.article.title}": ${error.message}`);
        }
      }
      console.log('');
    }

    if (published.length > 0) {
      console.log('✅ Already Published:');
      published.forEach((item, index) => {
        const emoji = item.article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
        console.log(`   ${index + 1}. ${emoji} ${item.article.title.substring(0, 50)}...`);
      });
      console.log('');
    }

    // Final summary
    const totalReady = verified.length + published.length;
    const total = articles.length;
    
    console.log('📈 Final Summary:');
    console.log(`   Total Articles: ${total}`);
    console.log(`   Ready/Published: ${totalReady} (${(totalReady / total * 100).toFixed(0)}%)`);
    console.log(`   Needs Work: ${needsWork.length}`);
    console.log('');

    // Category breakdown
    const earlyYears = articles.filter(a => a.primary_ux_category_slug === 'early-years');
    const middleSchool = articles.filter(a => a.primary_ux_category_slug === 'middle-school');
    
    console.log('📊 By Category:');
    console.log(`   👶 Early Years: ${earlyYears.length} articles`);
    console.log(`      Published: ${earlyYears.filter(a => a.status === 'published').length}`);
    console.log(`      Draft: ${earlyYears.filter(a => a.status === 'draft').length}`);
    console.log(`   🎓 Middle School: ${middleSchool.length} articles`);
    console.log(`      Published: ${middleSchool.filter(a => a.status === 'published').length}`);
    console.log(`      Draft: ${middleSchool.filter(a => a.status === 'draft').length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
verifyAndPublish()
  .then(() => {
    console.log('');
    console.log('✨ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


