/**
 * Run ParentSimple Category Mapping Migration
 * 
 * Executes the SQL migration to add UX category mappings for actual content strategy category values
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

async function runMigration() {
  console.log('🚀 Running ParentSimple Category Mapping Migration');
  console.log('='.repeat(60));
  console.log('');

  if (!SUPABASE_KEY) {
    console.error('❌ Error: No Supabase key found');
    console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250130000001_add_parentsimple_category_mappings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Executing migration SQL...');
    
    // Split SQL into individual statements (simple approach - split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      if (statement.length > 10) { // Skip very short statements
        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          if (error && !error.message.includes('already exists')) {
            console.log(`   ⚠️  Statement warning: ${error.message.substring(0, 100)}`);
          }
        } catch (err) {
          // Try direct execution via REST API
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql_query: statement })
          });
          
          if (!response.ok && !response.statusText.includes('already exists')) {
            const errorText = await response.text();
            console.log(`   ⚠️  Statement warning: ${errorText.substring(0, 100)}`);
          }
        }
      }
    }

    // Actually, let's use a simpler approach - execute the key INSERT statements directly
    console.log('📋 Inserting category mappings...');
    
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

    // Define mappings
    const mappings = [
      // College Planning
      { category: 'College Consulting', uxSlug: 'college-planning' },
      { category: 'College Admissions', uxSlug: 'college-planning' },
      { category: 'Elite Colleges', uxSlug: 'college-planning' },
      { category: 'Financial Aid', uxSlug: 'college-planning' },
      { category: 'Scholarships', uxSlug: 'college-planning' },
      { category: 'Standardized Testing', uxSlug: 'college-planning' },
      { category: 'Extracurriculars', uxSlug: 'college-planning' },
      // Financial Planning
      { category: '529 Plans', uxSlug: 'financial-planning' },
      { category: 'Life Insurance', uxSlug: 'financial-planning' },
      { category: 'Estate Planning', uxSlug: 'financial-planning' },
      { category: 'Financial Planning', uxSlug: 'financial-planning' },
      { category: 'Education Funding', uxSlug: 'financial-planning' },
      // High School
      { category: 'High School', uxSlug: 'high-school' },
      { category: 'Course Selection', uxSlug: 'high-school' },
      // Middle School
      { category: 'Middle School', uxSlug: 'middle-school' },
      { category: 'Academic Preparation', uxSlug: 'middle-school' },
      { category: 'Study Skills', uxSlug: 'middle-school' },
      // Early Years
      { category: 'Early Years', uxSlug: 'early-years' },
      { category: 'Early Childhood', uxSlug: 'early-years' },
      { category: 'Foundation Building', uxSlug: 'early-years' },
    ];

    const inserts = mappings.map(m => ({
      site_id: 'parentsimple',
      content_category: m.category,
      ux_category_id: uxMap[m.uxSlug],
      is_default: true,
      priority: 10
    })).filter(m => m.ux_category_id); // Only include if UX category exists

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from('content_category_ux_mapping')
        .upsert(inserts, { onConflict: 'site_id,content_category,ux_category_id' });

      if (insertError) {
        throw new Error(`Failed to insert mappings: ${insertError.message}`);
      }

      console.log(`   ✅ Inserted ${inserts.length} category mappings`);
    } else {
      console.log('   ⚠️  No mappings to insert (UX categories may not exist)');
    }

    console.log('');
    console.log('✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error('');
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Main execution
runMigration()
  .then(() => {
    console.log('');
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


