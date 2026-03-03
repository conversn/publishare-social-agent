#!/bin/bash

# Convert article markdown to HTML
# Usage: ./convert-article-to-html.sh <article_id>

set -e

ARTICLE_ID="${1:-03fc49fc-3262-4a80-8a26-71e65a6257c7}"
SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA}"

echo "🔄 Converting article markdown to HTML..."
echo "Article ID: $ARTICLE_ID"
echo ""

# First, fetch the article content
echo "📄 Fetching article content..."
ARTICLE_DATA=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/articles?id=eq.${ARTICLE_ID}&select=id,title,slug,content" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

CONTENT=$(echo "$ARTICLE_DATA" | jq -r '.[0].content // empty' 2>/dev/null)
TITLE=$(echo "$ARTICLE_DATA" | jq -r '.[0].title // empty' 2>/dev/null)

if [ -z "$CONTENT" ] || [ "$CONTENT" = "null" ]; then
  echo "❌ Error: Article not found or has no content"
  exit 1
fi

echo "✅ Found article: $TITLE"
echo "   Content length: ${#CONTENT} characters"
echo ""

# Convert markdown to HTML
echo "🔄 Converting markdown to HTML..."
CONVERSION_REQUEST=$(cat <<EOF
{
  "markdown": $(echo "$CONTENT" | jq -Rs .),
  "article_id": "$ARTICLE_ID",
  "conversionType": "enhanced",
  "styling": "modern",
  "includeCss": false
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/markdown-to-html" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d "$CONVERSION_REQUEST")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ HTML conversion failed with HTTP $HTTP_CODE"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

SUCCESS=$(echo "$BODY" | jq -r '.success // false' 2>/dev/null)
HTML_BODY=$(echo "$BODY" | jq -r '.html_body // .html // empty' 2>/dev/null)

if [ "$SUCCESS" = "true" ] && [ -n "$HTML_BODY" ]; then
  echo "✅ HTML conversion successful!"
  echo "   HTML length: ${#HTML_BODY} characters"
  echo ""
  
  # Verify the HTML was saved to the database (the function should do this automatically)
  echo "🔍 Verifying HTML was saved to database..."
  VERIFY=$(curl -s -X GET \
    "${SUPABASE_URL}/rest/v1/articles?id=eq.${ARTICLE_ID}&select=id,html_body" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")
  
  SAVED_HTML=$(echo "$VERIFY" | jq -r '.[0].html_body // empty' 2>/dev/null)
  
  if [ -n "$SAVED_HTML" ] && [ "$SAVED_HTML" != "null" ]; then
    echo "✅ HTML successfully saved to database!"
    echo "   Saved HTML length: ${#SAVED_HTML} characters"
  else
    echo "⚠️  HTML not found in database, manually updating..."
    # Manually update the article
    UPDATE_RESPONSE=$(curl -s -X PATCH \
      "${SUPABASE_URL}/rest/v1/articles?id=eq.${ARTICLE_ID}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{\"html_body\": $(echo "$HTML_BODY" | jq -Rs .)}")
    
    echo "✅ Article updated with HTML body"
  fi
else
  echo "❌ HTML conversion failed"
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi

echo ""
echo "✅ Conversion complete!"
echo "   Article ID: $ARTICLE_ID"
echo "   View article: https://www.seniorsimple.org/articles/$(echo "$ARTICLE_DATA" | jq -r '.[0].slug')"
