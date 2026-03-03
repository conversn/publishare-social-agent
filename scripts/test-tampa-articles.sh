#!/bin/bash
# Test script to create 3 Tampa articles via content strategy workflow
# Usage: ./test-tampa-articles.sh

set -e

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Try to find .env file
ENV_FILE=""
for path in "$PROJECT_ROOT/../../../../.env" "$PROJECT_ROOT/.env" "$(pwd)/.env"; do
  if [ -f "$path" ]; then
    ENV_FILE="$path"
    break
  fi
done

if [ -z "$ENV_FILE" ]; then
  echo "❌ Could not find .env file. Please ensure SUPABASE_SERVICE_ROLE_KEY is set."
  exit 1
fi

SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY not found in $ENV_FILE"
  exit 1
fi

echo "✅ Found service key"
echo ""
echo "📝 Step 1: Creating 3 test strategy entries for Tampa..."
echo ""

# Create strategies using Supabase REST API
STRATEGY_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/content_strategy" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '[
    {
      "site_id": "homesimple",
      "content_title": "AC Not Cooling in Tampa? Here'\''s What to Do",
      "primary_keyword": "AC not cooling Tampa",
      "content_type": "local_page",
      "category": "hvac",
      "status": "Planned",
      "priority_level": "High",
      "word_count": 2000,
      "metadata": {
        "city": "Tampa",
        "state": "FL",
        "vertical": "hvac",
        "page_type": "local_page"
      }
    },
    {
      "site_id": "homesimple",
      "content_title": "Emergency Plumbing Services in Tampa",
      "primary_keyword": "emergency plumber Tampa",
      "content_type": "local_page",
      "category": "plumbing",
      "status": "Planned",
      "priority_level": "High",
      "word_count": 2000,
      "metadata": {
        "city": "Tampa",
        "state": "FL",
        "vertical": "plumbing",
        "page_type": "local_page"
      }
    },
    {
      "site_id": "homesimple",
      "content_title": "Pest Control Services in Tampa: Complete Guide",
      "primary_keyword": "pest control Tampa",
      "content_type": "local_page",
      "category": "pest",
      "status": "Planned",
      "priority_level": "High",
      "word_count": 2000,
      "metadata": {
        "city": "Tampa",
        "state": "FL",
        "vertical": "pest",
        "page_type": "local_page"
      }
    }
  ]')

if echo "$STRATEGY_RESPONSE" | grep -q "message"; then
  echo "❌ Error creating strategies:"
  echo "$STRATEGY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STRATEGY_RESPONSE"
  echo ""
  echo "💡 Alternative: Run the SQL script manually in Supabase SQL Editor:"
  echo "   scripts/create-tampa-test-strategies.sql"
  exit 1
fi

echo "✅ Strategies created successfully"
echo ""

# Verify strategies
echo "🔍 Verifying strategies..."
STRATEGIES=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/content_strategy?site_id=eq.homesimple&status=eq.Planned&metadata->>city=eq.Tampa&select=id,content_title,status,metadata&order=created_at.desc&limit=3" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

STRATEGY_COUNT=$(echo "$STRATEGIES" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")

if [ "$STRATEGY_COUNT" -lt 3 ]; then
  echo "⚠️  Only found $STRATEGY_COUNT strategies. Some may have already existed."
else
  echo "✅ Found $STRATEGY_COUNT strategies ready to process"
fi

echo ""
echo "🚀 Step 2: Processing strategies through batch-strategy-processor..."
echo ""

# Trigger batch processor
PROCESSOR_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/batch-strategy-processor" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "homesimple",
    "limit": 3,
    "priority_level": "High"
  }')

echo "$PROCESSOR_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PROCESSOR_RESPONSE"

echo ""
echo "📊 Step 3: Checking results..."
echo ""

# Check generated articles
ARTICLES=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?site_id=eq.homesimple&page_type=eq.local_page&city=eq.Tampa&select=id,title,slug,city,state,vertical,status,created_at&order=created_at.desc&limit=5" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "📄 Generated Articles:"
echo "$ARTICLES" | python3 -m json.tool 2>/dev/null || echo "$ARTICLES"

echo ""
echo "✅ Test complete! Check the articles table for your 3 Tampa articles."
echo ""
echo "🔍 To inspect articles in Supabase:"
echo "   SELECT id, title, slug, city, state, vertical, status, created_at"
echo "   FROM articles"
echo "   WHERE site_id = 'homesimple' AND city = 'Tampa'"
echo "   ORDER BY created_at DESC LIMIT 3;"

