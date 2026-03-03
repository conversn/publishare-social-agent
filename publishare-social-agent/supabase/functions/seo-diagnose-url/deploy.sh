#!/bin/bash

# Deploy seo-diagnose-url Edge Function

set -e

echo "🚀 Deploying seo-diagnose-url function..."

PROJECT_REF=${SUPABASE_PROJECT_REF:-"your-project-ref"}

supabase functions deploy seo-diagnose-url \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "📝 Test with:"
echo 'curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/seo-diagnose-url \'
echo '  -H "Authorization: Bearer YOUR_ANON_KEY" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{"batch_size": 5}'"'"''



