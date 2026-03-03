# SEO Triage Agent - API Reference

Complete API documentation for the Indexability Triage Agent Edge Functions.

---

## Base URL

```
https://[your-project-ref].supabase.co/functions/v1
```

## Authentication

All endpoints require authentication via Supabase:

```bash
Authorization: Bearer [YOUR_ANON_KEY]
# or
Authorization: Bearer [YOUR_SERVICE_ROLE_KEY]
```

---

## Endpoints

### 1. Ingest URLs - `/seo-gsc-ingest`

Ingest URLs from GSC API or manual input.

**Method**: `POST`

**Request Body**:
```typescript
{
  site_id: string;           // e.g., "parentsimple.org"
  source: "gsc_api" | "manual" | "cron";
  issue_type: string;        // e.g., "alternate_with_proper_canonical"
  urls: string[];            // Array of URLs to diagnose
  raw_payload?: object;      // Optional: Original GSC response
}
```

**Example Request**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-gsc-ingest \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "parentsimple.org",
    "source": "manual",
    "issue_type": "alternate_with_proper_canonical",
    "urls": [
      "https://www.parentsimple.org/articles/529-plans",
      "https://www.parentsimple.org/articles/college-savings"
    ]
  }'
```

**Response**:
```typescript
{
  success: true,
  data: {
    alert_id: string;        // UUID of created alert
    urls_added: number;      // Number of URLs successfully added
    urls_skipped: number;    // Number of duplicate URLs skipped
  },
  metadata: {
    site_id: string;
    issue_type: string;
    source: string;
  }
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request (missing fields, empty URLs array)
- `500` - Server error

---

### 2. Diagnose URLs - `/seo-diagnose-url`

Run diagnostics and classification on pending URLs.

**Method**: `POST`

**Request Body**:
```typescript
{
  url_ids?: string[];        // Optional: Specific URL IDs to diagnose
  alert_id?: string;         // Optional: Diagnose all URLs from this alert
  batch_size?: number;       // Default: 10, Max: 50
}
```

**Example Requests**:

**Diagnose by batch (first 10 pending URLs)**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-diagnose-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 10}'
```

**Diagnose specific URLs**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-diagnose-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url_ids": ["uuid-1", "uuid-2"],
    "batch_size": 5
  }'
```

**Diagnose all URLs from an alert**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-diagnose-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "alert-uuid-here"}'
```

**Response**:
```typescript
{
  success: true,
  data: {
    processed: number;       // Total URLs processed
    successful: number;      // Successfully diagnosed
    failed: number;          // Failed diagnostics
    diagnostics: [
      {
        url_id: string;
        fetch: {
          status_code: number;
          final_url: string;
          headers_subset: object;
          fetch_ms: number;
          redirects?: string[];
        };
        signals: {
          canonical?: string;
          meta_robots?: string;
          x_robots_tag?: string;
          title?: string;
          word_count?: number;
          has_noindex: boolean;
          has_nofollow: boolean;
        };
        canonical_target?: {
          url: string;
          status_code: number;
          self_canonical_ok: boolean;
          indexable_bool: boolean;
        };
        robots: {
          blocked_bool: boolean;
          matched_rule?: string;
          robots_txt_url: string;
        };
        sitemap: {
          in_sitemap_bool: boolean;
          sitemap_url?: string;
          canonical_in_sitemap?: boolean;
        };
        internal: {
          inlinks_count: number;
          orphan_bool: boolean;
          depth_estimate?: number;
        };
        classification: {
          root_cause: RootCauseType;
          confidence: number;      // 0.0 to 1.0
          recommended_actions: [
            {
              action: string;
              detail: string;
              priority: "high" | "medium" | "low";
            }
          ];
          autofix_plan: {
            safe_to_autofix: boolean;
            patches: [
              {
                fix_type: string;
                target: string;
                parameters: object;
                estimated_impact: string;
              }
            ];
            requires_human_review: string[];
          };
          notes: string;
        }
      }
    ];
    errors: [
      {
        url_id: string;
        error: string;
      }
    ];
  }
}
```

**Root Cause Types**:
- `INTENTIONAL_ALTERNATE_CANONICAL_OK`
- `CANONICAL_TARGET_NOT_INDEXABLE`
- `CANONICAL_MISMATCH_GOOGLE_CHOSE_OTHER`
- `NOINDEX_CONFLICT`
- `ROBOTS_BLOCKED`
- `SITEMAP_CANONICAL_MISMATCH`
- `DUPLICATE_NEAR_DUPLICATE_NEEDS_CONSOLIDATION`
- `WEAK_INTERNAL_SIGNALS_OR_ORPHAN`
- `SOFT_404_OR_THIN_VALUE`
- `SERVER_OR_RENDERING_ISSUE`
- `UNKNOWN_NEEDS_HUMAN_REVIEW`

**Status Codes**:
- `200` - Success (even if some URLs failed)
- `500` - Server error

---

### 3. Apply Fixes - `/seo-apply-fix`

Execute approved auto-fixes.

**Method**: `POST`

**Request Body**:
```typescript
{
  fix_ids: string[];         // Array of fix proposal IDs to apply
  approved_by: string;       // Email or "system"
  dry_run?: boolean;         // Default: false
}
```

**Example Requests**:

**Dry run (preview changes)**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-apply-fix \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fix_ids": ["fix-uuid-1", "fix-uuid-2"],
    "approved_by": "admin@parentsimple.org",
    "dry_run": true
  }'
```

**Apply fixes**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-apply-fix \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fix_ids": ["fix-uuid-1", "fix-uuid-2"],
    "approved_by": "admin@parentsimple.org"
  }'
