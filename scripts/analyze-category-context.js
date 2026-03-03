/**
 * Analyze Category Context from Database
 * 
 * Examines the database to understand if "invalid" lender names
 * are actually category headings that should provide context to lenders
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Known category headings (from invalid lenders analysis)
const CATEGORY_HEADINGS = [
  'Commercial',
  'Hard Money',
  'NDC Only',
  'Specialty Lender',
  'Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR',
  'Lenders with creative loan options (If one of these lenders work specifically for a new loan you have, contact the AE for submission requirements, Still need to upload file in LendingPad)',
  'Unusual MLO Compesation Broker Lender Paid or Borrower Paid Only',
];

async function analyzeCategoryContext() {
  console.log('🔍 Analyzing database to understand category context...\n');
  console.log('='.repeat(80));

  try {
    // Get all lenders ordered by creation (to see original import order)
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, slug, description, highlights, created_at, internal_notes')
      .eq('site_id', 'rateroots')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    console.log(`📊 Total lenders: ${lenders.length}\n`);

    // Identify category headings
    const categoryLenders = lenders.filter(l => 
      CATEGORY_HEADINGS.some(cat => 
        l.name.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(l.name.toLowerCase())
      )
    );

    console.log(`📌 Found ${categoryLenders.length} category headings:\n`);
    categoryLenders.forEach((cat, i) => {
      console.log(`${i + 1}. "${cat.name}"`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Created: ${cat.created_at}`);
      if (cat.description) {
        console.log(`   Description: ${cat.description.substring(0, 100)}...`);
      }
      console.log('');
    });

    // Find lenders that might belong to each category based on:
    // 1. Similar keywords in description/highlights
    // 2. Similar loan programs
    console.log('\n' + '='.repeat(80));
    console.log('🔗 Analyzing potential lender-category relationships:\n');

    const categoryGroups = [];

    for (const category of categoryLenders) {
      const categoryName = category.name.toLowerCase();
      const categoryKeywords = extractKeywords(categoryName);
      
      // Find lenders with similar keywords
      const relatedLenders = lenders
        .filter(l => {
          // Skip the category itself
          if (l.id === category.id) return false;
          
          // Check if lender description/highlights contain category keywords
          const lenderText = `${l.name} ${l.description || ''} ${(l.highlights || []).join(' ')}`.toLowerCase();
          
          return categoryKeywords.some(keyword => lenderText.includes(keyword));
        })
        .slice(0, 10); // Limit to top 10 matches

      if (relatedLenders.length > 0) {
        categoryGroups.push({
          category,
          relatedLenders,
          matchCount: relatedLenders.length,
        });

        console.log(`\n📌 Category: "${category.name}"`);
        console.log(`   Keywords: ${categoryKeywords.join(', ')}`);
        console.log(`   Found ${relatedLenders.length} potentially related lenders:`);
        relatedLenders.slice(0, 5).forEach((lender, i) => {
          console.log(`     ${i + 1}. ${lender.name}`);
          if (lender.description) {
            console.log(`        ${lender.description.substring(0, 80)}...`);
          }
        });
        if (relatedLenders.length > 5) {
          console.log(`     ... and ${relatedLenders.length - 5} more`);
        }
      }
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY:');
    console.log(`  Category headings found: ${categoryLenders.length}`);
    console.log(`  Categories with related lenders: ${categoryGroups.length}`);
    const totalRelated = categoryGroups.reduce((sum, group) => sum + group.matchCount, 0);
    console.log(`  Total lender-category relationships: ${totalRelated}`);

    // Recommendations
    console.log(`\n${'='.repeat(80)}`);
    console.log('💡 RECOMMENDATIONS:\n');
    console.log('1. Instead of discarding category headings, use them as context:');
    console.log('   - Add a "category_context" or "section_heading" field to lenders table');
    console.log('   - Store category headings as metadata, not as lender records');
    console.log('   - Link lenders to their category headings for better organization\n');
    
    console.log('2. Migration strategy:');
    console.log('   - Convert category headings to "category" records (new table or flag)');
    console.log('   - Add "category_id" or "section_heading" to lenders table');
    console.log('   - Use category names to enrich lender descriptions\n');
    
    console.log('3. Data enrichment:');
    console.log('   - Add category context to lender descriptions');
    console.log('   - Use categories for filtering and organization');
    console.log('   - Preserve original structure for reference\n');

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

function extractKeywords(text) {
  const keywords = [];
  
  // Extract meaningful words (2+ characters, not common stop words)
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from'];
  const words = text.split(/\s+/).filter(w => w.length >= 2 && !stopWords.includes(w.toLowerCase()));
  
  // Add specific loan program keywords
  const programKeywords = ['commercial', 'hard money', 'ndc', 'non qm', 'jumbo', 'dscr', 'itin', 'bank statement', 'foreign national', 'specialty'];
  programKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  return [...new Set([...words, ...keywords])];
}

analyzeCategoryContext()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


