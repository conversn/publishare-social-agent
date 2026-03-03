/**
 * Test Script: Single Article Generation with RateRoots Config
 * 
 * Tests that agentic-content-gen works correctly with RateRoots Content Agent config
 * and Marcus Chen persona profile.
 * 
 * Usage:
 *   node scripts/test-rateroots-single-article.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function testSingleArticleGeneration() {
  console.log('🧪 Testing single article generation with RateRoots config...');
  console.log('');

  // Get first "Planned" strategy for RateRoots
  console.log('📋 Fetching first RateRoots strategy from database...');
  
  try {
    // First, fetch a strategy
    const strategyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/content_strategy?site_id=eq.rateroots&status=eq.Planned&limit=1&order=priority_level.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!strategyResponse.ok) {
      throw new Error(`Failed to fetch strategy: ${strategyResponse.status}`);
    }

    const strategies = await strategyResponse.json();
    
    if (!strategies || strategies.length === 0) {
      console.log('⚠️  No "Planned" strategies found for RateRoots');
      console.log('   Creating a test strategy...');
      
      // Create a test strategy
      const testStrategy = {
        site_id: 'rateroots',
        content_title: 'Test: What is an SBA Loan?',
        primary_keyword: 'what is sba loan',
        content_type: 'article',
        target_audience: 'Business owners new to SBA loans',
        word_count: 2000,
        priority_level: 'High',
        status: 'Planned',
        content_pillar: 'Business Loans',
        category: 'SBA Loans',
      };

      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/content_strategy`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(testStrategy)
        }
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create test strategy: ${createResponse.status}`);
      }

      const createdStrategy = await createResponse.json();
      strategies.push(createdStrategy[0] || createdStrategy);
      console.log(`✅ Created test strategy: ${createdStrategy[0]?.id || createdStrategy.id}`);
    }

    const strategy = strategies[0];
    console.log(`✅ Found strategy: ${strategy.content_title || strategy.primary_keyword}`);
    console.log(`   Strategy ID: ${strategy.id}`);
    console.log('');

    // Map strategy to content generation parameters
    const contentParams = {
      topic: strategy.primary_keyword || strategy.content_title || 'SBA loans',
      title: strategy.content_title,
      site_id: 'rateroots',
      target_audience: strategy.target_audience || 'Business owners seeking financing',
      content_type: strategy.content_type || 'article',
      content_length: strategy.word_count || 2000,
      aeo_optimized: true,
      generate_schema: true,
      answer_first: true,
      generate_image: true,
      generate_links: true,
      convert_to_html: true,
      generate_social_posts: false, // Skip for test
      auto_publish: false,
    };

    // Detect AEO content type
    const title = (strategy.content_title || '').toLowerCase();
    if (title.includes('how to') || title.includes('how do')) {
      contentParams.aeo_content_type = 'how-to';
    } else if (title.includes('what is') || title.includes('definition')) {
      contentParams.aeo_content_type = 'definition';
    } else if (title.includes(' vs ') || title.includes('comparison')) {
      contentParams.aeo_content_type = 'comparison';
    } else {
      contentParams.aeo_content_type = 'article';
    }

    console.log('🚀 Calling agentic-content-gen with RateRoots config...');
    console.log('Parameters:', JSON.stringify(contentParams, null, 2));
    console.log('');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/agentic-content-gen`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify(contentParams),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`agentic-content-gen failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    console.log('✅ Article generation complete!');
    console.log('');
    console.log('Results:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Article ID: ${result.article_id || 'N/A'}`);
    console.log(`  Title: ${result.title || 'N/A'}`);
    console.log(`  Content Length: ${result.content?.length || 0} characters`);
    console.log(`  HTML Body: ${result.html_body ? 'Generated' : 'Not generated'}`);
    console.log(`  Featured Image: ${result.featured_image_url ? 'Generated' : 'Not generated'}`);
    console.log(`  AEO Summary: ${result.aeo_summary ? 'Generated' : 'Not generated'}`);
    console.log(`  Schema Markup: ${result.schema_markup ? 'Generated' : 'Not generated'}`);
    console.log('');

    if (result.error) {
      console.log(`⚠️  Warning: ${result.error}`);
    }

    if (result.article_id) {
      console.log(`📄 View article: ${SUPABASE_URL.replace('/rest/v1', '')}/articles/${result.article_id}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Error testing article generation:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
if (!SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable is not set');
  console.error('   Please set it in your .env file or export it before running this script');
  console.error('   Example: export SUPABASE_SERVICE_ROLE_KEY=your-key-here');
  process.exit(1);
}

testSingleArticleGeneration()
  .then(() => {
    console.log('✨ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

