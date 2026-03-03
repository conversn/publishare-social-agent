#!/bin/bash
# Trigger batch-strategy-processor using Supabase CLI
# Note: Supabase CLI doesn't have direct invoke command
# This script uses curl with project URL (still requires service key)
# Usage: ./trigger-batch-supabase-cli.sh [SITE_ID] [LIMIT]

set -e

PROJECT_REF="vpysqshhafthuxvokwqj"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SITE_ID="${1:-homesimple}"
LIMIT="${2:-3}"
PRIORITY="${3:-High}"

echo "🚀 Triggering batch-strategy-processor..."
echo "   Project: $PROJECT_REF"
echo "   Site: $SITE_ID"
echo "   Limit: $LIMIT"
echo "   Priority: $PRIORITY"
echo ""

# Check if Supabase CLI is available (for project linking)
if ! command -v supabase &> /dev/null; then
  echo "⚠️  Supabase CLI not found (optional)"
  echo "   Install: https://supabase.com/docs/guides/cli/getting-started"
  echo ""
fi

# Try to get service key from environment or .env file
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_KEY" ]; then
  # Try to find .env file
  ENV_FILE=""
  for path in "../../../../.env" ".env" "$(pwd)/.env"; do
    if [ -f "$path" ]; then
      ENV_FILE="$path"
      break
    fi
  done
  
  if [ -n "$ENV_FILE" ]; then
    SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
  fi
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Service role key required"
  echo ""
  echo "Set environment variable:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=your_key"
  echo ""
  echo "Or provide as argument:"
  echo "  $0 $SITE_ID $LIMIT $PRIORITY"
  echo "  (then enter key when prompted)"
  echo ""
  read -sp "Enter SERVICE_ROLE_KEY: " SERVICE_KEY
  echo ""
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Service key required"
  exit 1
fi

echo "📤 Invoking function..."
echo ""

# Invoke function using curl
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/batch-strategy-processor" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"site_id\": \"${SITE_ID}\",
    \"limit\": ${LIMIT},
    \"priority_level\": \"${PRIORITY}\"
  }")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📊 Response (HTTP $HTTP_STATUS):"
echo ""

if command -v python3 &> /dev/null; then
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "$BODY"
fi

echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Function invoked successfully!"
  echo ""
  echo "📋 Check results in Supabase Dashboard:"
  echo "   - Edge Functions → batch-strategy-processor → Logs"
  echo "   - Database → articles table"
  echo "   - Database → content_strategy table"
else
  echo "❌ Error: HTTP $HTTP_STATUS"
  echo ""
  echo "💡 Troubleshooting:"
  echo "   - Verify SERVICE_ROLE_KEY is correct"
  echo "   - Check Supabase Dashboard → Edge Functions → Logs"
fi

