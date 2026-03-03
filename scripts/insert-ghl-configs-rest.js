/**
 * Insert GHL Configs via Supabase REST API
 * 
 * Uses direct HTTP requests to insert GHL configurations
 */

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

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
    
    // Check if config exists
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/ghl_social_config?site_id=eq.${config.site_id}&profile_name=eq.${encodeURIComponent(config.profile_name)}&select=id`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const existing = await checkResponse.json();
    const exists = existing && existing.length > 0;
    
    if (exists) {
      console.log('   🔄 Updating existing config...');
      
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/ghl_social_config?site_id=eq.${config.site_id}&profile_name=eq.${encodeURIComponent(config.profile_name)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
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
        }
      );
      
      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        console.error(`   ❌ Update failed: ${error}`);
        errors++;
      } else {
        console.log(`   ✅ Config updated`);
        updated++;
      }
    } else {
      console.log('   ➕ Creating new config...');
      
      const insertResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/ghl_social_config`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(config)
        }
      );
      
      if (!insertResponse.ok) {
        const error = await insertResponse.text();
        console.error(`   ❌ Insert failed: ${error}`);
        errors++;
      } else {
        const data = await insertResponse.json();
        console.log(`   ✅ Config created (ID: ${data[0]?.id || 'N/A'})`);
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
  const verifyResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/ghl_social_config?select=site_id,profile_name,enabled,platforms,auto_post&order=site_id.asc`,
    {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (verifyResponse.ok) {
    const allConfigs = await verifyResponse.json();
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


