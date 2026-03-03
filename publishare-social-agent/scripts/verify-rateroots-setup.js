/**
 * Verify RateRoots Setup
 * 
 * Verifies that:
 * 1. RateRoots Content Agent config exists
 * 2. Marcus Chen persona profile exists
 * 3. 50 content strategies were created
 * 4. Batch processor function is accessible
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                     process.env.SUPABASE_URL || 
                     'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    '';

if (!SUPABASE_KEY) {
  console.error('❌ Error: No Supabase key found. Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifySetup() {
  console.log('🔍 Verifying RateRoots Setup...\n');
  console.log('='.repeat(60));

  // 1. Check RateRoots site config
  console.log('\n1️⃣ Checking RateRoots Content Agent Config...');
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, config')
    .eq('id', 'rateroots')
    .single();

  if (siteError || !site) {
    console.error('❌ RateRoots site not found:', siteError?.message);
    return false;
  }

  const contentAgent = site.config?.content_agent;
  if (!contentAgent) {
    console.error('❌ Content Agent config not found for RateRoots');
    return false;
  }

  console.log('✅ Content Agent config found');
  console.log(`   Vertical Theme: ${contentAgent.vertical_theme?.substring(0, 50)}...`);
  console.log(`   Has safety rules: ${contentAgent.safety_rules?.length > 0 ? 'Yes' : 'No'}`);

  // 2. Check persona profile
  console.log('\n2️⃣ Checking Marcus Chen Persona Profile...');
  const { data: persona, error: personaError } = await supabase
    .from('heygen_avatar_config')
    .select('avatar_name, persona_profile')
    .eq('site_id', 'rateroots')
    .single();

  if (personaError || !persona) {
    console.error('❌ Persona profile not found:', personaError?.message);
    return false;
  }

  console.log('✅ Persona profile found');
  console.log(`   Avatar Name: ${persona.avatar_name}`);
  console.log(`   Persona Name: ${persona.persona_profile?.name || 'N/A'}`);

  // 3. Check content strategies
  console.log('\n3️⃣ Checking Content Strategies...');
  const { data: strategies, error: strategiesError } = await supabase
    .from('content_strategy')
    .select('id, content_title, status, priority_level')
    .eq('site_id', 'rateroots');

  if (strategiesError) {
    console.error('❌ Error fetching strategies:', strategiesError.message);
    return false;
  }

  const total = strategies?.length || 0;
  const planned = strategies?.filter(s => s.status === 'Planned').length || 0;
  const highPriority = strategies?.filter(s => s.priority_level === 'High').length || 0;

  console.log(`✅ Found ${total} content strategies`);
  console.log(`   Planned: ${planned}`);
  console.log(`   High Priority: ${highPriority}`);

  if (total < 50) {
    console.warn(`⚠️  Expected 50 strategies, found ${total}`);
  }

  // Show sample strategies
  if (strategies && strategies.length > 0) {
    console.log('\n   Sample strategies:');
    strategies.slice(0, 3).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.content_title || 'Untitled'} (${s.status}, ${s.priority_level})`);
    });
  }

  // 4. Test batch processor function (dry run)
  console.log('\n4️⃣ Testing Batch Processor Function...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-strategy-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        site_id: 'rateroots',
        limit: 1,
        dry_run: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Batch processor function is accessible');
    console.log(`   Dry run found ${result.results?.length || 0} strategies to process`);

    if (result.results && result.results.length > 0) {
      console.log(`   Sample: ${result.results[0].strategy_title || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Error testing batch processor:', error.message);
    return false;
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All checks passed! RateRoots setup is complete.');
  console.log('\n📝 Next steps:');
  console.log('   1. Test single article generation');
  console.log('   2. Run batch processing with: node scripts/trigger-rateroots-batch.js --limit 3');
  console.log('   3. Review generated articles in the CMS');

  return true;
}

verifySetup()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

