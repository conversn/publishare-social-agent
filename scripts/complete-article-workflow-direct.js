/**
 * Complete Workflow for Existing Article
 * 
 * Generates featured image, internal links, and HTML conversion for an existing article
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function completeWorkflow(articleId) {
  console.log('🔄 Completing workflow for article');
  console.log(`   Article ID: ${articleId}`);
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Fetch article
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, content, excerpt, site_id, featured_image_url, html_body')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Failed to fetch article: ${fetchError?.message || 'Article not found'}`);
    }

    console.log(`📄 Article: ${article.title}`);
    console.log(`   Site: ${article.site_id}`);
    console.log(`   Current Image: ${article.featured_image_url ? '✅' : '❌'}`);
    console.log(`   Current HTML: ${article.html_body ? '✅' : '❌'}`);
    console.log('');

    // Step 1: Generate featured image
    if (!article.featured_image_url) {
      console.log('🎨 Step 1: Generating featured image...');
      const imageResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-image-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          article_id: articleId,
          prompt: article.title,
          site_id: article.site_id
        })
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.warn(`⚠️  Image generation failed: ${errorText}`);
      } else {
        const imageData = await imageResponse.json();
        if (imageData.image_url) {
          console.log(`✅ Featured image generated: ${imageData.image_url.substring(0, 60)}...`);
        } else {
          console.log(`⚠️  Image generation completed but no URL returned`);
        }
      }
      console.log('');
    } else {
      console.log('⏭️  Step 1: Featured image already exists, skipping...');
      console.log('');
    }

    // Step 2: Convert to HTML
    if (!article.html_body) {
      console.log('📄 Step 2: Converting markdown to HTML...');
      const htmlResponse = await fetch(`${SUPABASE_URL}/functions/v1/markdown-to-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          article_id: articleId,
          markdown: article.content
        })
      });

      if (!htmlResponse.ok) {
        const errorText = await htmlResponse.text();
        console.warn(`⚠️  HTML conversion failed: ${errorText}`);
      } else {
        const htmlData = await htmlResponse.json();
        if (htmlData.html_body) {
          // Update article with HTML
          const { error: updateError } = await supabase
            .from('articles')
            .update({ html_body: htmlData.html_body })
            .eq('id', articleId);

          if (updateError) {
            console.warn(`⚠️  Failed to save HTML: ${updateError.message}`);
          } else {
            console.log(`✅ HTML converted and saved (${htmlData.html_body.length} characters)`);
          }
        } else {
          console.log(`⚠️  HTML conversion completed but no html_body returned`);
        }
      }
      console.log('');
    } else {
      console.log('⏭️  Step 2: HTML body already exists, skipping...');
      console.log('');
    }

    // Step 3: Generate internal links
    console.log('🔗 Step 3: Generating internal links...');
    const linksResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-link-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        article_id: articleId,
        content: article.content,
        site_id: article.site_id
      })
    });

    if (!linksResponse.ok) {
      const errorText = await linksResponse.text();
      console.warn(`⚠️  Link generation failed: ${errorText}`);
    } else {
      const linksData = await linksResponse.json();
      if (linksData.links_added || linksData.suggestions) {
        const linksCount = linksData.links_added || linksData.suggestions?.length || 0;
        console.log(`✅ Internal links generated: ${linksCount} links`);
        
        // Update article content if links were inserted
        if (linksData.updated_content) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ content: linksData.updated_content })
            .eq('id', articleId);

          if (updateError) {
            console.warn(`⚠️  Failed to save updated content: ${updateError.message}`);
          }
        }
      } else {
        console.log(`⚠️  Link generation completed but no links returned`);
      }
    }
    console.log('');

    // Verify final state
    const { data: finalArticle } = await supabase
      .from('articles')
      .select('id, title, featured_image_url, html_body, status')
      .eq('id', articleId)
      .single();

    console.log('='.repeat(60));
    console.log('✅ Workflow completed!');
    console.log('');
    console.log('📊 Final Article State:');
    console.log(`   ID: ${finalArticle?.id}`);
    console.log(`   Title: ${finalArticle?.title}`);
    console.log(`   Featured Image: ${finalArticle?.featured_image_url ? '✅' : '❌'}`);
    console.log(`   HTML Body: ${finalArticle?.html_body ? '✅' : '❌'}`);
    console.log(`   Status: ${finalArticle?.status}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const articleId = process.argv[2] || '548f17aa-7b03-4ba0-907c-d90ce961a65d';
  
  completeWorkflow(articleId)
    .then(() => {
      console.log('✨ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { completeWorkflow };


