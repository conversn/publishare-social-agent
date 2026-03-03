#!/bin/bash

# Generate Retirement Listicle
# Generates "The 12 Best Ways to Live Happy, Healthy, and Wealthy in Retirement in 2026 and Beyond"

set -e

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA}"

echo "🚀 Generating Retirement Listicle..."
echo ""

TIMESTAMP=$(date +%s)
UNIQUE_TITLE="The 12 Best Ways to Live Happy, Healthy, and Wealthy in Retirement in 2026 and Beyond"
REQUEST_BODY='{
  "topic": "'"${UNIQUE_TITLE}"'",
  "title": "'"${UNIQUE_TITLE}"'",
  "content_type": "listicle",
  "site_id": "seniorsimple",
  "target_audience": "Affluent retirees and pre-retirees seeking advanced strategies to protect and grow their wealth, maintain health, and find purpose in retirement",
  "businessContext": "SeniorSimple helps seniors navigate retirement planning with expert guidance, financial products, and comprehensive resources for living well in retirement.",
  "goals": "1. Provide comprehensive retirement strategies covering financial, health, and lifestyle 2. Drive conversions through strategic offer placements 3. Establish authority in retirement planning 4. Optimize for featured snippets and voice search",
  "listicle_item_count": 12,
  "listicle_subtitle": "Why the '\''Old Rules'\'' of retirement no longer work, and the new strategies affluent retirees use to protect their lifestyle, health, and wealth in 2026 and beyond.",
  "listicle_intro_context": "For decades, the '\''Three-Legged Stool'\'' of retirement—Social Security, a pension, and personal savings—was enough. But for today'\''s retiree, two of those legs are wobbly or missing. Pensions are extinct. Social Security is under strain. That leaves your personal savings to do the heavy lifting for a retirement that could last 30 years or more. The strategies that got you here (buy, hold, and save) are not the strategies that will keep you here. Wealth preservation requires a different mindset than wealth accumulation.",
  "listicle_sections": [
    {
      "title": "PART I: FINANCIAL & WEALTH STRATEGIES",
      "item_indices": [1, 2, 3, 4, 5, 6]
    },
    {
      "title": "PART II: LIFESTYLE & TAX STRATEGIES",
      "item_indices": [7, 8, 9, 10, 11, 12]
    }
  ],
  "listicle_offers": [
    {
      "item_number": 1,
      "anchor_text": "Get Your Free Annuity Comparison →",
      "url": "https://seniorsimple.org/annuity-comparison",
      "type": "owned_offer"
    },
    {
      "item_number": 2,
      "anchor_text": "Calculate Your Available Home Equity →",
      "url": "https://seniorsimple.org/reverse-mortgage-calculator",
      "type": "owned_offer"
    },
    {
      "item_number": 3,
      "anchor_text": "Request Your Custom Policy Illustration →",
      "url": "https://seniorsimple.org/whole-life-insurance",
      "type": "owned_offer"
    },
    {
      "item_number": 4,
      "anchor_text": "Download Free Gold IRA Rollover Guide →",
      "url": "https://seniorsimple.org/gold-ira-guide",
      "type": "owned_offer"
    },
    {
      "item_number": 5,
      "anchor_text": "Compare Medicare Plans in Your Area →",
      "url": "https://seniorsimple.org/medicare-comparison",
      "type": "owned_offer"
    },
    {
      "item_number": 6,
      "anchor_text": "Access Our Dividend Stock Watchlist →",
      "url": "https://seniorsimple.org/dividend-watchlist",
      "type": "owned_offer"
    },
    {
      "item_number": 7,
      "anchor_text": "Explore Senior Consulting Opportunities →",
      "url": "https://seniorsimple.org/consulting-opportunities",
      "type": "owned_offer"
    },
    {
      "item_number": 8,
      "anchor_text": "Schedule Free CPA Consultation →",
      "url": "https://seniorsimple.org/cpa-consultation",
      "type": "owned_offer"
    },
    {
      "item_number": 9,
      "anchor_text": "Get Your LTC Hybrid Quote →",
      "url": "https://seniorsimple.org/ltc-hybrid-quote",
      "type": "owned_offer"
    },
    {
      "item_number": 10,
      "anchor_text": "Find Best High-Yield Savings Rates →",
      "url": "https://seniorsimple.org/high-yield-savings",
      "type": "owned_offer"
    },
    {
      "item_number": 11,
      "anchor_text": "Download Roth Conversion Calculator →",
      "url": "https://seniorsimple.org/roth-conversion-calculator",
      "type": "owned_offer"
    },
    {
      "item_number": 12,
      "anchor_text": "Connect With ADU Contractors →",
      "url": "https://seniorsimple.org/adu-contractors",
      "type": "owned_offer"
    }
  ],
  "listicle_conclusion_cta": "Take Your Free 2-Minute Retirement Assessment →",
  "listicle_disclaimer": "The information provided in this article is for educational purposes only and does not constitute financial, tax, or legal advice. SeniorSimple.org is not a financial advisor. All examples are hypothetical and for illustrative purposes. Financial products like annuities and reverse mortgages have fees, expenses, and risks. Please consult with a qualified professional before making any financial decisions.",
  "content_length": 3000,
  "editorial_quality": "premium",
  "use_deepseek": true,
  "generate_image": true,
  "generate_item_images": false,
  "aeo_optimized": true,
  "generate_schema": true,
  "generate_links": false,
  "convert_to_html": false,
  "enable_checkpoints": true
}'

echo "📤 Sending request to agentic-content-gen..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/agentic-content-gen" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d "${REQUEST_BODY}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ Request failed with HTTP $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo "✅ Listicle generated successfully!"
echo ""
echo "=================================================================================="
echo "RESULTS:"
echo "=================================================================================="
echo ""

# Parse and display results
ARTICLE_ID=$(echo "$BODY" | jq -r '.article_id // empty' 2>/dev/null)
TITLE=$(echo "$BODY" | jq -r '.title // empty' 2>/dev/null)
CONTENT_LENGTH=$(echo "$BODY" | jq -r '.content // "" | length' 2>/dev/null)
AEO_SCORE=$(echo "$BODY" | jq -r '.aeo_score // "N/A"' 2>/dev/null)

if [ -n "$ARTICLE_ID" ]; then
  echo "Article ID: $ARTICLE_ID"
fi
if [ -n "$TITLE" ]; then
  echo "Title: $TITLE"
fi
echo "Content Length: $CONTENT_LENGTH characters"
echo "AEO Score: $AEO_SCORE"
echo ""

if [ -n "$ARTICLE_ID" ]; then
  echo "📄 View article in Supabase:"
  echo "   https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/editor"
  echo ""
fi

# Show content preview
CONTENT_PREVIEW=$(echo "$BODY" | jq -r '.content // ""' 2>/dev/null | head -c 500)
if [ -n "$CONTENT_PREVIEW" ]; then
  echo "📝 Content Preview (first 500 chars):"
  echo "--------------------------------------------------------------------------------"
  echo "${CONTENT_PREVIEW}..."
  echo "--------------------------------------------------------------------------------"
  echo ""
fi

echo "✅ Script completed successfully"
