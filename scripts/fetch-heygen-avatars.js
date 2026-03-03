#!/usr/bin/env node

/**
 * Script to fetch HeyGen avatar configurations from Publishare CMS
 * Usage: node scripts/fetch-heygen-avatars.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase key!');
  console.error('   Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchHeyGenAvatars() {
  console.log('🔍 Fetching HeyGen avatar configurations from Publishare CMS...\n');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

  try {
    // Query all avatar configurations
    const { data, error } = await supabase
      .from('heygen_avatar_config')
      .select('*')
      .order('site_id', { ascending: true });

    if (error) {
      console.error('❌ Error fetching avatars:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('⚠️  No avatar configurations found in the database.');
      return;
    }

    console.log(`✅ Found ${data.length} avatar configuration(s):\n`);
    console.log('='.repeat(80));

    // Display each avatar configuration
    data.forEach((avatar, index) => {
      console.log(`\n📸 Avatar Configuration #${index + 1}`);
      console.log('-'.repeat(80));
      console.log(`Site ID:        ${avatar.site_id}`);
      console.log(`Avatar ID:      ${avatar.avatar_id}`);
      console.log(`Avatar Name:    ${avatar.avatar_name || 'N/A'}`);
      console.log(`Avatar Type:    ${avatar.avatar_type || 'N/A'}`);
      console.log(`Preview Image:  ${avatar.preview_image_url || 'N/A'}`);
      console.log(`Voice ID:       ${avatar.voice_id || 'N/A'}`);
      console.log(`Voice Name:     ${avatar.voice_name || 'N/A'}`);
      console.log(`Voice Provider: ${avatar.voice_provider || 'N/A'}`);
      console.log(`Training Status: ${avatar.training_status || 'N/A'}`);
      console.log(`Training Job ID: ${avatar.training_job_id || 'N/A'}`);
      console.log(`Is Active:      ${avatar.is_active ? '✅ Yes' : '❌ No'}`);
      console.log(`Notes:          ${avatar.notes || 'N/A'}`);
      console.log(`Created:        ${avatar.created_at || 'N/A'}`);
      console.log(`Updated:        ${avatar.updated_at || 'N/A'}`);
      
      // Display persona_profile if it exists (JSONB field)
      if (avatar.persona_profile) {
        console.log(`\n👤 Persona Profile:`);
        console.log(JSON.stringify(avatar.persona_profile, null, 2));
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Successfully retrieved ${data.length} avatar configuration(s).`);

    // Export as JSON if requested
    if (process.argv.includes('--json')) {
      const fs = require('fs');
      const outputFile = 'heygen-avatars-export.json';
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`\n💾 Exported to ${outputFile}`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Run the script
fetchHeyGenAvatars();

