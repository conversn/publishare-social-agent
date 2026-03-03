/**
 * Assign UX Categories to Existing ParentSimple Articles
 * 
 * Uses mapping rules to assign UX categories to all existing articles
 * based on their content strategy categories.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

/**
 * Normalize category value for mapping lookup
 * Converts "College Consulting" → "college-consulting"
 */
function normalizeCategory(category) {
  if (!category) return null;
  return category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function assignUXCategories() {
  console.log('🚀 Assigning UX Categories to Existing ParentSimple Articles');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Get all ParentSimple articles with their content categories
    console.log('📋 Fetching ParentSimple articles...');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('id, title, category, site_id')
      .eq('site_id', 'parentsimple')
      .not('category', 'is', null);

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    console.log(`   Found ${articles.length} articles with content categories`);
    console.log('');

    // Get all mapping rules
    console.log('📋 Fetching mapping rules...');
    const { data: mappings, error: mappingsError } = await supabase
      .from('content_category_ux_mapping')
      .select('content_category, ux_category_id, is_default')
      .eq('site_id', 'parentsimple')
      .eq('is_default', true);

    if (mappingsError) {
      throw new Error(`Failed to fetch mappings: ${mappingsError.message}`);
    }

    console.log(`   Found ${mappings.length} mapping rules`);
    console.log('');

    // Create lookup map (both exact and normalized)
    const mappingMap = new Map();
    mappings.forEach(m => {
      // Store exact match
      mappingMap.set(m.content_category, m.ux_category_id);
      // Also store normalized version
      const normalized = normalizeCategory(m.content_category);
      if (normalized && normalized !== m.content_category) {
        mappingMap.set(normalized, m.ux_category_id);
      }
    });

    // Check which articles already have UX categories
    console.log('📋 Checking existing UX category assignments...');
    const { data: existingAssignments } = await supabase
      .from('article_ux_categories')
      .select('article_id')
      .in('article_id', articles.map(a => a.id));

    const assignedArticleIds = new Set(existingAssignments?.map(a => a.article_id) || []);
    const articlesToAssign = articles.filter(a => !assignedArticleIds.has(a.id));

    console.log(`   ${assignedArticleIds.size} articles already have UX categories`);
    console.log(`   ${articlesToAssign.length} articles need UX categories`);
    console.log('');

    if (articlesToAssign.length === 0) {
      console.log('✅ All articles already have UX categories assigned!');
      return;
    }

    // Assign UX categories
    console.log('📂 Assigning UX categories...');
    let assigned = 0;
    let skipped = 0;
    const assignments = [];

    for (const article of articlesToAssign) {
      // Try exact match first
      let uxCategoryId = mappingMap.get(article.category);
      
      // If no exact match, try normalized version
      if (!uxCategoryId) {
        const normalized = normalizeCategory(article.category);
        uxCategoryId = normalized ? mappingMap.get(normalized) : null;
      }

      if (uxCategoryId) {
        assignments.push({
          article_id: article.id,
          ux_category_id: uxCategoryId,
          is_primary: true
        });
        assigned++;
      } else {
        console.log(`   ⚠️  No mapping found for "${article.category}" - ${article.title.substring(0, 50)}...`);
        skipped++;
      }
    }

    if (assignments.length > 0) {
      // Insert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('article_ux_categories')
          .insert(batch);

        if (insertError) {
          console.error(`   ❌ Error inserting batch ${i / batchSize + 1}: ${insertError.message}`);
        } else {
          console.log(`   ✅ Inserted batch ${i / batchSize + 1} (${batch.length} assignments)`);
        }
      }
    }

    console.log('');
    console.log('✅ Assignment complete!');
    console.log('');
    console.log('Results:');
    console.log(`   Assigned: ${assigned}`);
    console.log(`   Skipped (no mapping): ${skipped}`);
    console.log(`   Total: ${articlesToAssign.length}`);
    console.log('');

    // Verify results
    console.log('🔍 Verifying assignments...');
    const { data: verifyData } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, primary_ux_category_name')
      .eq('site_id', 'parentsimple')
      .not('primary_ux_category_name', 'is', null)
      .limit(5);

    if (verifyData && verifyData.length > 0) {
      console.log(`   ✅ Sample articles with UX categories:`);
      verifyData.forEach((a, i) => {
        console.log(`      ${i + 1}. ${a.title.substring(0, 50)}... → ${a.primary_ux_category_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Error assigning UX categories:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
assignUXCategories()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


