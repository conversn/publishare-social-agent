#!/usr/bin/env node

/**
 * Execute SQL Script Directly via Database Connection
 * Uses Supabase service role key to connect directly to PostgreSQL
 */

const fs = require('fs');
const path = require('path');

// Try to load pg library
let pg;
try {
  pg = require('pg');
} catch (e) {
  console.error('❌ pg library not found. Installing...');
  console.error('   Run: npm install pg');
  process.exit(1);
}

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

// Supabase connection details
const SUPABASE_PROJECT_REF = 'vpysqshhafthuxvokwqj';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                  env.SUPABASE_SERVICE_ROLE_KEY ||
                                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

// Construct database connection string
// Format: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres
// For Supabase, we need to get the database password from the service role key
// However, Supabase doesn't expose the password directly in the service role key
// We need to use the connection pooler or direct connection

// Supabase direct connection (port 5432) or connection pooler (port 6543)
// We'll use the connection pooler which is more reliable
const DB_HOST = `${SUPABASE_PROJECT_REF}.supabase.co`;
const DB_PORT = 6543; // Connection pooler port
const DB_NAME = 'postgres';
const DB_USER = 'postgres';

// For Supabase, we need the database password
// This is typically found in: Dashboard → Settings → Database → Connection string
// Or we can use the connection pooler with the service role key
// Actually, Supabase uses a different auth method for direct connections

console.log('🔧 Executing Database Optimization Script\n');
console.log('='.repeat(70));

// Check if we have database password
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ SUPABASE_DB_PASSWORD not found');
  console.error('\n📋 To get your database password:');
  console.error('   1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/database');
  console.error('   2. Find "Connection string" section');
  console.error('   3. Copy the password from the connection string');
  console.error('   4. Set SUPABASE_DB_PASSWORD in your .env file\n');
  console.error('   Or run the SQL script manually in Supabase SQL Editor:');
  console.error('   https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql\n');
  process.exit(1);
}

// Read SQL file
const sqlPath = path.join(__dirname, 'optimize-database-for-users.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('📄 SQL script loaded');
console.log('   File:', sqlPath);
console.log('   Size:', sql.length, 'characters\n');

// Create connection
const client = new pg.Client({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function executeSQL() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');
    
    console.log('⚙️  Executing SQL script...\n');
    
    // Split SQL into individual statements
    // PostgreSQL doesn't support executing multiple statements in one call easily
    // We'll use a transaction and execute statement by statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements to execute\n`);
    
    await client.query('BEGIN');
    
    let executed = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        // Execute statement
        const result = await client.query(statement);
        executed++;
        
        // Show progress
        if (executed % 10 === 0) {
          process.stdout.write(`   Executed ${executed}/${statements.length} statements...\r`);
        }
      } catch (err) {
        // Some statements might fail (like IF NOT EXISTS), which is okay
        if (!err.message.includes('already exists') && 
            !err.message.includes('does not exist')) {
          console.error(`\n   ⚠️  Warning on statement ${i + 1}: ${err.message}`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully executed ${executed} SQL statements\n`);
    console.log('='.repeat(70));
    console.log('✅ Database optimization completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Refresh your application');
    console.log('   2. Test the articles page');
    console.log('   3. Verify user relationships work correctly\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error executing SQL:', error.message);
    console.error('\n💡 Tip: If connection fails, you may need to:');
    console.error('   1. Get the database password from Supabase dashboard');
    console.error('   2. Or run the SQL script manually in SQL Editor');
    console.error('      https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/sql\n');
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed\n');
  }
}

executeSQL()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

