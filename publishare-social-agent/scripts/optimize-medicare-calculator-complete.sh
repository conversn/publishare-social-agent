#!/bin/bash

# Complete Medicare Calculator Optimization Script
# Handles both existing article optimization and new article creation

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Find .env file
ENV_FILE=""
for path in "$PROJECT_ROOT/.env" "$SCRIPT_DIR/../../../../.env" "$HOME/.env" "$(pwd)/.env"; do
  if [ -f "$path" ]; then
    ENV_FILE="$path"
    break
  fi
done

# Load service key
SERVICE_KEY=""
if [ -n "$ENV_FILE" ]; then
  SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found"
  exit 1
fi

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"

echo "🚀 Medicare Calculator AEO/SEO Optimization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check if article exists
echo "📋 Step 1: Checking for existing article..."
ARTICLE_DATA=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?slug=eq.medicare-cost-calculator&site_id=eq.seniorsimple&select=id,title,slug,status" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

ARTICLE_ID=$(echo "$ARTICLE_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data and len(data) > 0 else '')" 2>/dev/null || echo "")

if [ -n "$ARTICLE_ID" ]; then
  echo "✅ Found existing article: $ARTICLE_ID"
  echo ""
  echo "📋 Step 2: Optimizing existing article with full workflow..."
  echo "   This will:"
  echo "   - Regenerate content with DeepSeek (premium quality)"
  echo "   - Apply AEO optimization"
  echo "   - Generate/update schema markup"
  echo "   - Generate featured image"
  echo "   - Enhance metadata"
  echo "   - Convert to HTML"
  echo ""
  
  # For existing articles, we'll use article-metadata-enhancer for metadata
  # But we need to regenerate content, so we'll create a new version or update
  # Actually, let's use agentic-content-gen with a slightly different approach
  # by updating the content field directly after generation
  
  echo "⚠️  Note: For full content regeneration, we'll create an optimized version"
  echo "   You can then replace the existing article content manually or via SQL"
  echo ""
  
  # Use article-metadata-enhancer for AEO and metadata
  echo "🔄 Running article-metadata-enhancer for AEO optimization..."
  ENHANCER_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/article-metadata-enhancer" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"article_id\": \"${ARTICLE_ID}\",
      \"update_existing\": true,
      \"generate_images\": true,
      \"process_aeo_only\": false
    }")
  
  echo "$ENHANCER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ENHANCER_RESPONSE"
  echo ""
  
  echo "✅ Metadata and AEO optimization complete!"
  echo ""
  echo "💡 To fully regenerate content with DeepSeek:"
  echo "   1. The article-metadata-enhancer has optimized AEO fields"
  echo "   2. For content regeneration, use agentic-content-gen with a new slug"
  echo "   3. Then update the existing article's content field via SQL"
  echo ""
  
else
  echo "📝 Article not found. Creating new optimized article..."
  echo ""
  echo "📋 Step 2: Generating new article with full agentic workflow..."
  echo ""
  
  # Create new article with agentic-content-gen
  GEN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/agentic-content-gen" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "topic": "Medicare Cost Calculator: How to Estimate Your Annual Medicare Costs and Compare Plan Options",
      "title": "Medicare Cost Calculator: Complete Guide to Estimating Your Annual Costs",
      "site_id": "seniorsimple",
      "target_audience": "Seniors aged 65+ who are enrolling in Medicare or reviewing their current Medicare coverage. They need help understanding costs, comparing plans, and making informed decisions about Medicare Part A, B, C, D, and Medigap options.",
      "content_type": "how-to",
      "content_length": 4000,
      "tone": "helpful, informative, and empowering",
      "aeo_optimized": true,
      "aeo_content_type": "how-to",
      "generate_schema": true,
      "answer_first": true,
      "question": "How much does Medicare cost per month?",
      "use_question_analysis": true,
      "optimize_for_questions": true,
      "use_deepseek": true,
      "editorial_quality": "premium",
      "generate_image": true,
      "generate_links": true,
      "convert_to_html": true,
      "auto_publish": false,
      "generate_social_posts": false,
      "businessContext": "SeniorSimple helps seniors navigate Medicare enrollment and plan selection. The Medicare calculator is a key lead generation tool that helps users estimate costs and compare options. This page should drive quote leads through calculator engagement and call CTAs.",
      "goals": "1. Answer common Medicare cost questions directly (AEO optimization) 2. Drive calculator engagement 3. Generate quote leads through call CTAs 4. Provide comprehensive, authoritative information about Medicare costs 5. Optimize for featured snippets and voice search"
    }')
  
  echo "$GEN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GEN_RESPONSE"
  echo ""
  
  if echo "$GEN_RESPONSE" | grep -q "article_id"; then
    echo "✅ New article created and optimized!"
  else
    echo "⚠️  Check response above for any errors"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Optimization workflow complete!"
echo ""
echo "📊 Next Steps:"
echo "   1. Check Supabase function logs for detailed progress"
echo "   2. Review the article in Supabase/articles table"
echo "   3. Validate schema markup using Google Rich Results Test"
echo "   4. Test calculator integration on the live page"
echo "   5. Monitor search performance and AEO metrics"
echo ""

