/**
 * Publish Priority Articles
 * 
 * Verifies UX categories are assigned and publishes the newly generated priority articles
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function publishPriorityArticles() {
  console.log('🚀 Publishing Priority Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

  // Article IDs from the generation script
  const articleIds = [
    '3d561096-e664-44b9-8d57-96688e1d6ae8', // 529 Plan Basics
    '05b0b439-b6e2-4a1b-b99d-b3c4d61b6ad0', // How to Calculate Your College Savings Goal
    '6200856f-d9e0-4670-b03f-63ef3c87af4a', // Life Insurance for Parents
    'b4f4f770-1115-4748-b0a7-f2f89f9b5018', // GPA Optimization Strategies
    'c9d04c8d-4b78-4b95-91a0-ac5a4724af4a', // SAT vs. ACT
    'c7df49db-07d4-47c2-890e-03e015ed5be4'  // Building a Strong Extracurricular Profile
  ];

  try {
    // Get UX category IDs
    const { data: uxCategories, error: uxError } = await supabase
      .from('ux_categories')
      .select('id, slug, name')
      .eq('site_id', siteId);

    if (uxError) {
      throw new Error(`Failed to fetch UX categories: ${uxError.message}`);
    }

    const categoryMap = {};
    uxCategories.forEach(cat => {
      categoryMap[cat.slug] = cat.id;
    });

    // Get articles and their expected categories
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, category, status')
      .in('id', articleIds)
      .eq('site_id', siteId);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    console.log(`📋 Found ${articles.length} articles to publish`);
    console.log('');

    const published = [];
    const skipped = [];

    for (const article of articles) {
      try {
        // Determine target UX category based on article category
        let targetCategorySlug = null;
        if (article.category === '529 Plans' || article.category === 'Life Insurance') {
          targetCategorySlug = 'financial-planning';
        } else if (article.category === 'College Consulting') {
          targetCategorySlug = 'high-school';
        }

        // Check if UX category is already assigned
        const { data: existingCategory } = await supabase
          .from('article_ux_categories')
          .select('ux_category_id')
          .eq('article_id', article.id)
          .eq('is_primary', true)
          .single();

        // Assign UX category if not already assigned
        if (!existingCategory && targetCategorySlug && categoryMap[targetCategorySlug]) {
          const { error: assignError } = await supabase
            .from('article_ux_categories')
            .insert({
              article_id: article.id,
              ux_category_id: categoryMap[targetCategorySlug],
              is_primary: true
            });

          if (assignError) {
            console.log(`   ⚠️  Failed to assign UX category to "${article.title}": ${assignError.message}`);
          } else {
            console.log(`   ✅ Assigned UX category: ${targetCategorySlug}`);
          }
        }

        // Publish the article
        const { error: updateError } = await supabase
          .from('articles')
          .update({ status: 'published' })
          .eq('id', article.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        published.push({
          title: article.title,
          id: article.id,
          category: targetCategorySlug || 'unknown'
        });

        console.log(`   ✅ Published: ${article.title.substring(0, 50)}...`);
        console.log('');

      } catch (error) {
        console.log(`   ❌ Failed to publish "${article.title}": ${error.message}`);
        skipped.push({
          title: article.title,
          error: error.message
        });
        console.log('');
      }
    }

    console.log('✅ Publishing complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Published: ${published.length}`);
    console.log(`   Skipped: ${skipped.length}`);
    console.log('');

    if (published.length > 0) {
      console.log('Published Articles:');
      published.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.title}`);
        console.log(`      Category: ${item.category}`);
        console.log(`      ID: ${item.id}`);
      });
      console.log('');
    }

    // Verify final status
    console.log('🔍 Verifying final status...');
    const { data: verifyData } = await supabase
      .from('articles_with_primary_ux_category')
      .select('primary_ux_category_slug')
      .eq('site_id', siteId)
      .eq('status', 'published');

    const categoryCounts = {};
    verifyData?.forEach(article => {
      const slug = article.primary_ux_category_slug || 'none';
      categoryCounts[slug] = (categoryCounts[slug] || 0) + 1;
    });

    console.log('Current published article distribution:');
    Object.entries(categoryCounts).forEach(([slug, count]) => {
      console.log(`   ${slug}: ${count} articles`);
    });

  } catch (error) {
    console.error('❌ Error publishing articles:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
publishPriorityArticles()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


