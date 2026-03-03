#!/usr/bin/env node

/**
 * Script to fetch HeyGen avatar configurations from Publishare CMS
 * Uses Supabase REST API directly
 * Usage: node scripts/fetch-heygen-avatars.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value.trim();
        }
      }
    });
    
    return envVars;
  } catch (err) {
    console.warn('⚠️  Could not load .env.local, using defaults');
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
// Prefer service role key to bypass RLS, fallback to anon key
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing Supabase key!');
  console.error('   Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

async function fetchHeyGenAvatars() {
  console.log('🔍 Fetching HeyGen avatar configurations from Publishare CMS...\n');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}\n`);

  try {
    // Query all avatar configurations using Supabase REST API
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/heygen_avatar_config?select=*&order=site_id.asc`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error fetching avatars:', response.status, response.statusText);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const data = await response.json();

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
      const { writeFileSync } = await import('fs');
      const outputFile = 'heygen-avatars-export.json';
      writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`\n💾 Exported to ${outputFile}`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Run the script
fetchHeyGenAvatars();

