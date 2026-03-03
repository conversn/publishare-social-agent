/**
 * Generate Remaining Images and Publish ParentSimple Articles
 * 
 * Generates featured images for articles missing them, then publishes all ready articles
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function generateImagesAndPublish() {
  console.log('🚀 Generating Images and Publishing ParentSimple Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  try {
    // Step 1: Get all articles missing images
    console.log('📋 Step 1: Finding articles missing images...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, canonical_url')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .in('status', ['draft', 'published']);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    const missingImages = articles?.filter(a => !a.featured_image_url) || [];
    console.log(`   Found ${missingImages.length} articles missing images`);
    console.log('');

    // Step 2: Generate images
    if (missingImages.length > 0) {
      console.log('🖼️  Step 2: Generating featured images...');
      console.log('');

      let generated = 0;
      let failed = 0;

      for (const article of missingImages) {
        const emoji = article.primary_ux_category_slug === 'early-years' ? '👶' : '🎓';
        console.log(`   ${emoji} ${article.title.substring(0, 50)}...`);

        try {
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

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

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            if (imageData.image_url) {
              const { error: updateError } = await supabase
                .from('articles')
                .update({ 
                  featured_image_url: imageData.image_url,
                  featured_image_alt: imageData.alt_text || article.title
                })
                .eq('id', article.id);

              if (updateError) {
                console.log(`      ⚠️  Image generated but update failed: ${updateError.message}`);
                failed++;
              } else {
                console.log(`      ✅ Image generated and saved`);
                generated++;
              }
            } else {
              console.log(`      ⚠️  No image URL returned`);
              failed++;
            }
          } else {
            const errorText = await imageResponse.text().catch(() => '');
            let errorData = {};
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = { message: errorText || imageResponse.statusText };
            }
            console.log(`      ❌ Failed (${imageResponse.status}): ${errorData.message || imageResponse.statusText}`);
            failed++;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log(`      ❌ Timeout after 60 seconds`);
          } else {
            console.log(`      ❌ Error: ${error.message}`);
          }
          failed++;
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      console.log('');
      console.log(`   Generated: ${generated}, Failed: ${failed}`);
      console.log('');
    }

    // Step 3: Verify and publish ready articles
    console.log('🔍 Step 3: Verifying articles ready to publish...');
    const { data: verifyArticles } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, status, primary_ux_category_slug, featured_image_url, html_body, canonical_url')
      .eq('site_id', siteId)
      .in('primary_ux_category_slug', ['early-years', 'middle-school'])
      .in('status', ['draft', 'published']);

    const readyToPublish = verifyArticles?.filter(a => 
      a.featured_image_url && 
      a.html_body && 
      a.canonical_url &&
      a.status !== 'published'
    ) || [];

    console.log(`   Ready to publish: ${readyToPublish.length}`);
    console.log('');

    // Step 4: Publish
    if (readyToPublish.length > 0) {
      console.log('🚀 Step 4: Publishing articles...');
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
      console.log(`   Published: ${published}, Failed: ${failed}`);
      console.log('');
    }

    // Final summary
    console.log('='.repeat(60));
    console.log('✅ Process Complete!');
    console.log('');
    
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
generateImagesAndPublish()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

