/**
 * Regenerate Comparison Article with Full Workflow
 * 
 * 1. Generate comparison content
 * 2. Fact-check using Perplexity
 * 3. Complete workflow (images, links, HTML)
 * 4. Update article
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function regenerateComparisonArticle(params) {
  console.log('🔄 Regenerating Comparison Article with Full Workflow');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  const {
    topic = 'Best College Consulting Services',
    preferred_service = 'Empowerly',
    preferred_service_description,
    alternatives = ['CollegeVine', 'IvyWise', 'College Confidential', 'PrepScholar'],
    site_id = 'parentsimple',
    content_length = 3500,
    target_audience = 'Affluent parents (40-55, $150K+ income) with college-bound children',
    fact_check = true,
    generate_image = true,
    generate_links = true,
    convert_to_html = true
  } = params;

  try {
    // ========================================
    // STEP 1: Generate Comparison Content
    // ========================================
    console.log('📝 Step 1: Generating comparison content...');
    console.log(`   Topic: ${topic}`);
    console.log(`   Preferred: ${preferred_service}`);
    console.log(`   Alternatives: ${alternatives.join(', ')}`);
    console.log('');

    const comparisonResponse = await fetch(`${SUPABASE_URL}/functions/v1/comparison-content-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        topic,
        preferred_service,
        preferred_service_description,
        alternatives,
        site_id,
        target_audience,
        content_length
      })
    });

    if (!comparisonResponse.ok) {
      const errorText = await comparisonResponse.text();
      throw new Error(`Comparison generator failed: ${comparisonResponse.status} - ${errorText}`);
    }

    const comparisonData = await comparisonResponse.json();
    
    if (!comparisonData.content) {
      throw new Error('No content returned from comparison generator');
    }

    console.log('✅ Comparison content generated');
    console.log(`   Title: ${comparisonData.title}`);
    console.log(`   Content Length: ${comparisonData.content.length} characters`);
    console.log('');

    // ========================================
    // STEP 2: Fact-Check Content
    // ========================================
    let factCheckedContent = comparisonData.content;
    let citations = [];

    if (fact_check) {
      console.log('🔍 Step 2: Fact-checking content with Perplexity...');
      console.log('   This may take a few minutes...');
      console.log('');

      const factCheckResponse = await fetch(`${SUPABASE_URL}/functions/v1/fact-checker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({
          content: comparisonData.content,
          title: comparisonData.title,
          site_id
        })
      });

      if (!factCheckResponse.ok) {
        const errorText = await factCheckResponse.text();
        console.warn(`⚠️  Fact-checking failed: ${errorText}`);
        console.warn('   Continuing without fact-checking...');
        console.log('');
      } else {
        const factCheckData = await factCheckResponse.json();
        
        if (factCheckData.fact_checked && factCheckData.verified_content) {
          factCheckedContent = factCheckData.verified_content;
          citations = factCheckData.citations || [];
          
          const verifiedCount = citations.filter(c => c.verified).length;
          console.log(`✅ Fact-checking complete`);
          console.log(`   Verified: ${verifiedCount}/${citations.length} claims`);
          console.log(`   Citations added: ${citations.length}`);
          console.log('');
        }
      }
    }

    // ========================================
    // STEP 3: Delete existing article if it exists (to regenerate)
    // ========================================
    console.log('🗑️  Step 3a: Checking for existing article...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const slug = comparisonData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Find existing article with same slug
    const { data: existingArticles } = await supabase
      .from('articles')
      .select('id, title')
      .eq('slug', slug)
      .eq('site_id', site_id);
    
    if (existingArticles && existingArticles.length > 0) {
      console.log(`   Found ${existingArticles.length} existing article(s), deleting...`);
      for (const article of existingArticles) {
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', article.id);
        
        if (deleteError) {
          console.warn(`   ⚠️  Failed to delete article ${article.id}: ${deleteError.message}`);
        } else {
          console.log(`   ✅ Deleted article: ${article.title}`);
        }
      }
    } else {
      console.log('   No existing article found');
    }
    console.log('');

    // ========================================
    // STEP 3b: Create Article via agentic-content-gen
    // ========================================
    console.log('🚀 Step 3b: Creating article and completing workflow...');
    console.log('   - Featured image generation');
    console.log('   - Internal links');
    console.log('   - HTML conversion');
    console.log('');

    const workflowResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        topic: comparisonData.title,
        title: comparisonData.title,
        content: factCheckedContent, // Use fact-checked content
        excerpt: comparisonData.excerpt,
        site_id,
        content_type: 'comparison',
        target_audience,
        // Workflow options
        generate_image: true,
        generate_links: true,
        convert_to_html: true,
        auto_publish: false,
        // AEO options
        aeo_optimized: true,
        generate_schema: true,
        answer_first: true,
        aeo_content_type: 'comparison',
        // Citations from fact-checking
        citations: citations
      })
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      throw new Error(`Workflow failed: ${workflowResponse.status} - ${errorText}`);
    }

    const workflowData = await workflowResponse.json();
    
    if (!workflowData.article_id && !workflowData.id) {
      throw new Error('No article ID returned from workflow');
    }

    const articleId = workflowData.article_id || workflowData.id;

    // ========================================
    // STEP 4: Update Article with Citations
    // ========================================
    if (citations.length > 0) {
      console.log('📚 Step 4: Updating article with citations...');
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          citations: citations
        })
        .eq('id', articleId);

      if (updateError) {
        console.warn(`⚠️  Failed to update citations: ${updateError.message}`);
      } else {
        console.log(`✅ Citations updated (${citations.length} citations)`);
      }
      console.log('');
    }

    // ========================================
    // STEP 5: Verify Final State
    // ========================================
    console.log('🔍 Step 5: Verifying final article state...');
    const { data: finalArticle, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, featured_image_url, html_body, status, citations, content')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      console.warn(`⚠️  Failed to fetch final article: ${fetchError.message}`);
    } else {
      console.log('✅ Final article state:');
      console.log(`   ID: ${finalArticle.id}`);
      console.log(`   Title: ${finalArticle.title}`);
      console.log(`   Featured Image: ${finalArticle.featured_image_url ? '✅' : '❌'}`);
      console.log(`   HTML Body: ${finalArticle.html_body ? '✅' : '❌'}`);
      console.log(`   Citations: ${finalArticle.citations?.length || 0} citations`);
      console.log(`   Status: ${finalArticle.status}`);
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ Article Regenerated Successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Article ID: ${articleId}`);
    console.log(`   Title: ${comparisonData.title}`);
    console.log(`   Content: ${factCheckedContent.length} characters`);
    console.log(`   Citations: ${citations.length} fact-checked`);
    console.log(`   Featured Image: ${finalArticle?.featured_image_url ? '✅' : '⏳'}`);
    console.log(`   HTML Body: ${finalArticle?.html_body ? '✅' : '⏳'}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the article in the database');
    console.log('2. Verify Empowerly is positioned as best');
    console.log('3. Check citations and fact-checking');
    console.log('4. Verify competitors are real companies');
    console.log('5. Publish when ready');
    console.log('');

    return {
      success: true,
      article_id: articleId,
      title: comparisonData.title,
      citations: citations,
      ...finalArticle
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  const params = {
    topic: 'Best College Consulting Services',
    preferred_service: 'Empowerly',
    preferred_service_description: 'Empowerly is a leading college consulting service that combines personalized guidance with data-driven insights. They excel in helping students navigate the complex college admissions process, with a focus on finding the right fit rather than just prestigious names.',
    alternatives: [
      'CollegeVine',
      'IvyWise',
      'College Confidential',
      'PrepScholar',
      'College Essay Guy'
    ],
    site_id: 'parentsimple',
    content_length: 3500,
    target_audience: 'Affluent parents (40-55, $150K+ income) with college-bound children seeking expert guidance',
    fact_check: true,
    generate_image: true,
    generate_links: true,
    convert_to_html: true
  };

  regenerateComparisonArticle(params)
    .then((result) => {
      console.log('✨ Script completed successfully');
      console.log(`Article ID: ${result.article_id}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { regenerateComparisonArticle };

