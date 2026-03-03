/**
 * Batch Job Script: Populate Local Facts
 * 
 * Populates local_facts table for multiple cities/verticals in batch mode.
 * 
 * Usage:
 *   node populate-local-facts-batch.js --cities "Tampa,FL;Miami,FL;Orlando,FL" --verticals "hvac,plumbing"
 *   node populate-local-facts-batch.js --file cities.json
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for authentication
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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
      console.log(`📄 Loaded environment from: ${envFilePath}`);
      break;
    } catch (e) {
      // File doesn't exist, continue
    }
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

// Load .env file
loadEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const citiesArg = args.find(arg => arg.startsWith('--cities='))?.split('=')[1];
const verticalsArg = args.find(arg => arg.startsWith('--verticals='))?.split('=')[1];
const fileArg = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
const maxConcurrent = parseInt(args.find(arg => arg.startsWith('--max-concurrent='))?.split('=')[1] || '3');
const updateExisting = !args.includes('--no-update');
const dryRun = args.includes('--dry-run');

/**
 * Parse cities string: "Tampa,FL;Miami,FL" -> [{city: "Tampa", state: "FL"}, ...]
 */
function parseCities(citiesString) {
  return citiesString.split(';').map(cityState => {
    const [city, state] = cityState.split(',').map(s => s.trim());
    if (!city || !state) {
      throw new Error(`Invalid city format: ${cityState}. Expected "City,State"`);
    }
    return { city, state };
  });
}

/**
 * Parse verticals string: "hvac,plumbing" -> ["hvac", "plumbing"]
 */
function parseVerticals(verticalsString) {
  return verticalsString.split(',').map(v => v.trim());
}

/**
 * Generate batch array from cities and verticals
 */
function generateBatch(cities, verticals) {
  const batch = [];
  for (const city of cities) {
    for (const vertical of verticals) {
      batch.push({
        city: city.city,
        state: city.state,
        vertical: vertical
      });
    }
  }
  return batch;
}

/**
 * Load batch from JSON file
 */
function loadBatchFromFile(filePath) {
  const fs = require('fs');
  const path = require('path');
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const data = JSON.parse(content);
  
  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of {city, state, vertical} objects');
  }
  
  return data;
}

/**
 * Call populate-local-facts function
 */
async function populateLocalFacts(batch, maxConcurrent, updateExisting, dryRun) {
  const url = `${SUPABASE_URL}/functions/v1/populate-local-facts`;
  
  console.log(`🚀 Calling populate-local-facts with ${batch.length} city/vertical combinations`);
  console.log(`   Max concurrent: ${maxConcurrent}`);
  console.log(`   Update existing: ${updateExisting}`);
  console.log(`   Dry run: ${dryRun}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      batch: batch,
      max_concurrent: maxConcurrent,
      update_existing: updateExisting,
      dry_run: dryRun
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Function call failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Main execution
async function main() {
  try {
    let batch = [];

    // Load batch from file or generate from arguments
    if (fileArg) {
      console.log(`📄 Loading batch from file: ${fileArg}`);
      batch = loadBatchFromFile(fileArg);
    } else if (citiesArg && verticalsArg) {
      console.log(`📋 Generating batch from arguments`);
      const cities = parseCities(citiesArg);
      const verticals = parseVerticals(verticalsArg);
      batch = generateBatch(cities, verticals);
    } else {
      console.error('❌ Either --cities and --verticals, or --file must be provided');
      console.error('\nUsage:');
      console.error('  node populate-local-facts-batch.js --cities "Tampa,FL;Miami,FL" --verticals "hvac,plumbing"');
      console.error('  node populate-local-facts-batch.js --file cities.json');
      console.error('\nOptions:');
      console.error('  --cities="City1,State1;City2,State2"  Comma-separated cities, semicolon-separated');
      console.error('  --verticals="hvac,plumbing"            Comma-separated verticals');
      console.error('  --file=path/to/batch.json             JSON file with batch array');
      console.error('  --max-concurrent=3                     Max concurrent AI requests (default: 3)');
      console.error('  --no-update                            Skip updating existing facts');
      console.error('  --dry-run                              Dry run (no database changes)');
      process.exit(1);
    }

    console.log(`\n📦 Batch size: ${batch.length} combinations`);
    console.log(`   Cities: ${new Set(batch.map(b => `${b.city}, ${b.state}`)).size}`);
    console.log(`   Verticals: ${new Set(batch.map(b => b.vertical)).size}`);
    console.log('');

    // Call the function
    const result = await populateLocalFacts(batch, maxConcurrent, updateExisting, dryRun);

    // Display results
    console.log('\n✅ Batch job complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Facts added: ${result.facts_added}`);
    console.log(`   Facts updated: ${result.facts_updated}`);
    console.log(`   Facts skipped: ${result.facts_skipped}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.batch_results && result.batch_results.length > 0) {
      console.log(`\n📋 Per-city results:`);
      for (const cityResult of result.batch_results) {
        const status = cityResult.status === 'success' ? '✅' : '❌';
        console.log(`   ${status} ${cityResult.city}, ${cityResult.state} - ${cityResult.vertical}: ${cityResult.facts_added} added, ${cityResult.facts_updated} updated`);
        if (cityResult.error) {
          console.log(`      Error: ${cityResult.error}`);
        }
      }
    }

    if (result.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Batch job failed:', error.message);
    process.exit(1);
  }
}

main();

