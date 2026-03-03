#!/usr/bin/env node

/**
 * Execute SQL Script via Supabase Management API
 * Uses service role key to execute SQL through Supabase API
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
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  env.SUPABASE_SERVICE_ROLE_KEY ||
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

// Read SQL file
const sqlPath = path.join(__dirname, 'optimize-database-for-users.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('🔧 Executing Database Optimization via Supabase API\n');
console.log('='.repeat(70));
console.log('📄 SQL script loaded');
console.log('   File:', sqlPath);
console.log('   Size:', sql.length, 'characters\n');

// Supabase doesn't have a direct SQL execution endpoint via REST API
// We need to use the PostgREST API's rpc function or execute via a stored procedure
// However, DDL statements cannot be executed via REST API

// Alternative: Use Supabase's REST API to execute SQL via a function
// But this requires creating a function first, which defeats the purpose

// Best approach: Use the Supabase Management API
// However, this requires authentication via the Management API token

console.log('⚠️  Supabase REST API cannot execute DDL statements directly');
console.log('   (ALTER TABLE, CREATE TABLE, etc. require direct database access)\n');
console.log('📋 Recommended approach:\n');
console.log('   1. Use Supabase SQL Editor (easiest):');
console.log('      https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql\n');
console.log('   2. Or use Supabase CLI migrations:');
console.log('      supabase migration new optimize_database_for_users');
console.log('      # Copy SQL to migration file');
console.log('      supabase db push\n');
console.log('   3. Or use direct database connection (requires DB password):');
console.log('      Set SUPABASE_DB_PASSWORD in .env');
console.log('      Run: node scripts/execute-sql-direct.js\n');

// Try to use Supabase's REST API to at least verify the connection
console.log('🔍 Verifying Supabase connection...\n');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyConnection() {
  try {
    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`   ⚠️  Connection test: ${error.message}`);
    } else {
      console.log('   ✅ Supabase connection verified');
      console.log(`   📊 Found ${data?.length || 0} sample articles\n`);
    }
    
    console.log('='.repeat(70));
    console.log('📝 To execute the SQL script:\n');
    console.log('   Option 1: Supabase SQL Editor (Recommended)');
    console.log('   ──────────────────────────────────────────');
    console.log('   1. Open: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql');
    console.log('   2. Copy the SQL from: scripts/optimize-database-for-users.sql');
    console.log('   3. Paste into SQL Editor');
    console.log('   4. Click "Run"\n');
    
    console.log('   Option 2: Direct Database Connection');
    console.log('   ───────────────────────────────────');
    console.log('   1. Get database password from:');
    console.log('      https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/database');
    console.log('   2. Add to .env: SUPABASE_DB_PASSWORD=your_password');
    console.log('   3. Run: node scripts/execute-sql-direct.js\n');
    
    console.log('   Option 3: Supabase CLI Migrations');
    console.log('   ─────────────────────────────────');
    console.log('   1. supabase migration new optimize_database_for_users');
    console.log('   2. Copy SQL to the new migration file');
    console.log('   3. supabase db push\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyConnection()
  .then(() => {
    console.log('='.repeat(70));
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

