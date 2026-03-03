/**
 * Generate Priority Content Based on Content Strategist Recommendations
 * 
 * Creates the top 3 articles for Priority 1 (Financial Planning) and Priority 2 (High School)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function generatePriorityContent() {
  console.log('🚀 Generating Priority Content');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const siteId = 'parentsimple';

  // Priority articles to generate
  const priorityArticles = [
    // Priority 1: Financial Planning (Critical)
    {
      title: '529 Plan Basics: Everything Parents Need to Know',
      category: '529 Plans',
      uxCategory: 'financial-planning',
      priority: 1,
      content_type: 'article',
      word_count: 2500
    },
    {
      title: 'How to Calculate Your College Savings Goal',
      category: '529 Plans',
      uxCategory: 'financial-planning',
      priority: 1,
      content_type: 'how-to',
      word_count: 2000
    },
    {
      title: 'Life Insurance for Parents: Protecting Your Family\'s Future',
      category: 'Life Insurance',
      uxCategory: 'financial-planning',
      priority: 1,
      content_type: 'article',
      word_count: 2500
    },
    // Priority 2: High School (High)
    {
      title: 'GPA Optimization Strategies for College Admissions',
      category: 'College Consulting',
      uxCategory: 'high-school',
      priority: 2,
      content_type: 'article',
      word_count: 2500
    },
    {
      title: 'SAT vs. ACT: Which Test Should Your Student Take?',
      category: 'College Consulting',
      uxCategory: 'high-school',
      priority: 2,
      content_type: 'comparison',
      word_count: 2000
    },
    {
      title: 'Building a Strong Extracurricular Profile',
      category: 'College Consulting',
      uxCategory: 'high-school',
      priority: 2,
      content_type: 'article',
      word_count: 2000
    }
  ];

  console.log(`📝 Generating ${priorityArticles.length} priority articles...`);
  console.log('');

  const results = {
    success: [],
    failed: []
  };

  for (const article of priorityArticles) {
    try {
      console.log(`📄 Generating: ${article.title}`);
      console.log(`   Category: ${article.category} → ${article.uxCategory}`);
      console.log(`   Priority: ${article.priority === 1 ? '🔴 Critical' : '🟠 High'}`);
      
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
          generate_schema: true,
          answer_first: true,
          // Workflow options
          generate_image: true,
          generate_links: true,
          convert_to_html: true,
          auto_publish: false // Review before publishing
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.article_id) {
        console.log(`   ✅ Created: ${data.article_id}`);
        console.log(`   Status: ${data.status || 'draft'}`);
        results.success.push({
          title: article.title,
          article_id: data.article_id,
          priority: article.priority
        });
      } else {
        throw new Error('No article_id returned');
      }
      
      console.log('');
      
      // Wait 2 seconds between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.failed.push({
        title: article.title,
        error: error.message
      });
      console.log('');
    }
  }

  console.log('✅ Generation complete!');
  console.log('');
  console.log('Results:');
  console.log(`   Success: ${results.success.length}`);
  console.log(`   Failed: ${results.failed.length}`);
  console.log('');

  if (results.success.length > 0) {
    console.log('Successfully Generated Articles:');
    results.success.forEach((item, index) => {
      const priorityEmoji = item.priority === 1 ? '🔴' : '🟠';
      console.log(`   ${index + 1}. ${priorityEmoji} ${item.title}`);
      console.log(`      Article ID: ${item.article_id}`);
    });
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('Failed Articles:');
    results.failed.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title}: ${item.error}`);
    });
    console.log('');
  }

  // Note: Articles are created as drafts - need to assign UX categories and publish
  console.log('📌 Next Steps:');
  console.log('   1. Review generated articles in CMS');
  console.log('   2. Verify UX categories are assigned correctly');
  console.log('   3. Publish articles when ready');
  console.log('   4. Re-run content-strategist to verify progress');
}

// Main execution
generatePriorityContent()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


