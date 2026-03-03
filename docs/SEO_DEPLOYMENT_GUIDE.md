# SEO Triage Agent - Deployment Guide

Complete step-by-step guide to deploying the Indexability Triage Agent to production.

---

## Prerequisites

### Required Tools

- [Supabase CLI](https://supabase.com/docs/guides/cli) v1.123.4+
- [Deno](https://deno.land/) v2.0+ (for local development)
- [PostgreSQL](https://www.postgresql.org/) client (optional, for manual queries)
- Git

### Required Accounts & Keys

- **Supabase Project**: Your project reference ID
- **OpenAI API Key**: For LLM classification (optional but recommended)
- **Google Cloud Console**: For GSC API integration (Phase 3)

### Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Recommended
OPENAI_API_KEY=sk-...

# Optional (Phase 3 - GSC Integration)
GOOGLE_CLIENT_ID=your-gsc-client-id
GOOGLE_CLIENT_SECRET=your-gsc-client-secret
```

---

## Phase 1: Database Setup

### Step 1.1: Run Migration

```bash
# Navigate to publishare directory
cd /path/to/publishare

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push

# Or manually apply migration
supabase db execute \
  --file supabase/migrations/20251218_seo_triage_schema.sql
```

### Step 1.2: Verify Tables

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'seo_%';

-- Expected output:
-- seo_alerts
-- seo_affected_urls
-- seo_url_diagnostics
-- seo_fix_proposals
-- seo_gsc_credentials
-- seo_sitemap_cache
```

### Step 1.3: Verify Views

```sql
SELECT * FROM seo_dashboard_summary LIMIT 1;
SELECT * FROM seo_urls_needing_review LIMIT 1;
SELECT * FROM seo_auto_fixable_urls LIMIT 1;
```

### Step 1.4: Set Up Row Level Security (Optional)

```sql
-- Enable RLS on tables
ALTER TABLE seo_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_affected_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_url_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_fix_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust for your auth setup)
CREATE POLICY "Users can view their site's alerts"
  ON seo_alerts FOR SELECT
  USING (site_id IN (SELECT site_id FROM user_sites WHERE user_id = auth.uid()));

-- Repeat for other tables...
```

---

## Phase 2: Deploy Edge Functions

### Step 2.1: Configure Secrets

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Verify secrets
supabase secrets list
```

### Step 2.2: Deploy Ingest Function

```bash
cd supabase/functions/seo-gsc-ingest

# Deploy
supabase functions deploy seo-gsc-ingest \
  --project-ref your-project-ref \
  --no-verify-jwt

# Or use the deploy script
./deploy.sh
```

### Step 2.3: Deploy Diagnose Function

```bash
cd ../seo-diagnose-url

supabase functions deploy seo-diagnose-url \
  --project-ref your-project-ref \
  --no-verify-jwt

# Or
./deploy.sh
```

### Step 2.4: Deploy Apply Fix Function

```bash
cd ../seo-apply-fix

supabase functions deploy seo-apply-fix \
  --project-ref your-project-ref \
  --no-verify-jwt

# Or
./deploy.sh
```

### Step 2.5: Verify Deployments

```bash
# List deployed functions
supabase functions list

# Test ingest function
curl -X POST https://your-project.supabase.co/functions/v1/seo-gsc-ingest \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "test.com",
    "source": "manual",
    "issue_type": "test",
    "urls": ["https://test.com/page1"]
  }'

# Should return: {"success": true, "data": {...}}
```

---

## Phase 3: Test End-to-End Flow

### Step 3.1: Ingest Test URLs

```bash
# Create test alert
curl -X POST https://your-project.supabase.co/functions/v1/seo-gsc-ingest \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "parentsimple.org",
    "source": "manual",
    "issue_type": "alternate_with_proper_canonical",
    "urls": [
      "https://www.parentsimple.org/articles/529-plans-for-babies-complete-guide-to-starting-early"
    ]
  }'

# Note the alert_id from response
```

### Step 3.2: Run Diagnostics

```bash
# Diagnose the URLs
curl -X POST https://your-project.supabase.co/functions/v1/seo-diagnose-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 5}'

# Should return diagnostics with classification
```

### Step 3.3: Review Results

```sql
-- Check diagnostic results
SELECT 
  u.url,
  u.status,
  d.classification->>'root_cause' as root_cause,
  d.classification->>'confidence' as confidence,
  d.classification->'autofix_plan'->>'safe_to_autofix' as auto_fixable
FROM seo_affected_urls u
JOIN seo_url_diagnostics d ON u.id = d.url_id
WHERE u.alert_id = 'your-alert-id-here';
```

### Step 3.4: Test Auto-Fix (Dry Run)

```bash
# Get fix proposals
curl -X POST https://your-project.supabase.co/functions/v1/seo-apply-fix \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fix_ids": ["fix-uuid-from-database"],
    "approved_by": "test@example.com",
    "dry_run": true
  }'

