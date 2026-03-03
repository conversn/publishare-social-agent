/**
 * Test Creatomate Video Generation
 * 
 * Tests the creatomate-video-generator edge function with a sample article
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testCreatomateVideo() {
  console.log('🧪 Testing Creatomate Video Generation\n');
  console.log('='.repeat(60));
  
  // Get a recent article to test with
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('id, title, content, speakable_summary, featured_image_url, site_id')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (articlesError || !articles || articles.length === 0) {
    console.error('❌ No articles found to test with');
    console.error('   Error:', articlesError?.message);
    return;
  }
  
  const article = articles[0];
  console.log(`\n📄 Using article: ${article.title}`);
  console.log(`   ID: ${article.id}`);
  console.log(`   Site: ${article.site_id || 'N/A'}`);
  console.log(`   Has speakable_summary: ${!!article.speakable_summary}`);
  console.log(`   Has featured_image: ${!!article.featured_image_url}`);
  
  // Test YouTube Short generation
  console.log('\n🎬 Testing YouTube Short generation...');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(
      'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/creatomate-video-generator',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          article_id: article.id,
          video_type: 'youtube-short',
          use_voice: false // Start without voice
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request failed: ${response.status}`);
      console.error(`   Error: ${errorText}`);
      return;
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Video generated successfully!');
      console.log(`   Video URL: ${result.video_url}`);
      console.log(`   Render ID: ${result.render_id}`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Type: ${result.video_type}`);
    } else {
      console.error('❌ Video generation failed');
      console.error(`   Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete');
}

testCreatomateVideo().catch(console.error);


