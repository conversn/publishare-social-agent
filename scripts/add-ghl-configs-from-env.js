/**
 * Add GHL Configs from Environment Variables
 * 
 * Reads GHL configuration from environment variables and adds to database
 * 
 * Usage:
 *   node scripts/add-ghl-configs-from-env.js
 * 
 * Required Environment Variables:
 *   - KEENAN_SHAW_GHL_JWT_TOKEN
 *   - KEENAN_SHAW_GHL_LOCATION_ID
 *   - CALLREADY_GHL_JWT_TOKEN
 *   - CALLREADY_GHL_LOCATION_ID
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GHL Configurations
// Update these with your actual values from .env file (lines 164-177)
// Or set as environment variables with matching names
const ghlConfigs = [
  {
    site_id: 'callready',
    profile_name: 'Keenan Shaw',
    ghl_api_key: process.env.KEENAN_SHAW_GHL_JWT_TOKEN || 
                 process.env.KEENAN_SHAW_GHL_API_KEY || 
                 'YOUR_KEENAN_SHAW_JWT_TOKEN',
    ghl_location_id: process.env.KEENAN_SHAW_GHL_LOCATION_ID || 
                     process.env.CALLREADY_GHL_LOCATION_ID ||
                     'nKDUZ3SsvwJquGSe5GdD',
    platforms: ['linkedin', 'facebook'],
    default_schedule_hours: 1,
    auto_post: false,
    brand_voice: 'Growth architecture and AI agent expert',
    content_themes: ['growth', 'automation', 'AI', 'leverage']
  },
  {
    site_id: 'callready',
    profile_name: 'CallReady',
    ghl_api_key: process.env.CALLREADY_GHL_JWT_TOKEN || 
                 process.env.CALLREADY_GHL_API_KEY || 
                 process.env.KEENAN_SHAW_GHL_JWT_TOKEN ||
                 'YOUR_CALLREADY_JWT_TOKEN',
    ghl_location_id: process.env.CALLREADY_GHL_LOCATION_ID || 
                     process.env.KEENAN_SHAW_GHL_LOCATION_ID ||
                     'nKDUZ3SsvwJquGSe5GdD',
    platforms: ['linkedin', 'facebook', 'instagram'],
    default_schedule_hours: 1,
    auto_post: false,
    brand_voice: 'Business automation and growth platform',
    content_themes: ['automation', 'business growth', 'newsletter', 'content marketing']
  }
];

async function addGHLConfigs() {
  console.log('🔧 Adding GHL Social Media Configurations\n');
  console.log('='.repeat(60));
  
  let added = 0;
  let updated = 0;
  let errors = 0;
  
  for (const config of ghlConfigs) {
    // Skip if using placeholder values
    if (config.ghl_api_key.includes('YOUR_') || config.ghl_location_id.includes('YOUR_')) {
      console.log(`\n⏭️  Skipping ${config.profile_name} - placeholder values detected`);
      console.log(`   Please update the script with actual GHL credentials`);
      continue;
    }
    
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
          enabled: true,
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
          enabled: true
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
  
  if (added > 0 || updated > 0) {
    console.log('\n✅ GHL configurations ready!');
    console.log('\n📋 Next steps:');
    console.log('   1. Verify configs in Supabase dashboard');
    console.log('   2. Test with: node scripts/test-ghl-posting.js');
    console.log('   3. Enable auto_publish in agentic-content-gen requests');
  } else if (errors === 0) {
    console.log('\n⚠️  No configs added - all had placeholder values');
    console.log('   Please update the script with actual GHL credentials');
  }
}

addGHLConfigs().catch(console.error);
