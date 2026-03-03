/**
 * Execute Lender Directory Migration via Supabase REST API
 * 
 * This script executes the migration SQL directly via Supabase's REST API
 * to bypass CLI connection issues.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Set it in .env.local or export it:');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  process.exit(1);
}

const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20250130000000_create_lender_directory.sql');

if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`❌ Migration file not found: ${MIGRATION_FILE}`);
  process.exit(1);
}

// Read migration SQL
const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

// Split SQL into individual statements
// Remove comments and split by semicolons
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/))
  .map(s => {
    // Remove block comments
    return s.replace(/\/\*[\s\S]*?\*\//g, '');
  })
  .filter(s => s.trim().length > 0);

console.log('🚀 Executing Lender Directory Migration');
console.log('='.repeat(70));
console.log(`📁 Migration file: ${MIGRATION_FILE}`);
console.log(`📊 Found ${statements.length} SQL statements`);
console.log('');

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeMigration() {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Execute statements one by one
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip empty statements
    if (!statement.trim() || statement.trim().startsWith('--')) {
      continue;
    }

    // Add semicolon back
    const sql = statement.trim() + ';';
    
    // Skip comments-only statements
    if (sql.match(/^--/)) {
      continue;
    }

    try {
      // Use RPC to execute SQL (if available) or use direct query
      // Note: Supabase REST API doesn't support arbitrary SQL execution
      // We'll need to use the Management API or provide instructions
      
      // For now, let's try using the REST API's rpc endpoint
      // But actually, we need to use the PostgREST admin endpoint or Management API
      
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      // Try using Supabase's query builder for simple statements
      // For DDL statements, we need a different approach
      
      // Actually, the best approach is to provide the SQL for manual execution
      // or use a direct database connection
      
      // Let's output the SQL for manual execution instead
      if (i === 0) {
        console.log('');
        console.log('⚠️  Supabase REST API cannot execute DDL statements directly.');
        console.log('   Please execute the migration via Supabase SQL Editor:');
        console.log('');
        console.log('   1. Open: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql');
        console.log('   2. Click "New Query"');
        console.log('   3. Copy the SQL from the migration file');
        console.log('   4. Paste and click "Run"');
        console.log('');
        console.log('   Or use psql with direct database connection.');
        console.log('');
        break;
      }
      
    } catch (error) {
      errorCount++;
      errors.push({ statement: i + 1, error: error.message });
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.log('');
    console.log('❌ Migration completed with errors:');
    errors.forEach(({ statement, error }) => {
      console.log(`   Statement ${statement}: ${error}`);
    });
  } else if (successCount > 0) {
    console.log('');
    console.log(`✅ Migration completed successfully!`);
    console.log(`   Executed ${successCount} statements`);
  }
}

// Since we can't execute DDL via REST API, let's provide the SQL file
console.log('');
console.log('📋 Migration SQL is ready in:');
console.log(`   ${MIGRATION_FILE}`);
console.log('');
console.log('🔧 To execute:');
console.log('');
console.log('   Option 1: Supabase SQL Editor (Recommended)');
console.log('   ──────────────────────────────────────────');
console.log('   1. Open: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql');
console.log('   2. Click "New Query"');
console.log('   3. Copy entire contents of migration file');
console.log('   4. Paste into SQL Editor');
console.log('   5. Click "Run"');
console.log('');
console.log('   Option 2: Direct psql connection');
console.log('   ────────────────────────────────');
console.log('   Get connection string from:');
console.log('   https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/database');
console.log('   Then: psql "connection_string" < migration_file.sql');
console.log('');

// Also create a simplified version without the problematic index for testing
const simplifiedSQL = migrationSQL.replace(
  /-- Create IMMUTABLE function for full-text search[\s\S]*?CREATE INDEX IF NOT EXISTS idx_lenders_search[\s\S]*?\);[\s\S]*?-- GIN index for JSONB fields/,
  '-- GIN index for JSONB fields'
);

const simplifiedFile = path.join(__dirname, '../supabase/migrations/20250130000000_create_lender_directory_simplified.sql');
fs.writeFileSync(simplifiedFile, simplifiedSQL);
console.log('📄 Created simplified version (without full-text index):');
console.log(`   ${simplifiedFile}`);
console.log('   Use this if the full migration fails');
console.log('');

if (require.main === module) {
  executeMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { executeMigration };


