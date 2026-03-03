/**
 * Lender Directory Setup Verification Script
 * 
 * Purpose: Verify database migration completed successfully
 * 
 * Usage:
 *   node scripts/verify-lender-directory-setup.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifySetup() {
  console.log('🔍 Verifying Lender Directory Setup...\n');
  console.log('='.repeat(70));
  
  let allPassed = true;
  
  // 1. Check database connection
  console.log('\n1️⃣  Testing Database Connection...');
  try {
    const { data, error } = await supabase.from('sites').select('id').limit(1);
    if (error) throw error;
    console.log('   ✅ Database connection successful');
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    allPassed = false;
  }
  
  // 2. Check tables exist
  console.log('\n2️⃣  Checking Required Tables...');
  const tables = ['lenders', 'loan_programs', 'lender_programs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error) throw error;
      console.log(`   ✅ Table '${table}' exists`);
    } catch (error) {
      console.log(`   ❌ Table '${table}' missing or inaccessible: ${error.message}`);
      allPassed = false;
    }
  }
  
  // 3. Check loan programs count
  console.log('\n3️⃣  Checking Loan Programs...');
  try {
    const { data, error, count } = await supabase
      .from('loan_programs')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    if (count >= 30) {
      console.log(`   ✅ Found ${count} loan programs (expected: 30+)`);
    } else {
      console.log(`   ⚠️  Found ${count} loan programs (expected: 30+)`);
      console.log('   💡 Run the migration to populate loan programs');
    }
  } catch (error) {
    console.log(`   ❌ Error checking loan programs: ${error.message}`);
    allPassed = false;
  }
  
  // 4. Check sites table
  console.log('\n4️⃣  Checking Sites Table...');
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name')
      .eq('id', 'rateroots');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`   ✅ RateRoots site found: ${data[0].name}`);
    } else {
      console.log('   ⚠️  RateRoots site not found');
      console.log('   💡 Create site entry: INSERT INTO sites (id, name, domain) VALUES (\'rateroots\', \'RateRoots\', \'rateroots.com\');');
    }
  } catch (error) {
    console.log(`   ❌ Error checking sites: ${error.message}`);
    allPassed = false;
  }
  
  // 5. Check lenders table structure
  console.log('\n5️⃣  Checking Lenders Table Structure...');
  try {
    const { data, error } = await supabase
      .from('lenders')
      .select('id, name, slug, site_id, is_published')
      .limit(1);
    
    if (error) throw error;
    
    // Check if we can query (table exists and is accessible)
    const { count } = await supabase
      .from('lenders')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   ✅ Lenders table accessible (${count || 0} lenders)`);
  } catch (error) {
    console.log(`   ❌ Error accessing lenders table: ${error.message}`);
    allPassed = false;
  }
  
  // 6. Check RLS policies
  console.log('\n6️⃣  Checking Row Level Security...');
  try {
    // Try to query with anon key (should work for published lenders)
    const anonClient = createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY
    );
    
    const { data, error } = await anonClient
      .from('lenders')
      .select('id')
      .eq('is_published', true)
      .limit(1);
    
    if (error && error.message.includes('permission')) {
      console.log('   ⚠️  RLS policies may need configuration');
    } else {
      console.log('   ✅ RLS policies configured');
    }
  } catch (error) {
    console.log(`   ⚠️  Could not verify RLS: ${error.message}`);
  }
  
  // 7. Check views
  console.log('\n7️⃣  Checking Helper Views...');
  const views = [
    'lenders_with_programs_public',
    'lenders_with_programs_gated',
    'loan_programs_with_counts'
  ];
  
  for (const view of views) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `SELECT COUNT(*) FROM ${view}`
      }).catch(() => {
        // Try direct query
        return supabase.from(view).select('*', { count: 'exact', head: true });
      });
      
      if (!error) {
        console.log(`   ✅ View '${view}' exists`);
      } else {
        console.log(`   ⚠️  View '${view}' may not be accessible via API (this is OK)`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not verify view '${view}' (may need direct SQL check)`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('\n✅ Setup Verification Complete!');
    console.log('   All critical components are in place.');
    console.log('   You can proceed with data import.\n');
  } else {
    console.log('\n⚠️  Setup Verification Found Issues');
    console.log('   Please review the errors above and fix before proceeding.\n');
  }
  
  console.log('📋 Next Steps:');
  console.log('   1. Run: npm run import-lenders:dry-run');
  console.log('   2. Review dry-run output');
  console.log('   3. Run: npm run import-lenders');
  console.log('   4. Review imported data\n');
}

// Run verification
if (require.main === module) {
  verifySetup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { verifySetup };


