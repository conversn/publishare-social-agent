/**
 * Setup GHL Social Media Config
 * 
 * Helper script to add GHL configuration to the database
 * 
 * Usage:
 *   node scripts/setup-ghl-config.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Example configurations - modify these with your actual GHL credentials
const exampleConfigs = [
  {
    site_id: 'callready',
    profile_name: 'Keenan Shaw',
    ghl_api_key: 'YOUR_GHL_JWT_TOKEN_HERE',
    ghl_location_id: 'nKDUZ3SsvwJquGSe5GdD',
    platforms: ['linkedin', 'facebook'],
    default_schedule_hours: 1,
    auto_post: false,
    brand_voice: 'Growth architecture and AI agent expert',
    content_themes: ['growth', 'automation', 'AI', 'leverage']
  },
  {
    site_id: 'callready',
    profile_name: 'CallReady',
    ghl_api_key: 'YOUR_GHL_JWT_TOKEN_HERE',
    ghl_location_id: 'nKDUZ3SsvwJquGSe5GdD',
    platforms: ['linkedin', 'facebook', 'instagram'],
    default_schedule_hours: 1,
    auto_post: false,
    brand_voice: 'Business automation and growth platform',
    content_themes: ['automation', 'business growth', 'newsletter', 'content marketing']
  }
];

async function setupGHLConfig() {
  console.log('🔧 Setting up GHL Social Media Configurations\n');
  console.log('='.repeat(60));
  
  for (const config of exampleConfigs) {
    console.log(`\n📝 Adding config for: ${config.profile_name} (${config.site_id})`);
    
    // Check if config already exists
    const { data: existing } = await supabase
      .from('ghl_social_config')
      .select('id')
      .eq('site_id', config.site_id)
      .eq('profile_name', config.profile_name)
      .single();
    
    if (existing) {
      console.log('   ⚠️  Config already exists, updating...');
      
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
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error(`   ❌ Update failed: ${updateError.message}`);
      } else {
        console.log('   ✅ Config updated');
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
          enabled: true
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`   ❌ Insert failed: ${insertError.message}`);
      } else {
        console.log(`   ✅ Config created (ID: ${data.id})`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup complete!\n');
  console.log('📋 Next steps:');
  console.log('   1. Update GHL API keys and location IDs in the script');
  console.log('   2. Run this script again to update configs');
  console.log('   3. Test with: node scripts/test-ghl-posting.js');
}

setupGHLConfig().catch(console.error);
