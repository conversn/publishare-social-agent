/**
 * Identify Invalid Lender Names
 * 
 * Analyzes lender names to identify records that are likely not actual lenders:
 * - Category/description names
 * - Program descriptions
 * - Internal notes/placeholders
 * - Too generic or unusual patterns
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

// Patterns that indicate non-lender records
const INVALID_PATTERNS = [
  // Category/description patterns
  /^(Commercial|Residential|Business|Consumer|Personal)\s*(Only|Lending|Loans)?$/i,
  /^(Non\s*[- ]?QM|Super\s*Jumbo|Hard\s*Money|Bank\s*Statement|Foreign\s*National|DSCR|ITIN)/i,
  /^(Broker|MLO|Loan\s*Officer)/i,
  /^(Unusual|Special|Custom)/i,
  
  // Too long (likely descriptions)
  /^.{80,}$/,
  
  // Multiple program types listed
  /(Non\s*QM|Super\s*Jumbo|Commercial|Hard\s*Money|ITIN|Bank\s*Statement|Foreign\s*National|DSCR).*(Non\s*QM|Super\s*Jumbo|Commercial|Hard\s*Money|ITIN|Bank\s*Statement|Foreign\s*National|DSCR)/i,
  
  // Compensation/note patterns
  /Compensation|Compesation|Broker\s*Paid|Borrower\s*Paid/i,
  /Only\s*$/i,
  
  // Placeholder patterns
  /^NDC\s*Only$/i,
  /^Specialty\s*Lender$/i,
  
  // Generic patterns
  /^(The|A|An)\s+(Lender|Bank|Mortgage|Financial)$/i,
];

// Keywords that suggest it's a description, not a name
const DESCRIPTION_KEYWORDS = [
  'compensation',
  'broker paid',
  'borrower paid',
  'unusual',
  'only',
  'super jumbo',
  'hard money',
  'bank statement',
  'foreign national',
  'non qm',
  'dscr',
  'itin',
  'specialty',
  'commercial only',
  'residential only',
];

// Check if name looks like a description
function isDescription(name) {
  const lower = name.toLowerCase();
  
  // Check for multiple program types
  const programTypes = ['non qm', 'super jumbo', 'commercial', 'hard money', 'itin', 'bank statement', 'foreign national', 'dscr'];
  const foundTypes = programTypes.filter(type => lower.includes(type));
  if (foundTypes.length >= 2) {
    return true;
  }
  
  // Check for description keywords
  if (DESCRIPTION_KEYWORDS.some(keyword => lower.includes(keyword))) {
    // But allow if it's part of a legitimate name
    const legitimatePatterns = [
      /^[A-Z][a-z]+\s+(Mortgage|Lending|Financial|Bank)/, // "United Wholesale Mortgage"
      /^[A-Z]{2,}\s+(Mortgage|Lending)/, // "UWM Mortgage"
    ];
    
    if (!legitimatePatterns.some(pattern => pattern.test(name))) {
      return true;
    }
  }
  
  return false;
}

// Check if name matches invalid patterns
function matchesInvalidPattern(name) {
  return INVALID_PATTERNS.some(pattern => pattern.test(name));
}

// Analyze name characteristics
function analyzeName(name) {
  const analysis = {
    name,
    isInvalid: false,
    reasons: [],
    confidence: 'low',
    length: name.length,
    wordCount: name.split(/\s+/).length,
    hasNumbers: /\d/.test(name),
    allCaps: name === name.toUpperCase() && name.length > 3,
    hasSpecialChars: /[^a-zA-Z0-9\s().-]/.test(name),
  };
  
  // Check patterns
  if (matchesInvalidPattern(name)) {
    analysis.isInvalid = true;
    analysis.reasons.push('Matches invalid pattern');
    analysis.confidence = 'high';
  }
  
  // Check if it's a description
  if (isDescription(name)) {
    analysis.isInvalid = true;
    analysis.reasons.push('Looks like a description/category');
    analysis.confidence = 'high';
  }
  
  // Check length
  if (name.length > 80) {
    analysis.isInvalid = true;
    analysis.reasons.push('Name too long (likely description)');
    analysis.confidence = 'high';
  }
  
  // Check word count (too many words = likely description)
  if (analysis.wordCount > 8) {
    analysis.isInvalid = true;
    analysis.reasons.push(`Too many words (${analysis.wordCount})`);
    analysis.confidence = 'medium';
  }
  
  // Check for all caps (unusual for lender names)
  if (analysis.allCaps && name.length > 10) {
    analysis.isInvalid = true;
    analysis.reasons.push('All caps (unusual pattern)');
    analysis.confidence = 'medium';
  }
  
  // Check for unusual special characters
  if (analysis.hasSpecialChars && !/[().-]/.test(name)) {
    analysis.isInvalid = true;
    analysis.reasons.push('Unusual special characters');
    analysis.confidence = 'medium';
  }
  
  // Check for common legitimate patterns
  const legitimatePatterns = [
    /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Mortgage|Lending|Financial|Bank|Credit|Union|FCU|CU)$/i,
    /^[A-Z]{2,}\s+(Mortgage|Lending|Financial)$/i,
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+(Mortgage|Lending|Financial|Bank)$/i,
  ];
  
  if (legitimatePatterns.some(pattern => pattern.test(name))) {
    // Likely legitimate, reduce confidence if flagged
    if (analysis.isInvalid) {
      analysis.confidence = 'low';
      analysis.reasons.push('(But matches legitimate pattern)');
    }
  }
  
  return analysis;
}

async function identifyInvalidNames() {
  console.log('🔍 Identifying invalid lender names...\n');
  console.log('='.repeat(80));

  try {
    // Get all lenders
    const { data: lenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, name, slug, website_url, description')
      .eq('site_id', 'rateroots')
      .order('name');

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!lenders || lenders.length === 0) {
      console.log('No lenders found');
      return;
    }

    console.log(`\n📊 Analyzing ${lenders.length} lenders...\n`);

    const invalidLenders = [];
    const suspiciousLenders = [];
    const validLenders = [];

    for (const lender of lenders) {
      const analysis = analyzeName(lender.name);
      
      if (analysis.isInvalid) {
        if (analysis.confidence === 'high') {
          invalidLenders.push({ lender, analysis });
        } else {
          suspiciousLenders.push({ lender, analysis });
        }
      } else {
        validLenders.push(lender);
      }
    }

    console.log(`📈 Analysis Results:`);
    console.log(`  ✅ Valid Lenders: ${validLenders.length}`);
    console.log(`  ⚠️  Suspicious (Medium Confidence): ${suspiciousLenders.length}`);
    console.log(`  ❌ Invalid (High Confidence): ${invalidLenders.length}`);
    console.log(`  Total: ${lenders.length}`);

    // Show invalid lenders
    if (invalidLenders.length > 0) {
      console.log(`\n❌ INVALID LENDERS (High Confidence - Should Skip Crawling):`);
      console.log('-'.repeat(80));
      invalidLenders.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.lender.name}`);
        console.log(`   ID: ${item.lender.id}`);
        console.log(`   Slug: ${item.lender.slug}`);
        console.log(`   Website URL: ${item.lender.website_url || 'NULL'}`);
        console.log(`   Reasons: ${item.analysis.reasons.join(', ')}`);
        console.log(`   Length: ${item.analysis.length} chars, ${item.analysis.wordCount} words`);
      });
    }

    // Show suspicious lenders
    if (suspiciousLenders.length > 0) {
      console.log(`\n⚠️  SUSPICIOUS LENDERS (Medium Confidence - Review Recommended):`);
      console.log('-'.repeat(80));
      suspiciousLenders.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.lender.name}`);
        console.log(`   ID: ${item.lender.id}`);
        console.log(`   Reasons: ${item.analysis.reasons.join(', ')}`);
      });
    }

    // Summary statistics
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 SUMMARY:');
    console.log(`  Valid for crawling: ${validLenders.length} lenders`);
    console.log(`  Should skip crawling: ${invalidLenders.length} lenders`);
    console.log(`  Review recommended: ${suspiciousLenders.length} lenders`);
    
    const skipPercentage = ((invalidLenders.length / lenders.length) * 100).toFixed(1);
    console.log(`  Skip percentage: ${skipPercentage}%`);

    // Export for review
    if (invalidLenders.length > 0) {
      console.log(`\n💾 Exporting invalid lender IDs for exclusion...`);
      const invalidIds = invalidLenders.map(item => item.lender.id);
      console.log(`\nInvalid Lender IDs (${invalidIds.length}):`);
      console.log(JSON.stringify(invalidIds, null, 2));
    }

  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
}

identifyInvalidNames()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });


