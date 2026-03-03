/**
 * Generate Early Years and Middle School Content
 * 
 * Uses content-strategist to get article recommendations, then generates
 * 10 articles for Early Years and 10 for Middle School with full workflow:
 * - UX categories
 * - Meta tags
 * - AEO optimization
 * - SEO optimization
 * - Featured images
 * - Internal linking
 * - HTML conversion
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

// Additional article topics to supplement content-strategist recommendations
const additionalTopics = {
  'early-years': [
    'Preschool Readiness: What Your Child Needs to Know Before Starting School',
    'Early Literacy Development: Building Reading Skills from Birth to Age 5',
    'Social-Emotional Learning in Early Childhood: A Parent\'s Guide',
    'STEM Activities for Toddlers and Preschoolers',
    'Managing Screen Time for Young Children: Evidence-Based Guidelines',
    'Nutrition for Early Childhood Development: Building Healthy Habits',
    'Sleep Training and Bedtime Routines for Young Children',
    'Potty Training Success: A Comprehensive Guide for Parents',
    'Building Resilience in Young Children: Strategies for Parents',
    'Early Math Skills: How to Introduce Numbers and Counting'
  ],
  'middle-school': [
    'Time Management Skills for Middle Schoolers: A Parent\'s Guide',
    'Social Media Safety for Middle School Students',
    'Building Self-Confidence in Middle School: A Parent\'s Guide',
    'Study Habits That Work: Evidence-Based Strategies for Middle School Success',
    'Navigating Friend Groups and Social Dynamics in Middle School',
    'Pre-Algebra Preparation: Setting Your Child Up for Math Success',
    'Reading Comprehension Strategies for Middle School Students',
    'Extracurricular Activities: Finding the Right Balance',
    'Preparing for High School: What 8th Graders Need to Know',
    'Building Executive Function Skills in Middle School'
  ]
};

async function generateContent() {
  console.log('🚀 Generating Early Years and Middle School Content');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const siteId = 'parentsimple';

  try {
    // Step 1: Get recommendations from content-strategist
    console.log('📋 Step 1: Getting recommendations from content-strategist...');
    const strategyResponse = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ site_id: siteId })
    });

    if (!strategyResponse.ok) {
      throw new Error(`Content strategist failed: ${strategyResponse.status}`);
    }

    const strategy = await strategyResponse.json();
    console.log('   ✅ Got recommendations');
    console.log('');

    // Step 2: Extract article topics for Early Years and Middle School
    const earlyYearsGap = strategy.gaps.find(g => g.ux_category_slug === 'early-years');
    const middleSchoolGap = strategy.gaps.find(g => g.ux_category_slug === 'middle-school');

    // Combine recommended articles with additional topics
    const earlyYearsTopics = [
      ...(earlyYearsGap?.recommended_articles || []),
      ...additionalTopics['early-years']
    ].slice(0, 10);

    const middleSchoolTopics = [
      ...(middleSchoolGap?.recommended_articles || []),
      ...additionalTopics['middle-school']
    ].slice(0, 10);

    console.log(`📝 Step 2: Prepared ${earlyYearsTopics.length} Early Years topics and ${middleSchoolTopics.length} Middle School topics`);
    console.log('');

    // Step 3: Generate articles with full workflow
    const allArticles = [
      ...earlyYearsTopics.map(topic => ({
        title: topic,
        category: 'Early Years',
        uxCategory: 'early-years',
        content_type: 'article',
        word_count: 2000
      })),
      ...middleSchoolTopics.map(topic => ({
        title: topic,
        category: 'Middle School',
        uxCategory: 'middle-school',
        content_type: 'article',
        word_count: 2500
      }))
    ];

    console.log(`🚀 Step 3: Generating ${allArticles.length} articles with full workflow...`);
    console.log('   (This includes: UX categories, meta tags, AEO, SEO, images, links, HTML)');
    console.log('');

    const results = {
      success: [],
      failed: []
    };

    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];
      
      try {
        const categoryEmoji = article.uxCategory === 'early-years' ? '👶' : '🎓';
        console.log(`📄 [${i + 1}/${allArticles.length}] ${categoryEmoji} ${article.title}`);
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            topic: article.title,
            title: article.title,
            site_id: siteId,
            category: article.category,
            content_type: article.content_type,
            content_length: article.word_count,
            target_audience: 'Affluent parents (40-55, $150K+ income) with college-bound children seeking expert guidance',
            // AEO optimization
            aeo_optimized: true,
            aeo_content_type: article.content_type === 'how-to' ? 'how-to' : 'article',
            generate_schema: true,
            answer_first: true,
            // SEO optimization
            seo_optimized: true,
            // Full workflow
            generate_image: true,
            generate_links: true,
            convert_to_html: true,
            auto_publish: false // Review before publishing
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        
        if (data.article_id) {
          console.log(`   ✅ Created: ${data.article_id}`);
          console.log(`   Status: ${data.status || 'draft'}`);
          
          // Verify UX category was assigned
          if (data.ux_category_assigned) {
            console.log(`   ✅ UX Category: ${article.uxCategory}`);
          }
          
          // Verify image was generated
          if (data.featured_image_url) {
            console.log(`   ✅ Featured Image: Generated`);
          }
          
          // Verify HTML was created
          if (data.html_body) {
            console.log(`   ✅ HTML Body: Created`);
          }
          
          results.success.push({
            title: article.title,
            article_id: data.article_id,
            category: article.uxCategory,
            status: data.status || 'draft'
          });
        } else {
          throw new Error('No article_id returned');
        }
        
        console.log('');
        
        // Wait 3 seconds between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        results.failed.push({
          title: article.title,
          category: article.uxCategory,
          error: error.message
        });
        console.log('');
        
        // Wait before retrying next article
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Step 4: Summary
    console.log('='.repeat(60));
    console.log('✅ Generation Complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Success: ${results.success.length}`);
    console.log(`   Failed: ${results.failed.length}`);
    console.log('');

    // Group by category
    const earlyYearsSuccess = results.success.filter(r => r.category === 'early-years');
    const middleSchoolSuccess = results.success.filter(r => r.category === 'middle-school');

    console.log('Successfully Generated Articles:');
    console.log(`   👶 Early Years: ${earlyYearsSuccess.length}/10`);
    earlyYearsSuccess.forEach((item, index) => {
      console.log(`      ${index + 1}. ${item.title}`);
      console.log(`         ID: ${item.article_id}`);
    });
    console.log('');
    console.log(`   🎓 Middle School: ${middleSchoolSuccess.length}/10`);
    middleSchoolSuccess.forEach((item, index) => {
      console.log(`      ${index + 1}. ${item.title}`);
      console.log(`         ID: ${item.article_id}`);
    });
    console.log('');

    if (results.failed.length > 0) {
      console.log('Failed Articles:');
      results.failed.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title} (${item.category}): ${item.error}`);
      });
      console.log('');
    }

    // Step 5: Next steps
    console.log('📌 Next Steps:');
    console.log('   1. Review generated articles in CMS');
    console.log('   2. Verify UX categories are assigned correctly');
    console.log('   3. Check that all articles have:');
    console.log('      - Featured images');
    console.log('      - HTML body');
    console.log('      - Meta tags (OG, Twitter)');
    console.log('      - AEO optimization');
    console.log('      - Internal links');
    console.log('   4. Publish articles when ready');
    console.log('   5. Re-run content-strategist to verify all gaps are filled');

    // Save results to file
    const fs = require('fs');
    const reportPath = `docs/CONTENT_GENERATION_REPORT_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
      generated_at: new Date().toISOString(),
      site_id: siteId,
      results: results,
      summary: {
        total: allArticles.length,
        success: results.success.length,
        failed: results.failed.length,
        early_years: earlyYearsSuccess.length,
        middle_school: middleSchoolSuccess.length
      }
    }, null, 2));
    console.log(`   💾 Full report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
generateContent()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


