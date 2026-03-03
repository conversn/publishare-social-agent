/**
 * Generate Missing Images Only
 * 
 * Generates featured images for articles that are missing them
 * Does NOT regenerate anything else (no links, no HTML, no canonical URLs)
 * 
 * Usage:
 *   node scripts/generate-missing-images.js [--site SITE_ID] [--limit N]
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function generateImageForArticle(article) {
  console.log(`  🎨 Generating image for: "${article.title}"`);
  
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
        return imageUrl;
      } else {
        console.error(`    ❌ No image URL returned`);
        return null;
      }
    } else {
      const errorText = await imageResponse.text();
      console.error(`    ❌ Image generation failed: ${imageResponse.status} - ${errorText.substring(0, 100)}`);
      return null;
    }
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    return null;
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
  const siteId = args.includes('--site') ? args[args.indexOf('--site') + 1] : 'parentsimple';
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

  console.log(`🎨 Generating missing images for ${siteId}...\n`);

  let query = supabase
    .from('articles')
    .select('id, title, excerpt')
    .eq('site_id', siteId)
    .is('featured_image_url', null)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch articles:', error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log('✅ No articles missing images');
    process.exit(0);
  }

  console.log(`📋 Found ${articles.length} articles missing images\n`);

  let succeeded = 0;
  let failed = 0;

  for (const article of articles) {
    const imageUrl = await generateImageForArticle(article);
    
    if (imageUrl) {
      // Update article with image URL and metadata
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          featured_image_url: imageUrl,
          featured_image_alt: `${article.title} - Featured image`,
          og_image: imageUrl,
          twitter_image: imageUrl
        })
        .eq('id', article.id);

      if (updateError) {
        console.error(`    ❌ Failed to update article: ${updateError.message}`);
        failed++;
      } else {
        console.log(`    ✅ Image generated and saved: ${imageUrl.substring(0, 60)}...`);
        succeeded++;
      }
    } else {
      failed++;
    }

    // Small delay between requests
    if (articles.indexOf(article) < articles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);


