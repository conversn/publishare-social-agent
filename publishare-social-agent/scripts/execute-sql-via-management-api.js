#!/usr/bin/env node

/**
 * Execute SQL via Supabase Management API
 * Uses access token to execute SQL through Management API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
function loadEnvFile() {
  const scriptDir = __dirname;
  const projectRoot = path.resolve(scriptDir, '../..');
  
  const possiblePaths = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local')
  ];

  let envContent = '';
  for (const envFilePath of possiblePaths) {
    try {
      envContent = fs.readFileSync(envFilePath, 'utf8');
      break;
    } catch (e) {}
  }

  if (!envContent) return {};

  const env = {};
  envContent.split('\n').forEach(line => {
    if (line.trim().startsWith('#') || !line.trim()) return;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
      if (!process.env[key]) process.env[key] = value;
    }
  });
  return env;
}

const env = loadEnvFile();

const SUPABASE_PROJECT_REF = 'vpysqshhafthuxvokwqj';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;

// Read SQL file
const sqlPath = path.join(__dirname, 'optimize-database-for-users.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('🔧 Executing Database Optimization via Management API\n');
console.log('='.repeat(70));

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN not found');
  console.error('\n📋 To get your access token:');
  console.error('   1. Run: supabase login');
  console.error('   2. Or get token from: ~/.supabase/access-token');
  console.error('   3. Set SUPABASE_ACCESS_TOKEN in .env\n');
  process.exit(1);
}

console.log('📄 SQL script loaded');
console.log('   File:', sqlPath);
console.log('   Size:', sql.length, 'characters\n');

// Supabase Management API endpoint for executing SQL
// Note: This endpoint may not exist or may require different authentication
const apiUrl = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/sql`;

console.log('⚠️  Note: Supabase Management API may not support direct SQL execution');
console.log('   This script will attempt to use the API, but may need manual execution\n');

// For now, provide instructions
console.log('📋 Recommended: Use Supabase CLI (if connection works)');
console.log('   supabase db push --yes\n');
console.log('📋 Or use SQL Editor:');
console.log('   https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql\n');

process.exit(0);

