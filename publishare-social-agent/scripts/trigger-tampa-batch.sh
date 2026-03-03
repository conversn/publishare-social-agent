#!/bin/bash
# Quick script to trigger batch-strategy-processor for Tampa test articles
# Usage: ./trigger-tampa-batch.sh [SERVICE_ROLE_KEY]

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"

if [ -z "$1" ]; then
  echo "Usage: $0 <SERVICE_ROLE_KEY>"
  echo ""
  echo "Or set SUPABASE_SERVICE_ROLE_KEY environment variable:"
  echo "  export SUPABASE_SERVICE_ROLE_KEY=your_key"
  echo "  $0"
  exit 1
fi

SERVICE_KEY="${1:-$SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Service role key required"
  exit 1
fi

echo "🚀 Triggering batch-strategy-processor for Tampa articles..."
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/batch-strategy-processor" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "homesimple",
    "limit": 3,
    "priority_level": "High"
  }')

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Processing triggered. Check Supabase logs and articles table for results."

