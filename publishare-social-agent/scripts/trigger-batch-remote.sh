#!/bin/bash
# Trigger batch-strategy-processor remotely
# Usage: ./trigger-batch-remote.sh [SERVICE_ROLE_KEY] [SITE_ID] [LIMIT]

set -e

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
SITE_ID="${2:-homesimple}"
LIMIT="${3:-3}"
PRIORITY="${4:-High}"

# Get service key from argument or environment
if [ -n "$1" ]; then
  SERVICE_KEY="$1"
elif [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
else
  echo "❌ Service role key required"
  echo ""
  echo "Usage: $0 <SERVICE_ROLE_KEY> [SITE_ID] [LIMIT] [PRIORITY]"
  echo ""
  echo "Examples:"
  echo "  $0 YOUR_KEY homesimple 3 High"
  echo "  $0 YOUR_KEY homesimple 5 Medium"
  echo ""
  echo "Or set environment variable:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=your_key"
  echo "  $0"
  exit 1
fi

echo "🚀 Triggering batch-strategy-processor remotely..."
echo "   Site: $SITE_ID"
echo "   Limit: $LIMIT"
echo "   Priority: $PRIORITY"
echo ""

# Trigger batch processor
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
  echo "✅ Processing triggered successfully!"
  echo ""
  echo "📋 Next steps:"
  echo "   1. Check Supabase Dashboard → Edge Functions → batch-strategy-processor → Logs"
  echo "   2. Monitor strategy status:"
  echo "      SELECT status, COUNT(*) FROM content_strategy"
  echo "      WHERE site_id = '${SITE_ID}' GROUP BY status;"
  echo "   3. Check generated articles:"
  echo "      SELECT id, title, city, state, vertical, status"
  echo "      FROM articles WHERE site_id = '${SITE_ID}'"
  echo "      ORDER BY created_at DESC LIMIT ${LIMIT};"
else
  echo "❌ Error: HTTP $HTTP_STATUS"
  echo ""
  echo "💡 Troubleshooting:"
  echo "   - Verify SERVICE_ROLE_KEY is correct"
  echo "   - Check Supabase Dashboard → Edge Functions → batch-strategy-processor → Logs"
  echo "   - Ensure strategies exist with status 'Planned'"
fi

