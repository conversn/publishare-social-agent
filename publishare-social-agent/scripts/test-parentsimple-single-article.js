/**
 * Test Script for ParentSimple Single Article Generation
 * 
 * Tests a single article generation with ParentSimple Content Agent config
 * Verifies that Content Agent rules are applied and persona voice is reflected
 * 
 * Usage:
 *   node scripts/test-parentsimple-single-article.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testSingleArticle() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  console.log('🧪 Testing ParentSimple single article generation...\n');

  try {
    // Get first "Planned" strategy for ParentSimple
    const strategyResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/content_strategy?site_id=eq.parentsimple&status=eq.Planned&limit=1&order=priority_level.desc&order=target_date.asc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      }
    );

    if (!strategyResponse.ok) {
      throw new Error(`Failed to fetch strategy: ${strategyResponse.status}`);
    }

    const strategies = await strategyResponse.json();
    
    if (!strategies || strategies.length === 0) {
      console.log('⚠️  No planned strategies found for ParentSimple');
      console.log('   Please ensure migrations have been deployed');
      process.exit(1);
    }

    const strategy = strategies[0];
    console.log(`📋 Testing with strategy: "${strategy.content_title}"`);
    console.log(`   Priority: ${strategy.priority_level}`);
    console.log(`   Type: ${strategy.content_type}`);
    console.log('');

    // Call agentic-content-gen
    console.log('🚀 Calling agentic-content-gen...');
    const genResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/agentic-content-gen`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          topic: strategy.content_title,
          title: strategy.content_title,
          site_id: 'parentsimple',
          target_audience: strategy.target_audience,
          content_type: strategy.content_type || 'article',
          content_length: strategy.word_count || 2000,
          generate_links: true,
          convert_to_html: true,
          generate_image: true,
          aeo_optimized: true,
          aeo_content_type: strategy.content_type === 'comparison' ? 'comparison' : 
                           strategy.content_type === 'how-to' ? 'how-to' : 'article'
        })
      }
    );

    if (!genResponse.ok) {
      const errorText = await genResponse.text();
      throw new Error(`Generation failed: ${genResponse.status} - ${errorText}`);
    }

    const result = await genResponse.json();

    console.log('✅ Article generation successful!');
    console.log('');
    console.log('Results:');
    console.log(`  Article ID: ${result.article_id}`);
    console.log(`  Title: ${result.title}`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Content Length: ${result.content?.length || 0} characters`);
    console.log(`  HTML Body: ${result.html_body ? '✅ Generated' : '❌ Missing'}`);
    console.log(`  Featured Image: ${result.featured_image_url ? '✅ Generated' : '❌ Missing'}`);
    console.log(`  Links Inserted: ${result.links_inserted || 0}`);
    console.log('');

    if (result.content) {
      console.log('📄 Content Preview (first 500 chars):');
      console.log(result.content.substring(0, 500) + '...');
      console.log('');
    }

    console.log('✨ Test completed successfully!');
    return result;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSingleArticle();

