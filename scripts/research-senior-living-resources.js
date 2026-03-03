/**
 * Script to research senior living resources from Caring.com and A Place for Mom
 * and generate article ideas for SeniorSimple.org
 * 
 * Usage:
 *   node scripts/research-senior-living-resources.js [options]
 * 
 * Options:
 *   --source <source>        Source to crawl: "caring.com", "aplaceformom.com", or "both" (default: "both")
 *   --type <type>           Resource type: "assisted-living", "memory-care", "all" (default: "all")
 *   --state <state>          State filter: "CA", "NY", etc. (optional)
 *   --max <number>           Max resources to crawl (default: 50)
 *   --dry-run                Test without storing data
 *   --generate-articles      Generate article ideas after crawling
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  source: 'both',
  type: 'all',
  state: null,
  max: 50,
  dryRun: false,
  generateArticles: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--source' && args[i + 1]) {
    options.source = args[i + 1];
    i++;
  } else if (arg === '--type' && args[i + 1]) {
    options.type = args[i + 1];
    i++;
  } else if (arg === '--state' && args[i + 1]) {
    options.state = args[i + 1];
    i++;
  } else if (arg === '--max' && args[i + 1]) {
    options.max = parseInt(args[i + 1]);
    i++;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--generate-articles') {
    options.generateArticles = true;
  }
}

async function crawlResources() {
  console.log('🔍 Starting Senior Living Resource Research...\n');
  console.log('Options:', options);
  console.log('');
  
  try {
    // Call senior-resource-crawler edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/senior-resource-crawler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        source: options.source,
        resource_type: options.type,
        state: options.state,
        max_resources: options.max,
        update_existing: true,
        dry_run: options.dryRun,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('📊 Crawl Results:');
    console.log(`   Crawled: ${result.crawled}`);
    console.log(`   Stored: ${result.stored}`);
    console.log(`   Updated: ${result.updated}`);
    console.log(`   Errors: ${result.errors}`);
    console.log('');
    
    if (result.results && result.results.length > 0) {
      console.log('📋 Sample Results:');
      result.results.slice(0, 10).forEach((r: any) => {
        const statusIcon = r.status === 'success' ? '✅' : r.status === 'error' ? '❌' : '⏭️';
        console.log(`   ${statusIcon} ${r.resource_name} (${r.resource_type})${r.location ? ` - ${r.location}` : ''}`);
      });
      if (result.results.length > 10) {
        console.log(`   ... and ${result.results.length - 10} more`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error crawling resources:', error);
    throw error;
  }
}

async function generateArticleIdeas() {
  console.log('\n📝 Generating Article Ideas...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/senior-resource-article-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        site_id: 'seniorsimple',
        create_strategy_entries: true,
        priority_level: 'all',
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('📚 Article Ideas Generated:');
    console.log(`   Resources Analyzed: ${result.resources_analyzed}`);
    console.log(`   Article Ideas: ${result.article_ideas_generated}`);
    console.log(`   Strategy Entries Created: ${result.strategy_entries_created}`);
    console.log('');
    
    if (result.recommendations) {
      console.log('🎯 Recommendations:');
      console.log(`   Pillar Pages: ${result.recommendations.pillar_pages.length}`);
      console.log(`   Comparison Articles: ${result.recommendations.comparison_articles.length}`);
      console.log(`   Location Guides: ${result.recommendations.location_guides.length}`);
      console.log(`   Cost Guides: ${result.recommendations.cost_guides.length}`);
      console.log(`   Decision Guides: ${result.recommendations.decision_guides.length}`);
      console.log('');
      
      console.log('📄 Top Priority Articles:');
      const topArticles = [
        ...result.recommendations.pillar_pages.filter((a: any) => a.priority === 'Critical'),
        ...result.recommendations.comparison_articles.filter((a: any) => a.priority === 'Critical'),
        ...result.recommendations.cost_guides.filter((a: any) => a.priority === 'Critical'),
      ].slice(0, 10);
      
      topArticles.forEach((article: any, index: number) => {
        console.log(`   ${index + 1}. ${article.title}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error generating article ideas:', error);
    throw error;
  }
}

async function main() {
  try {
    // Step 1: Crawl resources
    const crawlResult = await crawlResources();
    
    // Step 2: Generate article ideas (if requested)
    if (options.generateArticles) {
      await generateArticleIdeas();
    }
    
    console.log('\n✅ Research Complete!');
    console.log('\nNext Steps:');
    console.log('1. Review resources in senior_resources table');
    console.log('2. Review article ideas in content_strategy table');
    console.log('3. Use batch-strategy-processor to generate articles');
    
  } catch (error) {
    console.error('\n❌ Research Failed:', error);
    process.exit(1);
  }
}

main();





