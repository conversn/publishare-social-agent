/**
 * Test Content Strategist Edge Function
 * 
 * Calls the content-strategist function to analyze content gaps and get recommendations
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function testContentStrategist() {
  console.log('🚀 Testing Content Strategist Edge Function');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const siteId = process.argv[2] || 'parentsimple';

  try {
    console.log(`📋 Analyzing content strategy for site: ${siteId}`);
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ site_id: siteId })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Display results
    console.log('✅ Analysis Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total Articles: ${data.total_articles}`);
    console.log(`   Categories with Content: ${data.categories_with_content}`);
    console.log(`   Categories without Content: ${data.categories_without_content}`);
    console.log(`   Estimated Articles Needed: ${data.estimated_articles_needed}`);
    console.log(`   Estimated Time to Complete: ${data.estimated_time_to_complete}`);
    console.log('');

    // Display gaps
    if (data.gaps && data.gaps.length > 0) {
      console.log('⚠️  Content Gaps:');
      data.gaps.forEach((gap, index) => {
        const priorityEmoji = gap.priority === 1 ? '🔴' : gap.priority === 2 ? '🟠' : gap.priority === 3 ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${priorityEmoji} ${gap.ux_category_name} (${gap.ux_category_slug})`);
        console.log(`      Articles: ${gap.article_count}`);
        console.log(`      Priority: ${gap.priority}`);
        console.log(`      Recommended Articles: ${gap.recommended_articles.length}`);
        if (gap.re_categorization_opportunities && gap.re_categorization_opportunities.length > 0) {
          console.log(`      Re-categorization Opportunities: ${gap.re_categorization_opportunities.length}`);
        }
        console.log('');
      });
    }

    // Display immediate actions
    if (data.immediate_actions && data.immediate_actions.length > 0) {
      console.log('🎯 Immediate Actions:');
      data.immediate_actions.forEach((action, index) => {
        const priorityEmoji = action.priority === 'critical' ? '🔴' : action.priority === 'high' ? '🟠' : '🟡';
        console.log(`   ${index + 1}. ${priorityEmoji} ${action.action}`);
        console.log(`      Priority: ${action.priority}`);
        console.log(`      ${action.description}`);
        if (action.articles_to_create && action.articles_to_create.length > 0) {
          console.log(`      Articles to Create:`);
          action.articles_to_create.forEach(title => {
            console.log(`         - ${title}`);
          });
        }
        if (action.articles_to_re_categorize && action.articles_to_re_categorize.length > 0) {
          console.log(`      Articles to Re-categorize:`);
          action.articles_to_re_categorize.forEach(article => {
            console.log(`         - ${article.article_title} (${article.from_category} → ${article.to_category})`);
          });
        }
        console.log('');
      });
    }

    // Display content creation plan
    if (data.content_creation_plan) {
      console.log('📝 Content Creation Plan:');
      if (data.content_creation_plan.priority_1.length > 0) {
        console.log('   🔴 Priority 1 (Critical):');
        data.content_creation_plan.priority_1.forEach(gap => {
          console.log(`      - ${gap.ux_category_name}: ${gap.recommended_articles.length} articles recommended`);
        });
      }
      if (data.content_creation_plan.priority_2.length > 0) {
        console.log('   🟠 Priority 2 (High):');
        data.content_creation_plan.priority_2.forEach(gap => {
          console.log(`      - ${gap.ux_category_name}: ${gap.recommended_articles.length} articles recommended`);
        });
      }
      if (data.content_creation_plan.priority_3.length > 0) {
        console.log('   🟡 Priority 3 (Medium):');
        data.content_creation_plan.priority_3.forEach(gap => {
          console.log(`      - ${gap.ux_category_name}: ${gap.recommended_articles.length} articles recommended`);
        });
      }
      if (data.content_creation_plan.priority_4.length > 0) {
        console.log('   🟢 Priority 4 (Low):');
        data.content_creation_plan.priority_4.forEach(gap => {
          console.log(`      - ${gap.ux_category_name}: ${gap.recommended_articles.length} articles recommended`);
        });
      }
      console.log('');
    }

    // Save full report to file
    const fs = require('fs');
    const reportPath = `docs/CONTENT_STRATEGY_RECOMMENDATIONS_${siteId}_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
    console.log(`💾 Full report saved to: ${reportPath}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
testContentStrategist()
  .then(() => {
    console.log('✨ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });


