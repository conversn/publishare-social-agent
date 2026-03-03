#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 * 
 * Verifies that the Supabase connection is properly configured
 * and that the console has permissions to execute migrations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark(passed) {
  return passed ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
}

// Load environment variables
function loadEnvFile() {
  const scriptDir = __dirname;
  const projectRoot = path.resolve(scriptDir, '..');
  
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

// Configuration
const EXPECTED_PROJECT_REF = 'vpysqshhafthuxvokwqj';
const EXPECTED_PROJECT_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;

console.log('\n' + '='.repeat(70));
log('🔍 Supabase Setup Verification', 'cyan');
console.log('='.repeat(70) + '\n');

let allChecksPassed = true;

// Check 1: Supabase CLI Installation
log('1. Checking Supabase CLI installation...', 'blue');
try {
  const version = execSync('supabase --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
  log(`   ${checkmark(true)} Supabase CLI installed: ${version}`, 'green');
} catch (error) {
  log(`   ${checkmark(false)} Supabase CLI not found`, 'red');
  log('   Install with: npm install -g supabase', 'yellow');
  allChecksPassed = false;
}

// Check 2: Project Link Status
log('\n2. Checking project link status...', 'blue');
try {
  const projectRefPath = path.join(__dirname, '..', 'supabase', '.temp', 'project-ref');
  if (fs.existsSync(projectRefPath)) {
    const linkedRef = fs.readFileSync(projectRefPath, 'utf8').trim();
    if (linkedRef === EXPECTED_PROJECT_REF) {
      log(`   ${checkmark(true)} Project linked: ${linkedRef}`, 'green');
    } else {
      log(`   ${checkmark(false)} Wrong project linked: ${linkedRef}`, 'red');
      log(`   Expected: ${EXPECTED_PROJECT_REF}`, 'yellow');
      log('   Fix with: supabase link --project-ref vpysqshhafthuxvokwqj', 'yellow');
      allChecksPassed = false;
    }
  } else {
    log(`   ${checkmark(false)} Project not linked`, 'red');
    log('   Fix with: supabase link --project-ref vpysqshhafthuxvokwqj', 'yellow');
    allChecksPassed = false;
  }
} catch (error) {
  log(`   ${checkmark(false)} Could not check project link: ${error.message}`, 'red');
  allChecksPassed = false;
}

// Check 3: Environment Variables
log('\n3. Checking environment variables...', 'blue');
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': EXPECTED_PROJECT_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': null,
  'SUPABASE_SERVICE_ROLE_KEY': null,
};

let envVarsPassed = true;
for (const [varName, expectedValue] of Object.entries(requiredVars)) {
  const value = process.env[varName] || env[varName];
  if (value) {
    if (expectedValue && value !== expectedValue) {
      log(`   ${checkmark(false)} ${varName} = ${value.substring(0, 30)}... (expected ${expectedValue})`, 'red');
      envVarsPassed = false;
    } else {
      const displayValue = varName.includes('KEY') 
        ? `${value.substring(0, 20)}... (${value.length} chars)`
        : value;
      log(`   ${checkmark(true)} ${varName} = ${displayValue}`, 'green');
    }
  } else {
    log(`   ${checkmark(false)} ${varName} not set`, 'red');
    envVarsPassed = false;
  }
}

if (!envVarsPassed) {
  log('   Set variables in .env.local file', 'yellow');
  allChecksPassed = false;
}

// Check 4: Supabase Client Connection
async function testSupabaseConnection() {
  log('\n4. Testing Supabase connection...', 'blue');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      log(`   ${checkmark(false)} Missing credentials for connection test`, 'red');
      return false;
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test read permission
      const { data, error } = await supabase
        .from('articles')
        .select('id')
        .limit(1);
      
      if (error) {
        log(`   ${checkmark(false)} Connection failed: ${error.message}`, 'red');
        return false;
      } else {
        log(`   ${checkmark(true)} Connection successful`, 'green');
        log(`   ${checkmark(true)} Read permission verified`, 'green');
        return true;
      }
    }
  } catch (error) {
    log(`   ${checkmark(false)} Connection test failed: ${error.message}`, 'red');
    log('   Install dependencies: npm install @supabase/supabase-js', 'yellow');
    return false;
  }
}

// Check 5: Migration Files
log('\n5. Checking migration files...', 'blue');
try {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (migrations.length > 0) {
      log(`   ${checkmark(true)} Found ${migrations.length} migration files`, 'green');
      log(`   Latest: ${migrations[migrations.length - 1]}`, 'cyan');
    } else {
      log(`   ${checkmark(false)} No migration files found`, 'red');
      allChecksPassed = false;
    }
  } else {
    log(`   ${checkmark(false)} Migrations directory not found`, 'red');
    allChecksPassed = false;
  }
} catch (error) {
  log(`   ${checkmark(false)} Could not check migrations: ${error.message}`, 'red');
  allChecksPassed = false;
}

// Check 6: Supabase CLI Authentication (if available)
log('\n6. Checking Supabase CLI authentication...', 'blue');
try {
  execSync('supabase projects list', { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
  log(`   ${checkmark(true)} CLI authenticated`, 'green');
} catch (error) {
  log(`   ${checkmark(false)} CLI not authenticated or network issue`, 'yellow');
  log('   Run: supabase login', 'yellow');
  // Don't fail overall check for this - it's optional
}

// Main execution
(async () => {
  // Check 4: Supabase Client Connection (async)
  const connectionPassed = await testSupabaseConnection();
  if (!connectionPassed) {
    allChecksPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  if (allChecksPassed) {
    log('✅ All critical checks passed! Ready to execute migrations.', 'green');
    console.log('\nNext steps:');
    log('  1. Run: supabase db push', 'cyan');
    log('  2. Or execute migrations via SQL Editor', 'cyan');
    log('  3. Verify with: supabase migration list', 'cyan');
  } else {
    log('❌ Some checks failed. Please fix the issues above.', 'red');
    console.log('\nQuick fixes:');
    log('  1. Install CLI: npm install -g supabase', 'yellow');
    log('  2. Link project: supabase link --project-ref vpysqshhafthuxvokwqj', 'yellow');
    log('  3. Set .env.local with Supabase credentials', 'yellow');
    log('  4. Get keys from: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/settings/api', 'yellow');
  }
  console.log('='.repeat(70) + '\n');

  process.exit(allChecksPassed ? 0 : 1);
})();

