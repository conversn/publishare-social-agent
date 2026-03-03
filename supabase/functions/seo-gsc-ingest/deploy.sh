#!/bin/bash

# Deploy seo-gsc-ingest Edge Function

set -e

echo "🚀 Deploying seo-gsc-ingest function..."

# Set project ref (update this to your project)
PROJECT_REF=${SUPABASE_PROJECT_REF:-"your-project-ref"}

# Deploy function
supabase functions deploy seo-gsc-ingest \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "📝 Test with:"
echo 'curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/seo-gsc-ingest \'
echo '  -H "Authorization: Bearer YOUR_ANON_KEY" \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{'
echo '    "site_id": "parentsimple.org",'
echo '    "issue_type": "alternate_with_proper_canonical",'
echo '    "urls": ["https://www.parentsimple.org/example"]'
echo '  }'"'"''



