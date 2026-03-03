/**
 * Assign Category Context to Lenders
 * 
 * Analyzes lenders and assigns category_context based on:
 * 1. Category headings found in database
 * 2. Keyword matching in lender descriptions
 * 3. Loan program alignment
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

const DRY_RUN = process.argv.includes('--dry-run');

// Category heading mappings (category name -> keywords to match)
const CATEGORY_MAPPINGS = {
  'Commercial': {
    keywords: ['commercial', 'multifamily', 'mixed-use', 'commercial real estate', 'commercial property'],
    categoryId: '8da1067b-14c3-48e4-a796-547c96432945',
  },
  'Hard Money': {
    keywords: ['hard money', 'private money', 'bridge lending', 'stand alone'],
    categoryId: 'd45394e1-e36c-43cd-8f5b-c8b6edb6fea5',
  },
  'NDC Only': {
    keywords: ['ndc', 'correspondent', 'non-delegated'],
    categoryId: '61507eb3-9170-4755-b476-811605e5f0e4',
  },
  'Specialty Lender': {
    keywords: ['specialty', 'niche', 'unique', 'specialized'],
    categoryId: 'c468610f-5109-49bf-b597-492ecc4fa6ff',
  },
  'Broker Non QM, Super Jumbo, Commercial, Hard Money, ITIN, Bank Statement, Foreign National, DSCR': {
    keywords: ['non qm', 'super jumbo', 'dscr', 'itin', 'bank statement', 'foreign national'],
    categoryId: '99dd4fb3-7c74-443d-be57-1684d93be808',
  },
  'Lenders with creative loan options': {
    keywords: ['creative', 'unique', 'flexible', 'custom'],
    categoryId: '16bab36c-a8da-44c6-8e22-7df3c07b9c08',
  },
  'Unusual MLO Compensation': {
    keywords: ['broker paid', 'borrower paid', 'unusual compensation', 'compensation'],
    categoryId: 'bf80b5e2-a2d5-4647-ba35-4621b6b2ded8',
  },
};

function extractText(lender) {
  return `${lender.name} ${lender.description || ''} ${(lender.highlights || []).join(' ')}`.toLowerCase();
}

function findMatchingCategory(lender) {
  const text = extractText(lender);
  
  // Find best matching category
  let bestMatch = null;
  let bestMatchCount = 0;
  
  for (const [categoryName, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
    const matchCount = mapping.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    ).length;
    
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      bestMatch = categoryName;
    }
  }
  
  // Only assign if we have at least 2 keyword matches (to avoid false positives)
  if (bestMatchCount >= 2) {
    return bestMatch;
  }
  
  return null;
}

async function assignCategoryContext() {
  console.log('🏷️  Assigning category context to lenders...\n');
  console.log('='.repeat(80));
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No changes will be made\n');
  }

  try {
    // Get all lenders (excluding category headings)
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, description, highlights, category_context, is_category_heading')
      .eq('site_id', 'rateroots')
      .or('is_category_heading.eq.false,is_category_heading.is.null'); // Get lenders where flag is false OR null

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    console.log(`📊 Analyzing ${lenders.length} lenders...\n`);

    const assignments = [];
    const noMatch = [];

    for (const lender of lenders) {
      const category = findMatchingCategory(lender);
      
      if (category) {
        assignments.push({
          lender,
          category,
          currentContext: lender.category_context,
        });
      } else {
        noMatch.push(lender);
      }
    }

    // Show assignments
    console.log(`📌 Found ${assignments.length} lenders to assign category context:\n`);
    
    const categoryGroups = {};
    assignments.forEach(({ lender, category }) => {
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(lender);
    });

    for (const [category, lenders] of Object.entries(categoryGroups)) {
      console.log(`\n📌 Category: "${category}"`);
      console.log(`   Lenders (${lenders.length}):`);
      lenders.slice(0, 5).forEach((lender, i) => {
        console.log(`     ${i + 1}. ${lender.name}`);
      });
      if (lenders.length > 5) {
        console.log(`     ... and ${lenders.length - 5} more`);
      }
    }

    if (noMatch.length > 0) {
      console.log(`\n⚠️  ${noMatch.length} lenders without category match`);
    }

    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN - Would assign category context to ${assignments.length} lenders`);
      return;
    }

    // Update lenders with category context
    console.log(`\n🏷️  Updating ${assignments.length} lenders with category context...\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const { lender, category } of assignments) {
      const { error: updateError } = await supabase
        .from('lenders')
        .update({ category_context: category })
        .eq('id', lender.id);

      if (updateError) {
        console.error(`❌ Error updating ${lender.name}:`, updateError.message);
        errorCount++;
      } else {
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`   Updated ${updatedCount}/${assignments.length}...`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Updated: ${updatedCount} lenders`);
    console.log(`❌ Errors: ${errorCount} lenders`);
    console.log(`⚠️  No match: ${noMatch.length} lenders`);

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

assignCategoryContext()
  .then(() => {
    console.log('\n✅ Assignment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

