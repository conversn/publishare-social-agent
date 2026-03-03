/**
 * Re-categorize Articles Based on Content Strategist Recommendations
 * 
 * Moves articles from their current UX category to the recommended category
 * to fill content gaps without creating new content.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function reCategorizeArticles() {
  console.log('🚀 Re-categorizing Articles to Fill Content Gaps');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const siteId = 'parentsimple';

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

    // Define re-categorization mappings based on content strategist recommendations
    const reCategorizations = [
      // Financial Planning articles (from resources)
      {
        keywords: ['529', 'life insurance', 'estate planning', 'financial planning', 'financial aid', 'merit scholarship', 'tax'],
        fromCategory: 'resources',
        toCategory: 'financial-planning',
        toCategoryId: categoryMap['financial-planning']
      },
      // High School articles (from resources or other categories)
      {
        keywords: ['high school', 'gpa', 'sat', 'act', 'ap', 'extracurricular', 'teacher recommendation', 'college prep', 'course selection', 'transcript', 'junior year', 'senior year', 'freshman year'],
        fromCategory: null, // Check all categories
        toCategory: 'high-school',
        toCategoryId: categoryMap['high-school']
      },
      // Middle School articles
      {
        keywords: ['middle school', '8th grade', 'course selection', 'study skills', 'academic planning', 'preparing for high school'],
        fromCategory: null,
        toCategory: 'middle-school',
        toCategoryId: categoryMap['middle-school']
      },
      // Early Years articles
      {
        keywords: ['early childhood', 'preschool', 'baby', 'toddler', 'foundation', 'development milestone', 'learning through play'],
        fromCategory: null,
        toCategory: 'early-years',
        toCategoryId: categoryMap['early-years']
      }
    ];

    // Get all published articles with their current UX categories
    const { data: articles, error: articlesError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, primary_ux_category_slug, primary_ux_category_id, category')
      .eq('site_id', siteId)
      .eq('status', 'published');

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    console.log(`📋 Found ${articles.length} published articles`);
    console.log('');

    const reCategorized = [];
    const skipped = [];

    for (const article of articles) {
      for (const mapping of reCategorizations) {
        // Skip if article is already in target category
        if (article.primary_ux_category_slug === mapping.toCategory) {
          continue;
        }

        // Check if article matches keywords
        const searchText = `${article.title} ${article.category || ''}`.toLowerCase();
        const matchesKeywords = mapping.keywords.some(keyword => 
          searchText.includes(keyword.toLowerCase())
        );

        // Check if from category matches (if specified)
        const fromCategoryMatches = !mapping.fromCategory || 
          article.primary_ux_category_slug === mapping.fromCategory;

        if (matchesKeywords && fromCategoryMatches) {
          // Re-categorize the article
          try {
            // First, remove existing primary category assignment
            if (article.primary_ux_category_id) {
              await supabase
                .from('article_ux_categories')
                .delete()
                .eq('article_id', article.id)
                .eq('ux_category_id', article.primary_ux_category_id)
                .eq('is_primary', true);
            }

            // Add new category assignment
            const { error: insertError } = await supabase
              .from('article_ux_categories')
              .insert({
                article_id: article.id,
                ux_category_id: mapping.toCategoryId,
                is_primary: true
              });

            if (insertError) {
              console.log(`   ⚠️  Failed to re-categorize "${article.title}": ${insertError.message}`);
              skipped.push({
                article: article.title,
                reason: insertError.message
              });
            } else {
              reCategorized.push({
                article: article.title,
                from: article.primary_ux_category_slug || 'none',
                to: mapping.toCategory
              });
              console.log(`   ✅ "${article.title.substring(0, 50)}..." → ${mapping.toCategory}`);
            }
          } catch (error) {
            console.log(`   ⚠️  Error re-categorizing "${article.title}": ${error.message}`);
            skipped.push({
              article: article.title,
              reason: error.message
            });
          }
          break; // Only re-categorize once per article
        }
      }
    }

    console.log('');
    console.log('✅ Re-categorization complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Re-categorized: ${reCategorized.length}`);
    console.log(`   Skipped: ${skipped.length}`);
    console.log('');

    if (reCategorized.length > 0) {
      console.log('Re-categorized Articles:');
      reCategorized.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.article}`);
        console.log(`      ${item.from} → ${item.to}`);
      });
      console.log('');
    }

    if (skipped.length > 0) {
      console.log('Skipped Articles:');
      skipped.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.article}: ${item.reason}`);
      });
      console.log('');
    }

    // Verify results
    console.log('🔍 Verifying results...');
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

    console.log('Current category distribution:');
    Object.entries(categoryCounts).forEach(([slug, count]) => {
      console.log(`   ${slug}: ${count} articles`);
    });

  } catch (error) {
    console.error('❌ Error re-categorizing articles:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
reCategorizeArticles()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


