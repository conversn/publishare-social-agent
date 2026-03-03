/**
 * Fix ParentSimple Articles - Enhance Existing Articles
 * 
 * This script fixes existing ParentSimple articles by:
 * 1. Updating canonical URLs to use correct domain from sites table
 * 2. Generating missing featured images
 * 3. Adding internal links
 * 4. Converting markdown to HTML if missing
 * 
 * Usage:
 *   node scripts/fix-parentsimple-articles.js [--limit N] [--article-id ID]
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function fixArticle(supabase, article) {
  const fixes = [];
  const updates = {};

  console.log(`\n📝 Fixing article: "${article.title}" (${article.id})`);

  // 1. Fix canonical URL
  if (!article.canonical_url || article.canonical_url.includes('example.com')) {
    const { data: site } = await supabase
      .from('sites')
      .select('domain')
      .eq('id', article.site_id)
      .single();

    if (site?.domain) {
      const domain = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
      const articleRoutePath = site.article_route_path || '/articles';
      updates.canonical_url = `${domain}${articleRoutePath}/${article.slug}`;
      fixes.push('canonical_url');
    }
  }

  // 2. Generate featured image if missing
  if (!article.featured_image_url) {
    console.log('  🎨 Generating featured image...');
    try {
      const imageResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-image-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            title: article.title,
            content: article.excerpt || article.title,
            style: 'professional',
            aspect_ratio: '16:9',
            imageType: 'featured',
            article_id: article.id,
            auto_approve: true
          })
        }
      );

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageUrl = imageData.imageUrl || imageData.image_url;
        if (imageUrl) {
          updates.featured_image_url = imageUrl;
          updates.featured_image_alt = `${article.title} - Featured image`;
          updates.og_image = imageUrl;
          updates.twitter_image = imageUrl;
          fixes.push('featured_image');
        }
      }
    } catch (error) {
      console.error(`  ❌ Image generation failed: ${error.message}`);
    }
  }

  // 3. Add internal links if missing
  if (article.content && !article.content.includes('](')) {
    console.log('  🔗 Generating internal links...');
    try {
      const linkResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-link-suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            content: article.content.substring(0, 2000),
            article_id: article.id,
            site_id: article.site_id,
            max_suggestions: 5
          })
        }
      );

      if (linkResponse.ok) {
        const linkData = await linkResponse.json();
        const suggestions = linkData.suggestions || [];
        
        if (suggestions.length > 0) {
          const insertResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/insert-links`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                markdown: article.content,
                suggestions: suggestions,
                article_id: article.id
              })
            }
          );

          if (insertResponse.ok) {
            const linksData = await insertResponse.json();
            if (linksData.markdown) {
              updates.content = linksData.markdown;
              fixes.push('internal_links');
            }
          }
        }
      }
    } catch (error) {
      console.error(`  ❌ Link generation failed: ${error.message}`);
    }
  }

  // 4. Convert to HTML if missing
  if (!article.html_body && article.content) {
    console.log('  📄 Converting markdown to HTML...');
    try {
      const htmlResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/markdown-to-html`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            markdown: updates.content || article.content,
            article_id: article.id,
            conversionType: 'enhanced',
            styling: 'modern',
            includeCss: false
          })
        }
      );

      if (htmlResponse.ok) {
        const htmlData = await htmlResponse.json();
        const htmlBody = htmlData.html || htmlData.html_body;
        if (htmlBody) {
          updates.html_body = htmlBody;
          fixes.push('html_body');
        }
      }
    } catch (error) {
      console.error(`  ❌ HTML conversion failed: ${error.message}`);
    }
  }

  // Apply updates
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('articles')
      .update(updates)
      .eq('id', article.id);

    if (error) {
      console.error(`  ❌ Failed to update article: ${error.message}`);
      return { success: false, fixes: [] };
    }

    console.log(`  ✅ Fixed: ${fixes.join(', ')}`);
    return { success: true, fixes };
  } else {
    console.log('  ℹ️  No fixes needed');
    return { success: true, fixes: [] };
  }
}

async function main() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const args = process.argv.slice(2);
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;
  const articleId = args.includes('--article-id') ? args[args.indexOf('--article-id') + 1] : null;

  console.log('🔧 Fixing ParentSimple Articles...\n');

  let query = supabase
    .from('articles')
    .select('*')
    .eq('site_id', 'parentsimple')
    .order('created_at', { ascending: false });

  if (articleId) {
    query = query.eq('id', articleId);
  } else if (limit) {
    query = query.limit(limit);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch articles:', error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log('ℹ️  No articles found');
    process.exit(0);
  }

  console.log(`📋 Found ${articles.length} articles to process\n`);

  let fixed = 0;
  let failed = 0;
  const allFixes = {};

  for (const article of articles) {
    const result = await fixArticle(supabase, article);
    if (result.success) {
      fixed++;
      result.fixes.forEach(fix => {
        allFixes[fix] = (allFixes[fix] || 0) + 1;
      });
    } else {
      failed++;
    }
    
    // Small delay between articles
    if (articles.indexOf(article) < articles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n✅ Fix Complete!');
  console.log(`  Processed: ${articles.length}`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Failed: ${failed}`);
  console.log('\nFixes Applied:');
  Object.entries(allFixes).forEach(([fix, count]) => {
    console.log(`  ${fix}: ${count}`);
  });
}

main().catch(console.error);


