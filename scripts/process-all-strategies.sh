#!/bin/bash

# Process all HomeSimple strategies in batches
# This script processes strategies in batches of 10 to avoid timeouts

set -e

# Load service key from .env
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env" ]; then
  export $(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$PROJECT_ROOT/.env" | xargs)
elif [ -f ".env" ]; then
  export $(grep "^SUPABASE_SERVICE_ROLE_KEY=" ".env" | xargs)
fi

SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
if [ -z "$SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env file"
  exit 1
fi

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
BATCH_SIZE=10
TOTAL_STRATEGIES=120
BATCHES=$(( ($TOTAL_STRATEGIES + $BATCH_SIZE - 1) / $BATCH_SIZE ))

echo "🚀 Processing all HomeSimple strategies"
echo "   Total strategies: $TOTAL_STRATEGIES"
echo "   Batch size: $BATCH_SIZE"
echo "   Total batches: $BATCHES"
echo "   Estimated time: ~$((BATCHES * 5))-$(($BATCHES * 10)) minutes"
echo ""

total_succeeded=0
total_failed=0
batch_num=1

while [ $batch_num -le $BATCHES ]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📦 Batch $batch_num of $BATCHES"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  start_time=$(date +%s)
  
  RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/functions/v1/batch-strategy-processor" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"site_id\": \"homesimple\",
      \"limit\": ${BATCH_SIZE},
      \"priority_level\": \"High\"
    }")
  
  end_time=$(date +%s)
  duration=$((end_time - start_time))
  
  # Extract results
  processed=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('processed', 0))" 2>/dev/null || echo "0")
  succeeded=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('succeeded', 0))" 2>/dev/null || echo "0")
  failed=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('failed', 0))" 2>/dev/null || echo "0")
  
  total_succeeded=$((total_succeeded + succeeded))
  total_failed=$((total_failed + failed))
  
  echo "✅ Processed: $processed | Succeeded: $succeeded | Failed: $failed | Time: ${duration}s"
  
  if [ "$processed" -eq "0" ]; then
    echo "⚠️  No more strategies to process. Exiting."
    break
  fi
  
  batch_num=$((batch_num + 1))
  
  # Small delay between batches to avoid rate limiting
  if [ $batch_num -le $BATCHES ]; then
    echo "⏸️  Waiting 5 seconds before next batch..."
    sleep 5
  fi
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Final Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Total Succeeded: $total_succeeded"
echo "❌ Total Failed: $total_failed"
echo "📝 Total Processed: $((total_succeeded + total_failed))"
echo ""
echo "🎉 Batch processing complete!"