```

**Response**:
```typescript
{
  success: true,
  data: {
    applied: number;         // Successfully applied
    failed: number;          // Failed to apply
    fixes: [
      {
        fix_id: string;
        status: "applied" | "failed" | "pending";
        error?: string;
      }
    ];
  }
}
```

**Status Codes**:
- `200` - Success (even if some fixes failed)
- `400` - Invalid request
- `404` - Fix IDs not found
- `500` - Server error

---

## Database Queries

### Get Dashboard Summary

```sql
SELECT * FROM seo_dashboard_summary WHERE site_id = 'parentsimple.org';
```

**Returns**:
```
site_id | issue_type | total_urls | diagnosed_urls | needs_review | error_urls | classified_urls | total_fixes | applied_fixes | latest_detection | latest_update
```

### Get URLs Needing Review

```sql
SELECT * FROM seo_urls_needing_review WHERE site_id = 'parentsimple.org';
```

### Get Auto-Fixable URLs

```sql
SELECT * FROM seo_auto_fixable_urls WHERE site_id = 'parentsimple.org';
```

### Get Pending URLs

```sql
SELECT * FROM seo_affected_urls 
WHERE status = 'pending' 
LIMIT 10;
```

### Get Diagnostics for a URL

```sql
SELECT 
  u.url,
  d.classification->>'root_cause' as root_cause,
  d.classification->>'confidence' as confidence,
  d.classification->'recommended_actions' as actions,
  d.created_at
FROM seo_url_diagnostics d
JOIN seo_affected_urls u ON d.url_id = u.id
WHERE u.url = 'https://www.parentsimple.org/articles/529-plans';
```

### Get Fix Audit Trail

```sql
SELECT 
  f.id,
  f.fix_type,
  f.status,
  f.applied_by,
  f.applied_at,
  f.approved_by,
  u.url,
  f.before_state,
  f.after_state
FROM seo_fix_proposals f
JOIN seo_affected_urls u ON f.url_id = u.id
JOIN seo_alerts a ON u.alert_id = a.id
WHERE a.site_id = 'parentsimple.org'
ORDER BY f.applied_at DESC;
```

---

## Webhooks (Optional)

You can configure webhooks to be notified when:

1. New alerts are ingested
2. Diagnostics complete
3. Fixes are applied
4. URLs need review

**Configuration** (in your CMS):
```typescript
{
  webhooks: {
    alert_ingested: "https://your-site.com/webhooks/seo-alert",
    diagnostic_complete: "https://your-site.com/webhooks/seo-diagnostic",
    fix_applied: "https://your-site.com/webhooks/seo-fix",
    needs_review: "https://your-site.com/webhooks/seo-review"
  }
}
```

**Webhook Payload**:
```typescript
{
  event: "diagnostic_complete",
  timestamp: "2025-12-18T10:30:00Z",
  data: {
    url_id: "uuid",
    url: "https://...",
    root_cause: "WEAK_INTERNAL_SIGNALS_OR_ORPHAN",
    confidence: 0.85,
    auto_fixable: false
  }
}
```

---

## Rate Limits

- **Ingest**: 100 requests/minute
- **Diagnose**: 50 requests/minute (rate limited by external fetches)
- **Apply Fix**: 20 requests/minute

**Recommendation**: Use batch processing for large volumes.

---

## Error Codes

| Code | Error | Resolution |
|------|-------|------------|
| `INVALID_REQUEST` | Missing or invalid parameters | Check request body schema |
| `FETCH_FAILED` | Unable to fetch URL | Check URL accessibility |
| `LLM_CLASSIFICATION_FAILED` | OpenAI API error | Check API key, retry with fallback |
| `DATABASE_ERROR` | Supabase query failed | Check connection, permissions |
| `FIX_EXECUTION_FAILED` | Fix couldn't be applied | Check CMS integration, rollback if needed |

---

## Best Practices

1. **Batch Processing**: Process URLs in batches of 10-20 for optimal performance
2. **Monitoring**: Set up alerts for failed diagnostics
3. **Dry Run First**: Always test fixes with `dry_run: true`
4. **Review Queue**: Regularly check `seo_urls_needing_review`
5. **Confidence Thresholds**: Only auto-apply fixes with confidence > 0.8

---

## SDK Examples

### TypeScript/JavaScript

```typescript
class SEOTriageClient {
  constructor(private supabaseUrl: string, private apiKey: string) {}

  async ingestUrls(siteId: string, urls: string[]) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/seo-gsc-ingest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site_id: siteId,
        source: 'manual',
        issue_type: 'alternate_with_proper_canonical',
        urls,
      }),
    });
    return response.json();
  }

  async diagnoseUrls(batchSize = 10) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/seo-diagnose-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch_size: batchSize }),
    });
    return response.json();
  }

  async applyFixes(fixIds: string[], approvedBy: string, dryRun = false) {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/seo-apply-fix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fix_ids: fixIds, approved_by: approvedBy, dry_run: dryRun }),
    });
    return response.json();
  }
}

// Usage
const client = new SEOTriageClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Ingest URLs
await client.ingestUrls('parentsimple.org', [
  'https://www.parentsimple.org/articles/529-plans',
]);

// Diagnose
const diagnostics = await client.diagnoseUrls(10);

// Apply fixes (dry run)
await client.applyFixes(['fix-uuid'], 'admin@example.com', true);
```

---

## Related Documentation

- [Autofix Rules & Safety](./SEO_AUTOFIX_RULES.md)
- [Deployment Guide](./SEO_DEPLOYMENT_GUIDE.md)
- [Database Schema](../supabase/migrations/20251218_seo_triage_schema.sql)