# Review output before applying
```

---

## Phase 4: Production Configuration

### Step 4.1: Configure Site Settings

```sql
-- Create site SEO configuration (if not exists)
CREATE TABLE IF NOT EXISTS sites_seo_config (
  site_id TEXT PRIMARY KEY,
  autofix_enabled BOOLEAN DEFAULT false,
  preferred_host TEXT, -- 'www' or 'non-www'
  canonical_strategy TEXT DEFAULT 'self',
  sitemap_policy TEXT DEFAULT 'canonical_only',
  confidence_threshold NUMERIC DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert config for your site
INSERT INTO sites_seo_config (site_id, autofix_enabled, preferred_host)
VALUES ('parentsimple.org', true, 'non-www');
```

### Step 4.2: Set Up Cron Jobs (Optional)

Schedule automatic diagnostics:

```bash
# Deploy ingest function with cron schedule
supabase functions deploy seo-gsc-ingest \
  --project-ref your-project-ref \
  --schedule="0 2 * * *"  # Daily at 2 AM UTC
```

Or use Supabase dashboard:
1. Go to Database → Triggers
2. Create pg_cron job:

```sql
SELECT cron.schedule(
  'seo-daily-diagnose',
  '0 3 * * *',  -- 3 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/seo-diagnose-url',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
    body := jsonb_build_object('batch_size', 20)
  );
  $$
);
```

### Step 4.3: Configure Monitoring

Set up error alerts:

```sql
-- Create alert function
CREATE OR REPLACE FUNCTION notify_seo_errors()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification (example using pg_notify)
  PERFORM pg_notify(
    'seo_error',
    json_build_object(
      'url_id', NEW.id,
      'url', NEW.url,
      'error', NEW.last_error
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER seo_error_notification
  AFTER UPDATE ON seo_affected_urls
  FOR EACH ROW
  WHEN (NEW.status = 'error')
  EXECUTE FUNCTION notify_seo_errors();
```

---

## Phase 5: GSC API Integration (Optional)

### Step 5.1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Search Console API**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-site.com/auth/gsc/callback`

### Step 5.2: Implement OAuth Flow

```typescript
// Example OAuth flow (in your CMS)
export async function initiateGSCAuth(siteId: string) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', 'https://your-site.com/auth/gsc/callback');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/webmasters.readonly');
  authUrl.searchParams.set('state', siteId);
  
  return authUrl.toString();
}

// Handle callback
export async function handleGSCCallback(code: string, siteId: string) {
  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://your-site.com/auth/gsc/callback',
      grant_type: 'authorization_code',
    }),
  });
  
  const tokens = await tokenResponse.json();
  
  // Store in database
  await supabase.from('seo_gsc_credentials').insert({
    site_id: siteId,
    site_url: `https://${siteId}`,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    authorized_by: getCurrentUser().email,
  });
}
```

### Step 5.3: Test GSC Integration

```bash
# After OAuth setup, test GSC data pull
# This would run automatically via cron
```

---

## Phase 6: Dashboard Integration

### Step 6.1: Add Dashboard Views

Example React component:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function SEOTriageDashboard({ siteId }: { siteId: string }) {
  const [summary, setSummary] = useState(null);
  
  useEffect(() => {
    async function fetchSummary() {
      const { data } = await supabase
        .from('seo_dashboard_summary')
        .select('*')
        .eq('site_id', siteId);
      setSummary(data);
    }
    fetchSummary();
  }, [siteId]);
  
  return (
    <div>
      <h2>SEO Indexability Triage</h2>
      {summary?.map((item) => (
        <div key={item.issue_type}>
          <h3>{item.issue_type}</h3>
          <p>Total URLs: {item.total_urls}</p>
          <p>Diagnosed: {item.diagnosed_urls}</p>
          <p>Needs Review: {item.needs_review}</p>
          <button onClick={() => runDiagnostics(item.issue_type)}>
            Diagnose Pending
          </button>
        </div>
      ))}
    </div>
  );
}

async function runDiagnostics(alertId: string) {
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/seo-diagnose-url`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ alert_id: alertId }),
    }
  );
  return response.json();
}
```

---

## Troubleshooting

### Issue: Function deployment fails

```bash
# Check logs
supabase functions logs seo-diagnose-url --tail

# Verify imports
deno check supabase/functions/seo-diagnose-url/index.ts

# Clear cache
rm -rf ~/.cache/deno
```

### Issue: LLM classification fails

```bash
# Check OpenAI API key
supabase secrets list

# Test key manually
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'

# Falls back to deterministic classification if OpenAI fails
```

### Issue: Database connection errors

```bash
# Check connection
supabase db ping

# Reset connection pool
supabase db reset --linked

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename LIKE 'seo_%';
```

### Issue: Fetching URLs times out

```typescript
// Increase timeout in diagnose function
const response = await fetch(url, {
  signal: AbortSignal.timeout(10000), // 10 seconds
});
```

---

## Performance Optimization

### Batch Processing

Process URLs in smaller batches during high load:

```sql
-- Prioritize by alert age
SELECT * FROM seo_affected_urls 
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 10;
```

### Caching

Sitemap cache is automatically managed. To clear:

```sql
DELETE FROM seo_sitemap_cache WHERE last_fetched_at < NOW() - INTERVAL '24 hours';
```

### Rate Limiting

Implement rate limiting for external API calls:

```typescript
const rateLimiter = new Map<string, number>();

function checkRateLimit(key: string, limit: number): boolean {
  const count = rateLimiter.get(key) || 0;
  if (count >= limit) return false;
  rateLimiter.set(key, count + 1);
  setTimeout(() => rateLimiter.delete(key), 60000); // Reset after 1 min
  return true;
}
```

---

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Service role key stored in env vars (not committed)
- [ ] OAuth credentials secured
- [ ] API rate limits configured
- [ ] User authentication enforced for fix approval
- [ ] Audit logging enabled
- [ ] Rollback procedures tested

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Diagnostic Success Rate**: `(successful / processed) * 100`
2. **Average Confidence Score**: Mean of classification confidence
3. **Auto-fix Application Rate**: `(applied / auto_fixable) * 100`
4. **Error Rate**: Failed diagnostics per hour

### Set Up Alerts

Using Supabase:

```sql
-- Create materialized view for monitoring
CREATE MATERIALIZED VIEW seo_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'complete') as completed,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  NOW() as refreshed_at
FROM seo_affected_urls;

-- Refresh hourly
SELECT cron.schedule(
  'refresh-seo-metrics',
  '0 * * * *',
  'REFRESH MATERIALIZED VIEW seo_metrics;'
);
```

---

## Rollback Procedures

### Rollback Database Migration

```bash
# Revert migration
supabase db reset --db-only

# Or manually
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -c "DROP TABLE IF EXISTS seo_alerts CASCADE;"
```

### Rollback Function Deployment

```bash
# Delete function
supabase functions delete seo-diagnose-url
```

### Rollback Applied Fixes

```sql
-- List recent fixes
SELECT * FROM seo_fix_proposals 
WHERE status = 'applied' 
AND applied_at > NOW() - INTERVAL '1 hour';

-- Rollback specific fix
-- Execute the rollback_sql from the fix record
```

---

## Next Steps After Deployment

1. ✅ Monitor first batch of diagnostics
2. ✅ Review classification accuracy
3. ✅ Tune confidence thresholds
4. ✅ Enable safe auto-fixes
5. ✅ Set up GSC API integration
6. ✅ Schedule automated ingestion
7. ✅ Train team on dashboard usage

---

## Support & Resources

- [API Documentation](./SEO_TRIAGE_API.md)
- [Autofix Rules](./SEO_AUTOFIX_RULES.md)
- [Database Schema](../supabase/migrations/20251218_seo_triage_schema.sql)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

**Deployment Complete!** 🎉

Your Indexability Triage Agent is now ready to transform GSC alerts into actionable intelligence.



