#!/bin/bash

# Deploy seo-apply-fix Edge Function

set -e

echo "🚀 Deploying seo-apply-fix function..."

PROJECT_REF=${SUPABASE_PROJECT_REF:-"your-project-ref"}

supabase functions deploy seo-apply-fix \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "📝 Test with:"
echo 'curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/seo-apply-fix \'
echo '  -H "Authorization: Bearer YOUR_ANON_KEY" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{'
echo '    "fix_ids": ["fix-uuid-here"],'
echo '    "approved_by": "admin@example.com",'
echo '    "dry_run": true'
echo '  }'"'"''



