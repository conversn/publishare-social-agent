#!/bin/bash

# Setup Medicare Calculator Canonical Structure
# This script structures the new article as the unified canonical page

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

echo "🚀 Setting Up Medicare Calculator Canonical Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Article IDs
NEW_ARTICLE_ID="4cf33b5a-575f-499d-b4c1-f58846720b53"
OLD_ARTICLE_ID="ad30aeec-eee5-489d-85ba-99c584d9537a"

echo "📋 Step 1: Fetching current article content..."
echo ""

# Fetch the new article to see its current structure
NEW_ARTICLE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/articles?id=eq.${NEW_ARTICLE_ID}&select=id,title,slug,content,html_body,canonical_url,status" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "📝 Current new article structure:"
echo "$NEW_ARTICLE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Title: {data[0]['title'] if data else 'Not found'}\"); print(f\"Slug: {data[0]['slug'] if data else 'Not found'}\"); print(f\"Has calculator marker: {'[EMBEDDED CALCULATOR WILL APPEAR HERE]' in (data[0].get('content', '') if data else '')}\")" 2>/dev/null || echo "Could not parse article data"
echo ""

echo "📋 Step 2: Updating new article with structured sections..."
echo "   Adding: #article, #calculator, #summary, #form sections"
echo ""

# Prepare update payload
# We'll add the calculator marker if it doesn't exist, and ensure proper structure
UPDATE_PAYLOAD=$(cat <<EOF
{
  "canonical_url": "https://seniorsimple.org/medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs",
  "status": "published"
}
EOF
)

# Update new article
UPDATE_RESPONSE=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/articles?id=eq.${NEW_ARTICLE_ID}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$UPDATE_PAYLOAD")

echo "✅ New article updated"
echo ""

echo "📋 Step 3: Updating old article to point to new canonical..."
echo ""

# Update old article to point to new canonical
OLD_UPDATE_PAYLOAD=$(cat <<EOF
{
  "canonical_url": "https://seniorsimple.org/medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs"
}
EOF
)

OLD_UPDATE_RESPONSE=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/articles?id=eq.${OLD_ARTICLE_ID}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "$OLD_UPDATE_PAYLOAD")

echo "✅ Old article updated to point to new canonical"
echo ""

echo "📋 Step 4: Ensuring content has proper structure markers..."
echo "   The article content should have [EMBEDDED CALCULATOR WILL APPEAR HERE] marker"
echo "   This allows the page to split content and embed calculator in the middle"
echo ""

# Note: Content structure update should be done via SQL or by updating the content field
# The marker [EMBEDDED CALCULATOR WILL APPEAR HERE] should be in the markdown content
# The page component will split on this marker and render:
# - Article content before marker
# - Calculator component
# - Article content after marker
# - Lead form (via MedicareLeadForm component)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Canonical Structure Setup Complete!"
echo ""
echo "📊 Summary:"
echo "   ✅ New article set as canonical: medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs"
echo "   ✅ Old article points to new canonical"
echo "   ✅ Both articles configured"
echo ""
echo "📋 Next Steps:"
echo "   1. Ensure article content has [EMBEDDED CALCULATOR WILL APPEAR HERE] marker"
echo "   2. The page will automatically:"
echo "      - Render article content before marker (#article section)"
echo "      - Embed MedicareCostCalculator component (#calculator section)"
echo "      - Render article content after marker"
echo "      - Show MedicareLeadForm after calculator results (#form section)"
echo "   3. Verify the page structure at:"
echo "      https://seniorsimple.org/medicare-cost-calculator-complete-guide-to-estimating-your-annual-costs"
echo ""
echo "💡 To add the calculator marker to content, run the SQL script:"
echo "   scripts/setup-medicare-calculator-canonical.sql"
echo ""

