/**
 * Publish Parent's Guide to Elite College Admissions
 * 
 * Creates and publishes an article about top 10 things to look for in college consulting
 * with a link to the elite college admission readiness quiz
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function publishEliteCollegeGuide() {
  console.log('📚 Publishing Parent\'s Guide to Elite College Admissions');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  try {
    const topic = "Parent's Guide to Elite College Admissions: Top 10 Things to Look For in a College Consulting Service";
    const title = "Parent's Guide to Elite College Admissions: Top 10 Things to Look For in a College Consulting Service";
    
    // Content instructions including quiz link
    const contentInstructions = `Write a comprehensive guide for parents about elite college admissions. The article should:

1. Break down the top 10 things to look for in a college consulting service
2. Include detailed explanations for each of the 10 factors
3. Provide actionable advice for parents
4. End with a call-to-action linking to a quiz to find out their student's elite college admission readiness

The quiz link should be: /quiz/elite-college-admission-readiness or similar quiz URL for ParentSimple.

Make it educational, helpful, and focused on helping parents make informed decisions about college consulting services.`;

    console.log('📝 Generating article...');
    console.log(`   Title: ${title}`);
    console.log(`   Site: ParentSimple`);
    console.log('');

    // Call agentic-content-gen with full workflow
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        topic: topic,
        title: title,
        site_id: 'parentsimple',
        content_type: 'guide',
        target_audience: 'Affluent parents (40-55, $150K+ income) with college-bound children seeking elite college admissions guidance',
        content_length: 3500,
        businessContext: contentInstructions,
        // Workflow options - full workflow
        generate_image: true,
        generate_links: true,
        convert_to_html: true,
        auto_publish: true, // Publish immediately
        // AEO options
        aeo_optimized: true,
        generate_schema: true,
        answer_first: true,
        aeo_content_type: 'how-to',
        // SEO
        focus_keyword: 'elite college admissions consulting',
        // Category
        category: 'College Planning'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Article generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.article_id && !result.id) {
      throw new Error('No article ID returned from workflow');
    }

    const articleId = result.article_id || result.id;

    console.log('✅ Article generated and published!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Article ID: ${articleId}`);
    console.log(`   Title: ${result.title || title}`);
    console.log(`   Featured Image: ${result.featured_image_url ? '✅' : '❌'}`);
    console.log(`   HTML Body: ${result.html_body ? '✅' : '❌'}`);
    console.log(`   Status: ${result.status || 'published'}`);
    console.log('');

    // Verify the article and check for quiz link
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, content, html_body, featured_image_url, status, canonical_url')
      .eq('id', articleId)
      .single();

    if (!fetchError && article) {
      console.log('🔍 Article Verification:');
      console.log(`   ID: ${article.id}`);
      console.log(`   Title: ${article.title}`);
      console.log(`   Status: ${article.status}`);
      console.log(`   Featured Image: ${article.featured_image_url ? '✅' : '❌'}`);
      console.log(`   HTML Body: ${article.html_body ? '✅ (' + article.html_body.length + ' chars)' : '❌'}`);
      console.log(`   Canonical URL: ${article.canonical_url || 'N/A'}`);
      
      // Check for quiz link in content
      const hasQuizLink = (article.content || '').toLowerCase().includes('quiz') || 
                         (article.html_body || '').toLowerCase().includes('quiz');
      console.log(`   Quiz Link: ${hasQuizLink ? '✅ Detected' : '⚠️  Not detected - may need manual addition'}`);
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ Article Published Successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the article in the database');
    console.log('2. Verify the quiz link is included');
    console.log('3. If quiz link is missing, add it manually');
    console.log('4. Test the article on the frontend');
    console.log('');

    return {
      success: true,
      article_id: articleId,
      title: result.title || title,
      ...result
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
  publishEliteCollegeGuide()
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

module.exports = { publishEliteCollegeGuide };


