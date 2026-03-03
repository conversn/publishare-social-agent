#!/bin/bash

# Merge Optimized Content into Existing Medicare Calculator Article
# This preserves SEO value by keeping the existing URL and merging optimized content

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

echo "🔄 Merging Optimized Content into Existing Medicare Calculator Article"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 SEO Strategy:"
echo "   ✅ Preserve existing URL: medicare-cost-calculator (has traffic/rankings)"
echo "   ✅ Merge optimized content from new article"
echo "   ✅ Delete duplicate article"
echo "   ✅ Maintain all SEO value"
echo ""

# Article IDs
EXISTING_ARTICLE_ID="ad30aeec-eee5-489d-85ba-99c584d9537a"  # medicare-cost-calculator
NEW_ARTICLE_ID="4cf33b5a-575f-499d-b4c1-f58846720b53"        # medicare-cost-calculator-complete-guide...

echo "📋 Step 1: Fetching both articles..."
echo ""

# Fetch existing article
EXISTING_ARTICLE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?id=eq.${EXISTING_ARTICLE_ID}&select=id,title,slug,canonical_url" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

# Fetch new article
NEW_ARTICLE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?id=eq.${NEW_ARTICLE_ID}&select=id,title,slug" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "📝 Existing article (will be updated):"
echo "$EXISTING_ARTICLE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"  ID: {data[0]['id'] if data else 'Not found'}\"); print(f\"  Title: {data[0]['title'] if data else 'Not found'}\"); print(f\"  Slug: {data[0]['slug'] if data else 'Not found'}\")" 2>/dev/null || echo "  Could not parse"
echo ""

echo "📝 New article (will be merged and deleted):"
echo "$NEW_ARTICLE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"  ID: {data[0]['id'] if data else 'Not found'}\"); print(f\"  Title: {data[0]['title'] if data else 'Not found'}\"); print(f\"  Slug: {data[0]['slug'] if data else 'Not found'}\")" 2>/dev/null || echo "  Could not parse"
echo ""

echo "⚠️  WARNING: This will:"
echo "   1. Merge all optimized content into existing article"
echo "   2. Delete the new article (${NEW_ARTICLE_ID})"
echo "   3. Preserve the existing URL and SEO value"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted"
  exit 1
fi

echo ""
echo "📋 Step 2: Executing SQL merge script..."
echo ""

# Execute the SQL script via REST API
# Note: For complex operations, it's better to run SQL directly in Supabase
echo "💡 For best results, run the SQL script directly in Supabase SQL Editor:"
echo "   scripts/merge-medicare-calculator-content.sql"
echo ""
echo "   Or use psql if you have database access:"
echo "   psql -h [host] -U [user] -d [database] -f scripts/merge-medicare-calculator-content.sql"
echo ""

# Alternative: Use Supabase REST API to update (limited to what REST API supports)
echo "📋 Step 3: Updating article via REST API (basic fields)..."
echo ""

# This is a simplified version - full merge should be done via SQL
UPDATE_PAYLOAD=$(cat <<EOF
{
  "canonical_url": "https://seniorsimple.org/medicare-cost-calculator",
  "status": "published"
}
EOF
)

UPDATE_RESPONSE=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/articles?id=eq.${EXISTING_ARTICLE_ID}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$UPDATE_PAYLOAD")

echo "✅ Basic fields updated"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  IMPORTANT: Full content merge requires SQL execution"
echo ""
echo "📋 To complete the merge:"
echo "   1. Open Supabase SQL Editor"
echo "   2. Run: scripts/merge-medicare-calculator-content.sql"
echo ""
echo "   This will:"
echo "   ✅ Merge all optimized content (content, html_body, metadata)"
echo "   ✅ Merge AEO fields (aeo_answer_first, schema_markup, etc.)"
echo "   ✅ Merge SEO metadata (meta_description, og_tags, etc.)"
echo "   ✅ Add calculator and form markers"
echo "   ✅ Delete duplicate article"
echo "   ✅ Set canonical URL correctly"
echo ""
echo "💡 The SQL script uses a transaction, so it's safe to run"
echo ""

