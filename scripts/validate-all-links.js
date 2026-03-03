/**
 * Script to validate all internal links across all articles
 * Can be run manually or scheduled via cron
 * 
 * Usage:
 *   node scripts/validate-all-links.js [--site <site_id>] [--repair]
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function validateAllLinks(siteId = null, repair = false) {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  console.log('🔗 Starting link validation...\n');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/link-validator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          site_id: siteId || undefined,
          validate_all: !siteId,
          repair: repair
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Validation failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    console.log('✅ Validation Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Articles validated: ${data.validated}`);
    console.log(`   Links checked: ${data.links_checked}`);
    console.log(`   Broken links: ${data.broken_links}`);
    if (repair) {
      console.log(`   Links repaired: ${data.repaired}`);
    }

    if (data.broken_links > 0) {
      console.log(`\n⚠️  Broken Links Found:\n`);
      data.results.forEach(result => {
        console.log(`   Article: ${result.article_title}`);
        result.broken_links.forEach(link => {
          console.log(`     - ${link.url} (${link.text}): ${link.error}`);
        });
      });

      if (!repair) {
        console.log(`\n💡 Tip: Run with --repair flag to automatically fix broken links`);
      }
    } else {
      console.log(`\n✨ All links are valid!`);
    }

    return data;

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let siteId = null;
let repair = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--site' && args[i + 1]) {
    siteId = args[i + 1];
    i++;
  } else if (args[i] === '--repair') {
    repair = true;
  }
}

validateAllLinks(siteId, repair);




