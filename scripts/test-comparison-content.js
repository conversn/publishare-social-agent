/**
 * Test Comparison Content Generator
 * 
 * Tests the comparison content generator with Empowerly example
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function testComparisonContent() {
  console.log('🧪 Testing Comparison Content Generator');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    process.exit(1);
  }

  try {
    // Test via agentic-content-gen (should auto-detect and call comparison generator)
    console.log('📝 Testing via agentic-content-gen...');
    console.log('   Topic: Best College Consulting Services');
    console.log('   Preferred: Empowerly');
    console.log('   Alternatives: CollegeVine, IvyWise, College Confidential');
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        topic: 'Best College Consulting Services',
        content_type: 'comparison',
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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, errorText);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Comparison content generated successfully!');
    console.log('');
    console.log('📊 Results:');
    console.log(`   Article ID: ${result.article_id || result.id || 'N/A'}`);
    console.log(`   Title: ${result.title || 'N/A'}`);
    console.log(`   Content Length: ${result.content?.length || 0} characters`);
    console.log(`   HTML Body: ${result.html_body ? '✅ Generated' : '❌ Missing'}`);
    console.log(`   Featured Image: ${result.featured_image_url ? '✅ Generated' : '❌ Missing'}`);
    console.log('');

    if (result.content) {
      // Show first 500 chars
      const preview = result.content.substring(0, 500).replace(/\n/g, ' ');
      console.log('📄 Content Preview (first 500 chars):');
      console.log(`   ${preview}...`);
      console.log('');

      // Check for comparison elements
      const hasComparison = result.content.toLowerCase().includes('comparison') || 
                           result.content.toLowerCase().includes('empowerly') ||
                           result.content.toLowerCase().includes('collegevine');
      const hasConclusion = result.content.toLowerCase().includes('conclusion') ||
                           result.content.toLowerCase().includes('recommendation');
      
      console.log('🔍 Content Analysis:');
      console.log(`   Contains comparison: ${hasComparison ? '✅' : '❌'}`);
      console.log(`   Contains conclusion: ${hasConclusion ? '✅' : '❌'}`);
      console.log(`   Mentions Empowerly: ${result.content.includes('Empowerly') ? '✅' : '❌'}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Test Complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Review the generated article in the database');
    console.log('2. Verify Empowerly is positioned as best');
    console.log('3. Check that alternatives are fairly analyzed');
    console.log('4. Publish when ready');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
testComparisonContent()
  .then(() => {
    console.log('');
    console.log('✨ Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });


