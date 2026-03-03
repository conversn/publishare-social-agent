#!/bin/bash
# Run image generation in foreground so we can see output

cd "$(dirname "$0")/.."
export SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZweXNxc2hoYWZ0aHV4dm9rd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM1Njc4NywiZXhwIjoyMDY1OTMyNzg3fQ.9bg4FsYm8mHDOupqL2VDnWUkL0t8tB7kQTCeca0soSA'

echo "🚀 Starting image generation (foreground mode)"
echo "Press Ctrl+C to stop"
echo ""

node scripts/generate-images-robust.js


