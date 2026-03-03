/**
 * Enhanced URL Discovery - Multiple strategies
 * 
 * Uses multiple strategies to discover lender website URLs:
 * 1. Domain name generation (try common patterns)
 * 2. Email domain extraction
 * 3. Slug-based URL generation
 * 4. Organization lookup
 * 5. Article content search
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate potential domain names from lender name
 */
function generateDomainVariations(lenderName) {
  const variations = [];
  
  // Clean name
  const cleaned = lenderName
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
  
  // Remove common suffixes
  const withoutSuffix = cleaned
    .replace(/(mortgage|lending|financial|bank|credit|union|fcu|cu)$/i, '')
    .trim();
  
  // Generate variations
  variations.push(`${cleaned}.com`);
  variations.push(`${cleaned}.net`);
  variations.push(`${cleaned}.org`);
  
  if (withoutSuffix !== cleaned) {
    variations.push(`${withoutSuffix}.com`);
    variations.push(`${withoutSuffix}.net`);
    variations.push(`${withoutSuffix}.org`);
    variations.push(`${withoutSuffix}mortgage.com`);
    variations.push(`${withoutSuffix}lending.com`);
    variations.push(`${withoutSuffix}financial.com`);
  }
  
  // Add "www." prefix
  const withWww = variations.map(v => `www.${v}`);
  variations.push(...withWww);
  
  // Add "https://" prefix
  const withHttps = variations.map(v => `https://${v}`);
  variations.push(...withHttps);
  
  return [...new Set(variations)];
}

/**
 * Extract email domain and generate URL
 */
function extractEmailDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const match = email.match(/@([^\s<>"']+)/i);
  if (match) {
    const domain = match[1].toLowerCase();
    return `https://www.${domain}`;
  }
  return null;
}

/**
 * Generate URL from slug
 */
function generateUrlFromSlug(slug) {
  if (!slug) return null;
  return `https://www.${slug}.com`;
}

/**
 * Check if URL is accessible
 */
async function checkUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function enhancedUrlDiscovery() {
  console.log('🔍 Enhanced URL Discovery - Multiple Strategies\n');
  console.log('='.repeat(80));

  try {
    // Get lenders without URLs
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, slug, website_url, description, special_features, detailed_program_data, organization_id, article_id')
      .eq('site_id', 'rateroots')
      .is('website_url', null)
      .limit(50); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!lenders || lenders.length === 0) {
      console.log('No lenders without URLs found');
      return;
    }

    console.log(`\n📊 Analyzing ${lenders.length} lenders without URLs...\n`);

    const discovered = [];
    const notFound = [];

    for (const lender of lenders) {
      console.log(`\n🔍 Checking: ${lender.name}`);
      
      let foundUrl = null;
      let strategy = null;
      
      // Strategy 1: Check special_features for URLs
      if (lender.special_features) {
        const sf = typeof lender.special_features === 'string' 
          ? JSON.parse(lender.special_features) 
          : lender.special_features;
        
        if (sf?.website_info?.url) {
          foundUrl = sf.website_info.url;
          strategy = 'special_features';
        }
      }
      
      // Strategy 2: Extract from email in detailed_program_data
      if (!foundUrl && lender.detailed_program_data) {
        const dpd = typeof lender.detailed_program_data === 'string' 
          ? JSON.parse(lender.detailed_program_data) 
          : lender.detailed_program_data;
        
        // Search for email addresses
        const emailPattern = /[\w.-]+@[\w.-]+\.\w+/gi;
        const jsonString = JSON.stringify(dpd);
        const emails = jsonString.match(emailPattern);
        
        if (emails && emails.length > 0) {
          const emailUrl = extractEmailDomain(emails[0]);
          if (emailUrl) {
            console.log(`   📧 Found email domain: ${emailUrl}`);
            // Don't auto-set, just log for now
          }
        }
      }
      
      // Strategy 3: Generate domain variations
      if (!foundUrl) {
        const domainVariations = generateDomainVariations(lender.name);
        console.log(`   🌐 Generated ${domainVariations.length} domain variations`);
        
        // Test first few variations
        for (const domain of domainVariations.slice(0, 5)) {
          const url = domain.startsWith('http') ? domain : `https://${domain}`;
          console.log(`   ⏳ Testing: ${url}`);
          const isAccessible = await checkUrl(url);
          if (isAccessible) {
            foundUrl = url;
            strategy = 'domain_generation';
            console.log(`   ✅ Found accessible URL: ${url}`);
            break;
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Strategy 4: Use slug
      if (!foundUrl && lender.slug) {
        const slugUrl = generateUrlFromSlug(lender.slug);
        console.log(`   🔗 Testing slug URL: ${slugUrl}`);
        const isAccessible = await checkUrl(slugUrl);
        if (isAccessible) {
          foundUrl = slugUrl;
          strategy = 'slug_based';
          console.log(`   ✅ Found accessible URL: ${slugUrl}`);
        }
      }
      
      if (foundUrl) {
        discovered.push({
          lender,
          url: foundUrl,
          strategy
        });
        console.log(`   ✅ DISCOVERED: ${foundUrl} (via ${strategy})`);
      } else {
        notFound.push(lender);
        console.log(`   ❌ No URL found`);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 DISCOVERY SUMMARY:');
    console.log(`  URLs Discovered: ${discovered.length}`);
    console.log(`  Not Found: ${notFound.length}`);
    
    if (discovered.length > 0) {
      console.log(`\n✅ Discovered URLs:`);
      discovered.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.lender.name}`);
        console.log(`     URL: ${item.url}`);
        console.log(`     Strategy: ${item.strategy}`);
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

enhancedUrlDiscovery()
  .then(() => {
    console.log('\n✅ Discovery complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


