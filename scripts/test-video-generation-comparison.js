/**
 * Test Video Generation Comparison: Creatomate vs HeyGen
 * 
 * Generates the same article as video using both providers for comparison
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testVideoGenerationComparison() {
  console.log('🧪 Video Generation Provider Comparison Test\n');
  console.log('='.repeat(60));
  
  // Get a recent article to test with
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, content, speakable_summary, featured_image_url, site_id')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (articlesError || !articles || articles.length === 0) {
    console.error('❌ No articles found to test with');
    return;
  }
  
  const article = articles[0];
  console.log(`\n📄 Test Article: ${article.title}`);
  console.log(`   ID: ${article.id}`);
  console.log(`   Site: ${article.site_id || 'N/A'}`);
  
  const results = {
    creatomate: null,
    heygen: null
  };
  
  // Test 1: Creatomate (YouTube Short)
  console.log('\n🎬 Test 1: Creatomate (YouTube Short)');
  console.log('-'.repeat(60));
  
  try {
    const startTime = Date.now();
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/creatomate-video-generator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          article_id: article.id,
          video_type: 'youtube-short',
          use_voice: false
        })
      }
    );
    
    const duration = Date.now() - startTime;
    const result = await response.json();
    
    if (result.success) {
      results.creatomate = {
        success: true,
        video_url: result.video_url,
        render_id: result.render_id,
        duration_ms: duration,
        cost_estimate: '$0.10-0.30',
        provider: 'creatomate'
      };
      console.log('✅ Creatomate: Success');
      console.log(`   Video URL: ${result.video_url}`);
      console.log(`   Processing Time: ${(duration / 1000).toFixed(1)}s`);
      console.log(`   Estimated Cost: $0.10-0.30`);
    } else {
      results.creatomate = {
        success: false,
        error: result.error,
        duration_ms: duration
      };
      console.log('❌ Creatomate: Failed');
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    results.creatomate = {
      success: false,
      error: error.message
    };
    console.log('❌ Creatomate: Error');
    console.log(`   ${error.message}`);
  }
  
  // Test 2: HeyGen + ElevenLabs (YouTube Short)
  console.log('\n🎬 Test 2: HeyGen + ElevenLabs (YouTube Short)');
  console.log('-'.repeat(60));
  console.log('⏳ HeyGen integration to be implemented...');
  console.log('   (This will be tested after HeyGen function is created)');
  
  // For now, just note that HeyGen test is pending
  results.heygen = {
    success: false,
    error: 'HeyGen integration not yet implemented',
    note: 'Will be tested in Phase 0.2'
  };
  
  // Comparison Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Comparison Summary');
  console.log('='.repeat(60));
  
  console.log('\n✅ Creatomate Results:');
  if (results.creatomate.success) {
    console.log(`   Status: ✅ Success`);
    console.log(`   Processing Time: ${(results.creatomate.duration_ms / 1000).toFixed(1)}s`);
    console.log(`   Estimated Cost: ${results.creatomate.cost_estimate}`);
    console.log(`   Video URL: ${results.creatomate.video_url}`);
  } else {
    console.log(`   Status: ❌ Failed`);
    console.log(`   Error: ${results.creatomate.error}`);
  }
  
  console.log('\n⏳ HeyGen Results:');
  console.log(`   Status: ⏳ Pending Implementation`);
  console.log(`   Note: ${results.heygen.note || results.heygen.error}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Comparison test complete');
  console.log('\n📝 Next Steps:');
  console.log('   1. Implement HeyGen video generator function');
  console.log('   2. Run comparison test with both providers');
  console.log('   3. Generate recommendation document');
}

testVideoGenerationComparison().catch(console.error);


