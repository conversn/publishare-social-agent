/**
 * Generate Comparison Article - Direct Call Approach
 * 
 * This script uses the direct call approach to work around function-to-function auth issues:
 * 1. Calls comparison-content-generator directly to generate content
 * 2. Calls agentic-content-gen with the generated content for full workflow
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function generateComparisonArticle(params) {
  console.log('🎯 Generating Comparison Article - Direct Call Approach');
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
    generate_image = true,
    generate_links = true,
    convert_to_html = true,
    auto_publish = false
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

    console.log('✅ Comparison content generated successfully!');
    console.log(`   Title: ${comparisonData.title}`);
    console.log(`   Content Length: ${comparisonData.content.length} characters`);
    console.log(`   Excerpt: ${comparisonData.excerpt?.substring(0, 100)}...`);
    console.log('');

    // ========================================
    // STEP 2: Complete Workflow via agentic-content-gen
    // ========================================
    console.log('🚀 Step 2: Completing workflow (images, links, HTML, publishing)...');
    console.log('');

    const workflowResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        topic: comparisonData.title || topic,
        title: comparisonData.title,
        content: comparisonData.content, // Pass generated content directly
        excerpt: comparisonData.excerpt,
        site_id,
        content_type: 'comparison',
        target_audience,
        // Workflow options - explicitly set to true
        generate_image: true,
        generate_links: true,
        convert_to_html: true,
        auto_publish: auto_publish || false,
        // AEO options
        aeo_optimized: true,
        generate_schema: true,
        answer_first: true,
        aeo_content_type: 'comparison',
        // Ensure workflow runs even with pre-generated content
        workflowType: 'full'
      })
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      throw new Error(`Workflow failed: ${workflowResponse.status} - ${errorText}`);
    }

    const workflowData = await workflowResponse.json();
    
    console.log('✅ Workflow completed successfully!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Article ID: ${workflowData.article_id || workflowData.id || 'N/A'}`);
    console.log(`   Title: ${workflowData.title || comparisonData.title}`);
    console.log(`   Featured Image: ${workflowData.featured_image_url ? '✅ Generated' : '❌ Missing'}`);
    console.log(`   HTML Body: ${workflowData.html_body ? '✅ Generated' : '❌ Missing'}`);
    console.log(`   Status: ${workflowData.status || 'draft'}`);
    console.log('');

    if (workflowData.article_id || workflowData.id) {
      console.log('='.repeat(60));
      console.log('✅ Comparison Article Generated Successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Review the article in the database');
      console.log('2. Verify Empowerly is positioned as best');
      console.log('3. Check that alternatives are fairly analyzed');
      if (!auto_publish) {
        console.log('4. Publish when ready');
      }
      console.log('');
      
      return {
        success: true,
        article_id: workflowData.article_id || workflowData.id,
        title: workflowData.title || comparisonData.title,
        ...workflowData
      };
    } else {
      throw new Error('No article ID returned from workflow');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  // Default parameters for Empowerly example
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
    generate_image: true,
    generate_links: true,
    convert_to_html: true,
    auto_publish: false
  };

  generateComparisonArticle(params)
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

module.exports = { generateComparisonArticle };

