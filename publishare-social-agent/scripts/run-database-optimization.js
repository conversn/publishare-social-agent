/**
 * Run Database Optimization Script
 * 
 * Executes the SQL optimization script in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  const scriptDir = __dirname;
  const publishareDir = path.dirname(path.dirname(scriptDir));
  const projectRoot = path.resolve(publishareDir, '../../..');
  
  const possiblePaths = [
    path.join(projectRoot, '.env'),
    path.join(__dirname, '../../../../.env'),
    path.join(process.cwd(), '.env')
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

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  env.SUPABASE_SERVICE_ROLE_KEY ||
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runOptimization() {
  try {
    console.log('🔧 Running Database Optimization for Multi-User Support\n');
    console.log('='.repeat(70));
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'optimize-database-for-users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL script loaded');
    console.log('   File:', sqlPath);
    console.log('   Size:', sql.length, 'characters\n');
    
    console.log('⚠️  IMPORTANT: This script must be run in Supabase SQL Editor');
    console.log('   The Supabase JS client cannot execute DDL statements directly.\n');
    console.log('📋 Instructions:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql');
    console.log('   2. Copy the contents of: scripts/optimize-database-for-users.sql');
    console.log('   3. Paste into SQL Editor');
    console.log('   4. Click "Run"\n');
    
    // Verify current state
    console.log('🔍 Verifying current database state...\n');
    
    // Note: Cannot execute DDL via Supabase client - must use SQL Editor
    console.log('   ⚠️  Schema verification requires SQL Editor (DDL not available via API)');
    
    // Check articles count
    const { count: articleCount, error: countError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`   📊 Current articles in database: ${articleCount || 0}`);
    }
    
    // Check if user_id relationship works
    const { data: testArticles, error: testError } = await supabase
      .from('articles')
      .select('id, title, user_id')
      .limit(1);
    
    if (testError) {
      console.log(`   ❌ Error querying articles: ${testError.message}`);
      if (testError.message.includes('relationship')) {
        console.log('   ⚠️  This confirms the relationship issue!');
      }
    } else {
      console.log(`   ✅ Can query articles (found ${testArticles?.length || 0} sample)`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📝 Next Steps:\n');
    console.log('   1. Open Supabase SQL Editor:');
    console.log('      https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql\n');
    console.log('   2. Copy SQL from: scripts/optimize-database-for-users.sql\n');
    console.log('   3. Paste and run the SQL script\n');
    console.log('   4. After running, refresh your application\n');
    console.log('   5. Test the articles page again\n');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runOptimization()
  .then(() => {
    console.log('\n✅ Verification complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

