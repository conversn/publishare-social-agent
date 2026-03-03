/**
 * Generate Retirement Listicle
 * 
 * Generates "The 12 Best Ways to Live Happy, Healthy, and Wealthy in Retirement in 2026 and Beyond"
 */

const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA';

async function generateRetirementListicle() {
  console.log('🚀 Generating Retirement Listicle...\n');

  const requestBody = {
    topic: "The 12 Best Ways to Live Happy, Healthy, and Wealthy in Retirement in 2026 and Beyond",
    content_type: "listicle",
    site_id: "seniorsimple",
    target_audience: "Affluent retirees and pre-retirees seeking advanced strategies to protect and grow their wealth, maintain health, and find purpose in retirement",
    businessContext: "SeniorSimple helps seniors navigate retirement planning with expert guidance, financial products, and comprehensive resources for living well in retirement.",
    goals: "1. Provide comprehensive retirement strategies covering financial, health, and lifestyle 2. Drive conversions through strategic offer placements 3. Establish authority in retirement planning 4. Optimize for featured snippets and voice search",
    listicle_item_count: 12,
    listicle_subtitle: "Why the 'Old Rules' of retirement no longer work, and the new strategies affluent retirees use to protect their lifestyle, health, and wealth in 2026 and beyond.",
    listicle_intro_context: "For decades, the 'Three-Legged Stool' of retirement—Social Security, a pension, and personal savings—was enough. But for today's retiree, two of those legs are wobbly or missing. Pensions are extinct. Social Security is under strain. That leaves your personal savings to do the heavy lifting for a retirement that could last 30 years or more. The strategies that got you here (buy, hold, and save) are not the strategies that will keep you here. Wealth preservation requires a different mindset than wealth accumulation.",
    listicle_sections: [
      {
        title: "PART I: FINANCIAL & WEALTH STRATEGIES",
        item_indices: [1, 2, 3, 4, 5, 6]
      },
      {
        title: "PART II: LIFESTYLE & TAX STRATEGIES",
        item_indices: [7, 8, 9, 10, 11, 12]
      }
    ],
    listicle_offers: [
      {
        item_number: 1,
        anchor_text: "Get Your Free Annuity Comparison →",
        url: "https://seniorsimple.org/annuity-comparison",
        type: "owned_offer"
      },
      {
        item_number: 2,
        anchor_text: "Calculate Your Available Home Equity →",
        url: "https://seniorsimple.org/reverse-mortgage-calculator",
        type: "owned_offer"
      },
      {
        item_number: 3,
        anchor_text: "Request Your Custom Policy Illustration →",
        url: "https://seniorsimple.org/whole-life-insurance",
        type: "owned_offer"
      },
      {
        item_number: 4,
        anchor_text: "Download Free Gold IRA Rollover Guide →",
        url: "https://seniorsimple.org/gold-ira-guide",
        type: "owned_offer"
      },
      {
        item_number: 5,
        anchor_text: "Compare Medicare Plans in Your Area →",
        url: "https://seniorsimple.org/medicare-comparison",
        type: "owned_offer"
      },
      {
        item_number: 6,
        anchor_text: "Access Our Dividend Stock Watchlist →",
        url: "https://seniorsimple.org/dividend-watchlist",
        type: "owned_offer"
      },
      {
        item_number: 7,
        anchor_text: "Explore Senior Consulting Opportunities →",
        url: "https://seniorsimple.org/consulting-opportunities",
        type: "owned_offer"
      },
      {
        item_number: 8,
        anchor_text: "Schedule Free CPA Consultation →",
        url: "https://seniorsimple.org/cpa-consultation",
        type: "owned_offer"
      },
      {
        item_number: 9,
        anchor_text: "Get Your LTC Hybrid Quote →",
        url: "https://seniorsimple.org/ltc-hybrid-quote",
        type: "owned_offer"
      },
      {
        item_number: 10,
        anchor_text: "Find Best High-Yield Savings Rates →",
        url: "https://seniorsimple.org/high-yield-savings",
        type: "owned_offer"
      },
      {
        item_number: 11,
        anchor_text: "Download Roth Conversion Calculator →",
        url: "https://seniorsimple.org/roth-conversion-calculator",
        type: "owned_offer"
      },
      {
        item_number: 12,
        anchor_text: "Connect With ADU Contractors →",
        url: "https://seniorsimple.org/adu-contractors",
        type: "owned_offer"
      }
    ],
    listicle_conclusion_cta: "Take Your Free 2-Minute Retirement Assessment →",
    listicle_disclaimer: "The information provided in this article is for educational purposes only and does not constitute financial, tax, or legal advice. SeniorSimple.org is not a financial advisor. All examples are hypothetical and for illustrative purposes. Financial products like annuities and reverse mortgages have fees, expenses, and risks. Please consult with a qualified professional before making any financial decisions.",
    content_length: 6000,
    editorial_quality: "premium",
    use_deepseek: true,
    generate_image: true,
    generate_item_images: false,
    aeo_optimized: true,
    generate_schema: true,
    generate_links: true,
    convert_to_html: true
  };

  try {
    console.log('📤 Sending request to agentic-content-gen...\n');
    console.log('Topic:', requestBody.topic);
    console.log('Items:', requestBody.listicle_item_count);
    console.log('Offers:', requestBody.listicle_offers.length);
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-content-gen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Request failed:', response.status, response.statusText);
      console.error('Error details:', errorText);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Listicle generated successfully!\n');
    console.log('='.repeat(80));
    console.log('RESULTS:');
    console.log('='.repeat(80));
    console.log('');
    console.log('Article ID:', result.article_id);
    console.log('Title:', result.title);
    console.log('Content Length:', result.content?.length || 0, 'characters');
    console.log('AEO Score:', result.aeo_score || 'N/A');
    console.log('');

    if (result.article_id) {
      console.log('📄 View article in Supabase:');
      console.log(`   https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/editor`);
      console.log('');
    }

    if (result.content) {
      console.log('📝 Content Preview (first 500 chars):');
      console.log('-'.repeat(80));
      console.log(result.content.substring(0, 500) + '...');
      console.log('-'.repeat(80));
      console.log('');
    }

    return result;
  } catch (error) {
    console.error('❌ Error generating listicle:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateRetirementListicle()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateRetirementListicle };
