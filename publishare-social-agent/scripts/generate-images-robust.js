/**
 * Generate Images - Robust Version
 * 
 * Generates featured images with better error handling and timeout management
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function generateImages() {
  console.log('🚀 Generating Images for ParentSimple Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  try {
    // Get articles missing images
    console.log('📋 Fetching articles missing images...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, primary_ux_category_slug, featured_image_url')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .is('featured_image_url', null);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    const missingImages = articles || [];
    console.log(`   Found ${missingImages.length} articles missing images`);
    console.log('');

    if (missingImages.length === 0) {
      console.log('✅ All articles already have images!');
      return;
    }

    // Process articles one at a time
    let generated = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < missingImages.length; i++) {
      const article = missingImages[i];
      const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
      const progress = `[${i + 1}/${missingImages.length}]`;
      
      console.log(`${progress} ${emoji} ${article.title.substring(0, 50)}...`);

      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 90000); // 90 second timeout

        console.log(`   📡 Calling ai-image-generator...`);

        const startTime = Date.now();
        const imageResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-image-generator`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            article_id: article.id,
            prompt: article.title,
            site_id: siteId
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (!imageResponse.ok) {
          const errorText = await imageResponse.text().catch(() => '');
          console.log(`   ❌ API Error (${imageResponse.status}): ${errorText.substring(0, 100)}`);
          failed++;
          continue;
        }

        const imageData = await imageResponse.json();
        
        // Handle response format: imageUrl or image_url
        const imageUrl = imageData.imageUrl || imageData.image_url;
        
        if (!imageData || !imageUrl) {
          console.log(`   ⚠️  No image URL in response (${elapsed}s)`);
          console.log(`   Response: ${JSON.stringify(imageData).substring(0, 200)}`);
          if (imageData.error) {
            console.log(`   Error: ${imageData.error}`);
          }
          failed++;
          continue;
        }

        console.log(`   ✅ Image generated (${elapsed}s): ${imageUrl.substring(0, 60)}...`);

        // Update article
        const { error: updateError } = await supabase
          .from('articles')
          .update({ 
            featured_image_url: imageUrl,
            featured_image_alt: imageData.alt_text || article.title
          })
          .eq('id', article.id);

        if (updateError) {
          console.log(`   ⚠️  Update failed: ${updateError.message}`);
          failed++;
        } else {
          console.log(`   ✅ Saved to database`);
          generated++;
        }

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log(`   ❌ Timeout after 90 seconds`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
        failed++;
      }

      // Wait between requests (except for last one)
      if (i < missingImages.length - 1) {
        console.log(`   ⏳ Waiting 2 seconds before next article...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Image Generation Complete!');
    console.log('');
    console.log(`   Generated: ${generated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('');

    // Check if we can publish now
    if (generated > 0) {
      console.log('🔍 Checking articles ready to publish...');
      const { data: readyArticles } = await supabase
        .from('articles_with_primary_ux_category')
        .select('id, title, status, featured_image_url, html_body, canonical_url')
        .eq('site_id', siteId)
        .in('primary_ux_category_slug', ['early-years', 'middle-school'])
        .eq('status', 'draft')
        .not('featured_image_url', 'is', null)
        .not('html_body', 'is', null)
        .not('canonical_url', 'is', null);

      const readyToPublish = readyArticles || [];
      console.log(`   Found ${readyToPublish.length} articles ready to publish`);

      if (readyToPublish.length > 0) {
        console.log('');
        console.log('🚀 Publishing articles...');
        
        let published = 0;
        for (const article of readyToPublish) {
          const { error } = await supabase
            .from('articles')
            .update({ status: 'published' })
            .eq('id', article.id);

          if (!error) {
            console.log(`   ✅ Published: ${article.title.substring(0, 50)}...`);
            published++;
          }
        }
        console.log(`   Published ${published} articles`);
      }
    }

  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    console.error('');
    console.error(error);
    process.exit(1);
  }
}

// Main execution
generateImages()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

