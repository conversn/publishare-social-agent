/**
 * Add Content Type Mappings for ParentSimple
 * 
 * Adds mappings for content types (pillar-page, article, how-to, comparison) to UX categories
 * Similar to what was done for RateRoots
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function addContentTypeMappings() {
  console.log('🚀 Adding Content Type Mappings for ParentSimple');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Get UX category IDs
    const { data: uxCategories, error: uxError } = await supabase
      .from('ux_categories')
      .select('id, slug')
      .eq('site_id', 'parentsimple');

    if (uxError) {
      throw new Error(`Failed to fetch UX categories: ${uxError.message}`);
    }

    const uxMap = {};
    uxCategories.forEach(cat => {
      uxMap[cat.slug] = cat.id;
    });

    // Define content type to UX category mappings
    // For ParentSimple, we'll map content types to appropriate UX categories
    const contentTypeMappings = [
      { contentType: 'pillar-page', uxSlug: 'college-planning' }, // Most pillar pages are college planning
      { contentType: 'article', uxSlug: 'resources' }, // Articles go to resources
      { contentType: 'how-to', uxSlug: 'resources' }, // How-to guides go to resources
      { contentType: 'comparison', uxSlug: 'resources' }, // Comparisons go to resources
      { contentType: 'general', uxSlug: 'resources' }, // General content goes to resources
    ];

    const inserts = contentTypeMappings
      .map(m => ({
        site_id: 'parentsimple',
        content_category: m.contentType,
        ux_category_id: uxMap[m.uxSlug],
        is_default: true,
        priority: 5 // Lower priority than strategy category mappings (priority 10)
      }))
      .filter(m => m.ux_category_id); // Only include if UX category exists

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('content_category_ux_mapping')
        .upsert(inserts, { onConflict: 'site_id,content_category,ux_category_id' });

      if (insertError) {
        throw new Error(`Failed to insert mappings: ${insertError.message}`);
      }

      console.log(`   ✅ Inserted ${inserts.length} content type mappings`);
      console.log('');
      console.log('Mappings added:');
      inserts.forEach(m => {
        const mapping = contentTypeMappings.find(ctm => ctm.contentType === m.content_category);
        console.log(`   - ${m.content_category} → ${mapping?.uxSlug}`);
      });
    } else {
      console.log('   ⚠️  No mappings to insert (UX categories may not exist)');
    }

    console.log('');
    console.log('✅ Content type mappings added!');

  } catch (error) {
    console.error('❌ Error adding mappings:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
addContentTypeMappings()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


