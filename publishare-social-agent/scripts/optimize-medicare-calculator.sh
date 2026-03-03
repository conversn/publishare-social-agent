#!/bin/bash

# Script to optimize medicare-calculator page on seniorsimple using agentic-content-gen
# This runs the full long-form agentic workflow with AEO/SEO optimization

set -e

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Try to find .env file in multiple locations
ENV_FILE=""
for path in "$PROJECT_ROOT/.env" "$SCRIPT_DIR/../../../../.env" "$HOME/.env" "$(pwd)/.env"; do
  if [ -f "$path" ]; then
    ENV_FILE="$path"
    break
  fi
done

# Source .env file if found
if [ -n "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

# Get service role key (try multiple sources)
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
if [ -z "$SERVICE_KEY" ] && [ -n "$ENV_FILE" ]; then
  SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment"
  echo "   Please set it in .env file or export it"
  exit 1
fi

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/agentic-content-gen"

echo "🚀 Optimizing Medicare Calculator Page for SeniorSimple"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Configuration:"
echo "   Site: seniorsimple"
echo "   Topic: Medicare Cost Calculator - Complete Guide"
echo "   Workflow: Full long-form agentic workflow"
echo "   AEO: Enabled"
echo "   DeepSeek: Enabled (premium editorial quality)"
echo ""

# Prepare the request payload
PAYLOAD=$(cat <<EOF
{
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
}
EOF
)

echo "📤 Sending optimization request..."
echo "   This will take 5-10 minutes for the full workflow..."
echo ""

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Response (HTTP $HTTP_CODE):"
echo ""

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  echo "✅ Optimization workflow started successfully!"
  echo ""
  echo "📋 What's happening:"
  echo "   1. ✅ Content generation with DeepSeek (premium editorial quality)"
  echo "   2. ✅ AEO question analysis and optimization"
  echo "   3. ✅ Article creation/update in database"
  echo "   4. ✅ AEO processing and validation"
  echo "   5. ✅ Featured image generation"
  echo "   6. ✅ Link suggestions and insertion"
  echo "   7. ✅ Markdown to HTML conversion"
  echo "   8. ✅ Schema markup generation"
  echo ""
  echo "💡 Check Supabase function logs to monitor progress"
  echo "   Article will be optimized for:"
  echo "   - Featured snippets"
  echo "   - Voice search queries"
  echo "   - Calculator engagement"
  echo "   - Quote lead generation"
else
  echo "❌ Error: HTTP $HTTP_CODE"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi

