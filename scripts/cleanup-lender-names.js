/**
 * Cleanup Lender Names - Remove Bracket Notation
 * 
 * Removes internal shorthand notation like "[0.35 missing ndc margin on lender website]"
 * from lender names and moves it to internal_notes for data integrity.
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

// Pattern to match bracket notation: [anything]
const BRACKET_PATTERN = /\[[^\]]+\]/g;

async function cleanupLenderNames() {
  console.log('🔍 Finding lenders with bracket notation in names...\n');

  try {
    // Fetch all lenders
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, internal_notes')
      .order('name');

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!lenders || lenders.length === 0) {
      console.log('No lenders found');
      return;
    }

    // Find lenders with bracket notation
    const lendersToClean = lenders.filter(lender => {
      return BRACKET_PATTERN.test(lender.name);
    });

    console.log(`📊 Found ${lendersToClean.length} lenders with bracket notation:\n`);

    if (lendersToClean.length === 0) {
      console.log('✅ No cleanup needed!');
      return;
    }

    // Show what will be cleaned
    lendersToClean.forEach((lender, index) => {
      const matches = lender.name.match(BRACKET_PATTERN);
      console.log(`${index + 1}. ${lender.name}`);
      console.log(`   Brackets found: ${matches.join(', ')}\n`);
    });

    // Check if dry-run
    const isDryRun = process.argv.includes('--dry-run');
    if (isDryRun) {
      console.log('🔍 DRY RUN - No changes will be made\n');
      return;
    }

    console.log('🧹 Cleaning up lender names...\n');

    let updated = 0;
    let errors = 0;

    for (const lender of lendersToClean) {
      try {
        // Extract bracket notation
        const bracketMatches = lender.name.match(BRACKET_PATTERN);
        const bracketText = bracketMatches ? bracketMatches.join(' ') : '';

        // Clean name - remove all bracket notation
        const cleanedName = lender.name.replace(BRACKET_PATTERN, '').trim();

        // Preserve multiple spaces as single space
        const finalName = cleanedName.replace(/\s+/g, ' ');

        // Prepare internal_notes update
        let internalNotes = {};
        try {
          if (lender.internal_notes) {
            internalNotes = typeof lender.internal_notes === 'string'
              ? JSON.parse(lender.internal_notes)
              : lender.internal_notes;
          }
        } catch (e) {
          // Invalid JSON, start fresh
          internalNotes = {};
        }

        // Add bracket notation to internal_notes if not already there
        if (bracketText && !internalNotes.removed_bracket_notation) {
          internalNotes.removed_bracket_notation = bracketText;
          internalNotes.name_cleanup_date = new Date().toISOString();
        }

        // Update lender
        const { error: updateError } = await supabase
          .from('lenders')
          .update({
            name: finalName,
            internal_notes: JSON.stringify(internalNotes),
          })
          .eq('id', lender.id);

        if (updateError) {
          console.error(`❌ Error updating ${lender.name}: ${updateError.message}`);
          errors++;
        } else {
          console.log(`✅ ${lender.name} → ${finalName}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${lender.name}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Updated: ${updated} lenders`);
    console.log(`❌ Errors: ${errors} lenders`);
    console.log(`\n🎯 Next Steps:`);
    console.log(`1. Review cleaned names`);
    console.log(`2. Re-run crawler for affected lenders if needed`);
    console.log(`3. Verify website URLs are correct`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupLenderNames()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


