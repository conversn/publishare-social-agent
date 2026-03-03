/**
 * Complete Workflow for Comparison Article
 * 
 * Generates featured image and converts to HTML for an existing comparison article
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
  console.log('🔄 Completing workflow for comparison article');
  console.log(`   Article ID: ${articleId}`);
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  try {
    // Step 1: Generate featured image
    console.log('🎨 Step 1: Generating featured image...');
    const imageResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-image-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        article_id: articleId
      })
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.warn(`⚠️  Image generation failed: ${errorText}`);
    } else {
      const imageData = await imageResponse.json();
      console.log(`✅ Featured image generated: ${imageData.image_url || 'URL not returned'}`);
    }
    console.log('');

    // Step 2: Convert to HTML
    console.log('📄 Step 2: Converting markdown to HTML...');
    
    // First, get the article content
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('content, title')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      throw new Error(`Failed to fetch article: ${fetchError?.message || 'Article not found'}`);
    }

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
      console.log(`✅ HTML converted (${htmlData.html_body?.length || 0} characters)`);
    }
    console.log('');

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
        article_id: articleId
      })
    });

    if (!linksResponse.ok) {
      const errorText = await linksResponse.text();
      console.warn(`⚠️  Link generation failed: ${errorText}`);
    } else {
      const linksData = await linksResponse.json();
      console.log(`✅ Internal links generated: ${linksData.links_added || 0} links`);
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
    console.log(`   Title: ${finalArticle?.title}`);
    console.log(`   Featured Image: ${finalArticle?.featured_image_url ? '✅' : '❌'}`);
    console.log(`   HTML Body: ${finalArticle?.html_body ? '✅' : '❌'}`);
    console.log(`   Status: ${finalArticle?.status}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const articleId = process.argv[2] || 'ec993d29-3976-4aff-a534-56217f505069';
  
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


