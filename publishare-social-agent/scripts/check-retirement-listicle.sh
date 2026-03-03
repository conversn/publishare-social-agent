#!/bin/bash

# Check Retirement Listicle Status
# Checks if the retirement listicle article exists in Supabase

SUPABASE_URL="https://vpysqshhafthuxvokwqj.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA}"

echo "🔍 Checking for retirement listicle articles..."
echo ""

# Query for articles with retirement in title, on seniorsimple site
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{
    "query": "SELECT id, title, slug, status, site_id, content_type, created_at, updated_at FROM articles WHERE site_id = '\''seniorsimple'\'' AND (title ILIKE '\''%12 Best Ways to Live Happy, Healthy, and Wealthy in Retirement%'\'' OR title ILIKE '\''%retirement%'\'') ORDER BY created_at DESC LIMIT 10;"
  }' 2>/dev/null)

# Alternative: Use REST API directly
RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/articles?site_id=eq.seniorsimple&title=ilike.*retirement*&select=id,title,slug,status,site_id,content_type,created_at,updated_at&order=created_at.desc&limit=10" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "📄 To view in Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/editor"
