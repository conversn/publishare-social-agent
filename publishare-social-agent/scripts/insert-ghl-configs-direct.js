/**
 * Insert GHL Configs Directly via Supabase Client
 * 
 * Executes SQL inserts for GHL social media configurations
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ghlConfigs = [
  {
    site_id: 'seniorsimple',
    profile_name: 'SeniorSimple Editorial',
    ghl_api_key: 'pit-d7795b54-91a3-405f-adbb-8c8aec301b29',
    ghl_location_id: 'vTM82D7FNpIlnPgw6XNC',
    platforms: ['facebook', 'linkedin', 'twitter'],
    default_schedule_hours: 1,
    auto_post: true,
    brand_voice: 'Senior financial planning and retirement education',
    content_themes: ['retirement', 'financial planning', 'senior living', 'estate planning'],
    enabled: true
  },
  {
    site_id: 'smallbizsimple',
    profile_name: 'Small Biz Simple Editorial',
    ghl_api_key: 'pit-83c15f07-ecfd-486e-bed2-7ea69128f3a0',
    ghl_location_id: 'IrVJP8Imu8PlECuGWEsQ',
    platforms: ['facebook', 'linkedin', 'twitter', 'instagram'],
    default_schedule_hours: 1,
    auto_post: true,
    brand_voice: 'Small business resources and entrepreneurial education',
    content_themes: ['small business', 'entrepreneurship', 'business growth', 'funding'],
    enabled: true
  },
  {
    site_id: 'parentsimple',
    profile_name: 'ParentSimple Editorial',
    ghl_api_key: 'pit-9002f0e5-531e-4ab0-a386-cfca5b9d5a5a',
    ghl_location_id: 'rvEnokPAkGiH3LxMJPpq',
    platforms: ['facebook', 'linkedin', 'twitter', 'instagram'],
    default_schedule_hours: 1,
    auto_post: true,
    brand_voice: 'Parenting resources and family education',
    content_themes: ['parenting', 'family', 'education', 'child development'],
    enabled: true
  }
];

async function insertGHLConfigs() {
  console.log('🔧 Inserting GHL Social Media Configurations\n');
  console.log('='.repeat(60));
  
  let added = 0;
  let updated = 0;
  let errors = 0;
  
  for (const config of ghlConfigs) {
    console.log(`\n📝 Processing: ${config.profile_name} (${config.site_id})`);
    
    // Check if config already exists
    const { data: existing } = await supabase
      .from('ghl_social_config')
      .select('id')
      .eq('site_id', config.site_id)
      .eq('profile_name', config.profile_name)
      .single();
    
    if (existing) {
      console.log('   🔄 Updating existing config...');
      
      const { error: updateError } = await supabase
        .from('ghl_social_config')
        .update({
          ghl_api_key: config.ghl_api_key,
          ghl_location_id: config.ghl_location_id,
          platforms: config.platforms,
          default_schedule_hours: config.default_schedule_hours,
          auto_post: config.auto_post,
          brand_voice: config.brand_voice,
          content_themes: config.content_themes,
          enabled: config.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error(`   ❌ Update failed: ${updateError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Config updated`);
        updated++;
      }
    } else {
      console.log('   ➕ Creating new config...');
      
      const { data, error: insertError } = await supabase
        .from('ghl_social_config')
        .insert({
          site_id: config.site_id,
          profile_name: config.profile_name,
          ghl_api_key: config.ghl_api_key,
          ghl_location_id: config.ghl_location_id,
          platforms: config.platforms,
          default_schedule_hours: config.default_schedule_hours,
          auto_post: config.auto_post,
          brand_voice: config.brand_voice,
          content_themes: config.content_themes,
          enabled: config.enabled
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`   ❌ Insert failed: ${insertError.message}`);
        errors++;
      } else {
        console.log(`   ✅ Config created (ID: ${data.id})`);
        added++;
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Added: ${added}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  // Verify configs
  console.log('\n📋 Verifying configurations...\n');
  const { data: allConfigs, error: verifyError } = await supabase
    .from('ghl_social_config')
    .select('site_id, profile_name, enabled, platforms, auto_post')
    .order('site_id', { ascending: true });
  
  if (!verifyError && allConfigs) {
    console.log('✅ Current GHL Configurations:');
    allConfigs.forEach(config => {
      console.log(`\n   Site: ${config.site_id}`);
      console.log(`   Profile: ${config.profile_name}`);
      console.log(`   Enabled: ${config.enabled ? 'Yes' : 'No'}`);
      console.log(`   Auto-Post: ${config.auto_post ? 'Yes' : 'No'}`);
      console.log(`   Platforms: ${config.platforms?.join(', ') || 'None'}`);
    });
  }
  
  console.log('\n✅ GHL configurations ready!');
  console.log('\n📋 Next steps:');
  console.log('   1. Test with: node scripts/test-ghl-posting.js');
  console.log('   2. Use in agentic-content-gen with share_to_social: true');
}

insertGHLConfigs().catch(console.error);

