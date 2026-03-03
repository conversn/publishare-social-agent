/**
 * Find URLs in Database - Comprehensive search
 * 
 * Searches all possible fields in the database for website URLs
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

// URL regex pattern
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function extractUrls(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(URL_PATTERN);
  return matches || [];
}

function extractUrlsFromJsonb(obj, path = '') {
  const urls = [];
  if (!obj) return urls;
  
  if (typeof obj === 'string') {
    const found = extractUrls(obj);
    found.forEach(url => urls.push({ url, source: path }));
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      urls.push(...extractUrlsFromJsonb(item, `${path}[${i}]`));
    });
  } else if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const newPath = path ? `${path}.${key}` : key;
      urls.push(...extractUrlsFromJsonb(value, newPath));
    });
  }
  
  return urls;
}

async function findUrlsInDatabase() {
  console.log('🔍 Searching database for URLs in all fields...\n');
  console.log('='.repeat(80));

  try {
    // Get all lenders with all their data
    const { data: allLenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, website_url, description, internal_notes, special_features, detailed_program_data, program_specifics, article_id, organization_id')
      .eq('site_id', 'rateroots');

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!allLenders || allLenders.length === 0) {
      console.log('No lenders found');
      return;
    }

    console.log(`\n📊 Analyzing ${allLenders.length} lenders...\n`);

    const lendersWithUrls = [];
    const lendersWithoutUrls = [];

    for (const lender of allLenders) {
      const foundUrls = [];
      
      // Check website_url column
      if (lender.website_url && lender.website_url.trim() !== '') {
        foundUrls.push({
          url: lender.website_url,
          source: 'website_url column',
          field: 'website_url'
        });
      }
      
      // Check description
      if (lender.description) {
        const urls = extractUrls(lender.description);
        urls.forEach(url => {
          foundUrls.push({ url, source: 'description', field: 'description' });
        });
      }
      
      // Check internal_notes (could be string or JSONB)
      if (lender.internal_notes) {
        if (typeof lender.internal_notes === 'string') {
          try {
            const parsed = JSON.parse(lender.internal_notes);
            const urls = extractUrlsFromJsonb(parsed, 'internal_notes');
            foundUrls.push(...urls);
          } catch (e) {
            // Not JSON, treat as string
            const urls = extractUrls(lender.internal_notes);
            urls.forEach(url => {
              foundUrls.push({ url, source: 'internal_notes (string)', field: 'internal_notes' });
            });
          }
        } else {
          const urls = extractUrlsFromJsonb(lender.internal_notes, 'internal_notes');
          foundUrls.push(...urls);
        }
      }
      
      // Check special_features (JSONB)
      if (lender.special_features) {
        const sf = typeof lender.special_features === 'string' 
          ? JSON.parse(lender.special_features) 
          : lender.special_features;
        const urls = extractUrlsFromJsonb(sf, 'special_features');
        foundUrls.push(...urls);
      }
      
      // Check detailed_program_data (JSONB)
      if (lender.detailed_program_data) {
        const dpd = typeof lender.detailed_program_data === 'string' 
          ? JSON.parse(lender.detailed_program_data) 
          : lender.detailed_program_data;
        const urls = extractUrlsFromJsonb(dpd, 'detailed_program_data');
        foundUrls.push(...urls);
      }
      
      // Check program_specifics (JSONB)
      if (lender.program_specifics) {
        const ps = typeof lender.program_specifics === 'string' 
          ? JSON.parse(lender.program_specifics) 
          : lender.program_specifics;
        const urls = extractUrlsFromJsonb(ps, 'program_specifics');
        foundUrls.push(...urls);
      }
      
      // Deduplicate URLs
      const uniqueUrls = [];
      const seen = new Set();
      foundUrls.forEach(item => {
        const normalized = item.url.toLowerCase().replace(/\/$/, '');
        if (!seen.has(normalized) && !normalized.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) {
          seen.add(normalized);
          uniqueUrls.push(item);
        }
      });
      
      if (uniqueUrls.length > 0) {
        lendersWithUrls.push({
          lender,
          urls: uniqueUrls
        });
      } else {
        lendersWithoutUrls.push(lender);
      }
    }

    console.log(`📈 Summary:`);
    console.log(`  Lenders with URLs found: ${lendersWithUrls.length}`);
    console.log(`  Lenders without URLs: ${lendersWithoutUrls.length}`);
    console.log(`  Total URLs found: ${lendersWithUrls.reduce((sum, l) => sum + l.urls.length, 0)}`);

    // Show lenders with URLs in other fields but not in website_url
    const lendersNeedingSync = lendersWithUrls.filter(l => {
      const hasWebsiteUrl = l.urls.some(u => u.field === 'website_url');
      return !hasWebsiteUrl && l.lender.website_url === null;
    });

    console.log(`\n🔗 Lenders with URLs in other fields (need sync): ${lendersNeedingSync.length}\n`);

    if (lendersNeedingSync.length > 0) {
      console.log('📋 Sample of lenders with URLs in other fields:');
      lendersNeedingSync.slice(0, 20).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.lender.name}`);
        item.urls.forEach(urlItem => {
          console.log(`   - ${urlItem.url}`);
          console.log(`     Source: ${urlItem.source}`);
        });
      });
      
      if (lendersNeedingSync.length > 20) {
        console.log(`\n... and ${lendersNeedingSync.length - 20} more`);
      }
    }

    // Show breakdown by source
    const sourceCounts = {};
    lendersWithUrls.forEach(item => {
      item.urls.forEach(urlItem => {
        const source = urlItem.source.split('.')[0] || urlItem.source;
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
    });

    console.log(`\n📊 URLs by Source:`);
    Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

findUrlsInDatabase()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


