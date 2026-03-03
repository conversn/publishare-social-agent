# SEO Autofix Rules & Safety Guidelines

## Overview

This document defines which SEO fixes can be automatically applied (`safe_to_autofix=true`) and which require human review. These rules are enforced by the LLM classifier and the apply-fix function.

---

## Safety Levels

### 🟢 SAFE - Auto-approve without review

These fixes are **reversible**, **low-risk**, and affect **configuration/infrastructure** rather than content.

| Fix Type | Description | Impact | Rollback Method |
|----------|-------------|--------|-----------------|
| `REGENERATE_SITEMAP` | Rebuild sitemap.xml from current indexable URLs | Low | Cache invalidation |
| `NORMALIZE_CANONICAL_HOST` | Enforce www vs non-www preference | Low | Config revert |
| `ADD_REDIRECT` | Add 301 redirect (www→non-www or vice versa) | Low | Delete redirect rule |
| `REMOVE_FROM_SITEMAP` | Exclude URL from sitemap (if correctly noindex'd) | Low | Sitemap regeneration |

**Approval**: None required. Applied immediately if `safe_to_autofix=true`.

---

### 🟡 MODERATE - Requires approval flag

These fixes **modify site behavior** but are still **deterministic** and **reversible**.

| Fix Type | Description | Impact | Requires Review |
|----------|-------------|--------|-----------------|
| `ADD_TO_SITEMAP` | Include URL in sitemap (if incorrectly excluded) | Medium | Optional |
| `UPDATE_CANONICAL_TAG` | Change canonical URL in page metadata | Medium | Recommended |
| `ENFORCE_CANONICAL_POLICY` | Apply site-wide canonical rules | Medium | Yes |

**Approval**: Configurable. Can be auto-approved for trusted sites.

**Review Criteria**:
- Does the site have a documented canonical policy?
- Is this change consistent with editorial intent?

---

### 🔴 RISKY - Always requires human review

These fixes **modify content**, **affect user experience**, or are **complex/multi-step**.

| Fix Type | Description | Why Risky | Never Auto-Apply |
|----------|-------------|-----------|------------------|
| `REMOVE_NOINDEX` | Remove noindex from page/site | May expose unfinished content | Yes |
| `ADD_INTERNAL_LINKS` | Inject contextual internal links | Editorial judgment required | Yes |
| `CONSOLIDATE_DUPLICATES` | Merge near-duplicate pages | Content loss risk | Yes |
| `EXPAND_THIN_CONTENT` | Add content to thin pages | Quality control required | Yes |
| `FIX_RENDERING_ISSUE` | Modify page templates/JS | Technical risk | Yes |

**Approval**: ALWAYS requires human review.

**Process**:
1. Classifier sets `safe_to_autofix=false`
2. Creates fix proposal with detailed reasoning
3. Human reviews in dashboard
4. Manual approval → apply
5. Or manual edit → close proposal

---

## Root Cause → Fix Type Mapping

### INTENTIONAL_ALTERNATE_CANONICAL_OK
- **Fix**: None
- **Action**: Mark as reviewed, no fix needed
- **Confidence threshold**: 0.9+

### CANONICAL_TARGET_NOT_INDEXABLE
- **Safe Fixes**:
  - If target is 404: `ADD_REDIRECT` (from target back to this page)
  - If target has noindex: `UPDATE_CANONICAL_TAG` (set to self-canonical)
- **Risky Fixes**:
  - `REMOVE_NOINDEX` from canonical target

### CANONICAL_MISMATCH_GOOGLE_CHOSE_OTHER
- **Safe Fixes**:
  - `UPDATE_CANONICAL_TAG` to match Google's choice (if correct)
  - `ADD_REDIRECT` to Google's choice
- **Risky Fixes**:
  - Override Google's choice (requires strong signals)

### NOINDEX_CONFLICT
- **Risky Fixes**:
  - `REMOVE_NOINDEX` (only after human confirms intent)
- **Safe Fixes**:
  - `REMOVE_FROM_SITEMAP` (if noindex is intentional)

### ROBOTS_BLOCKED
- **Moderate Fixes**:
  - `UPDATE_ROBOTS_TXT` (if rule is clearly erroneous)
- **Risky Fixes**:
  - Override robots.txt (may be security policy)

### SITEMAP_CANONICAL_MISMATCH
- **Safe Fixes**:
  - `REGENERATE_SITEMAP` (enforce canonical-only policy)
  - `NORMALIZE_CANONICAL_HOST` (if www/non-www issue)

### WEAK_INTERNAL_SIGNALS_OR_ORPHAN
- **Risky Fixes**:
  - `ADD_INTERNAL_LINKS` (editorial judgment)
- **Safe Fixes**:
  - `ADD_TO_SITEMAP` (if missing)

### SOFT_404_OR_THIN_VALUE
- **Risky Fixes**:
  - `EXPAND_THIN_CONTENT`
  - `CONSOLIDATE_DUPLICATES`
- **Safe Fixes**:
  - None (requires content strategy decision)

### SERVER_OR_RENDERING_ISSUE
- **Risky Fixes**:
  - All (requires technical debugging)

### UNKNOWN_NEEDS_HUMAN_REVIEW
- **No Auto-Fixes**: All require human analysis

---

## Confidence Thresholds

The classifier assigns a confidence score (0.0 to 1.0). This affects auto-fix eligibility:

| Confidence | Action |
|------------|--------|
| **0.9 - 1.0** | High confidence → Apply safe fixes automatically |
| **0.7 - 0.89** | Medium confidence → Apply safe fixes, flag moderate for review |
| **0.5 - 0.69** | Low confidence → All fixes require review |
| **< 0.5** | Very low confidence → Mark as `UNKNOWN_NEEDS_HUMAN_REVIEW` |

**Override**: Humans can always approve fixes below confidence threshold.

---

## Rollback Procedures

All applied fixes store:
- `before_state`: State before fix
- `after_state`: State after fix
- `rollback_sql`: SQL to undo (if applicable)

### Rollback Process

```bash
# Via API
curl -X POST https://your-project.supabase.co/functions/v1/seo-apply-fix \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"action": "rollback", "fix_id": "uuid-here"}'
```

```sql
-- Via SQL (manual)
SELECT rollback_sql FROM seo_fix_proposals WHERE id = 'uuid-here';
-- Copy the SQL and execute it

UPDATE seo_fix_proposals 
SET status = 'rolled_back' 
WHERE id = 'uuid-here';
```

---

## Audit Trail

Every fix is logged with:
- **Applied by**: Email or 'system'
- **Applied at**: Timestamp
- **Approved by**: Email (if required)
- **Before/after state**: Full context
- **Rollback SQL**: Undo command

Query audit trail:

```sql
SELECT 
  f.id,
  f.fix_type,
  f.status,
  f.applied_by,
  f.applied_at,
  f.approved_by,
  u.url,
  a.site_id
FROM seo_fix_proposals f
JOIN seo_affected_urls u ON f.url_id = u.id
JOIN seo_alerts a ON u.alert_id = a.id
WHERE a.site_id = 'parentsimple.org'
ORDER BY f.applied_at DESC;
```

---

## Error Handling

If a fix fails:
1. Status → `failed`
2. `error_message` stored
3. Original state preserved
4. Alert sent to admin (if configured)
5. Manual review queue

**Retry logic**: Automatic retry for transient errors (network, rate limits). Max 3 retries.

---

## Integration with Publishare CMS

For fixes that modify content/configuration, you must implement these hooks:

### Required CMS Functions

```typescript
// 1. Sitemap regeneration
async function regenerateSitemap(siteId: string): Promise<void>

// 2. Canonical policy update
async function updateCanonicalPolicy(siteId: string, policy: CanonicalPolicy): Promise<void>

// 3. Redirect management
async function addRedirect(from: string, to: string, type: 301 | 302): Promise<void>

// 4. Content metadata update (requires approval)
async function updatePageMetadata(pageId: string, updates: MetadataUpdates): Promise<void>
```

### Hook Registration

In your CMS config:

```typescript
// publishare.config.ts
export default {
  seo: {
    autofix: {
      enabled: true,
      approval_required_by_default: false, // For SAFE fixes
      hooks: {
        regenerateSitemap: './hooks/regenerate-sitemap',
        updateCanonicalPolicy: './hooks/update-canonical',
        addRedirect: './hooks/add-redirect',
      },
    },
  },
};
```

---

## Testing Auto-Fixes

### Dry Run Mode

Always test fixes in dry-run mode first:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/seo-apply-fix \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "fix_ids": ["uuid-1", "uuid-2"],
    "approved_by": "test@example.com",
    "dry_run": true
  }'
```

Output shows what **would** happen without applying changes.

### Staging Environment

Deploy to staging first:

1. Run diagnostics on staging URLs
2. Review classifications
3. Apply safe fixes
4. Verify with GSC staging property
5. Promote to production

---

## Dashboard Integration

Recommended UI flow:

```
┌─────────────────────────────────────┐
│  SEO Triage Dashboard               │
├─────────────────────────────────────┤
│                                     │
│  [Pending Diagnostics: 15]          │
│  [Needs Review: 8]                  │
│  [Auto-fixable: 23]                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Auto-Fixable (SAFE)         │   │
│  ├─────────────────────────────┤   │
│  │ ✓ Regenerate sitemap (5)    │   │
│  │ ✓ Normalize host (12)       │   │
│  │ ✓ Add redirects (6)         │   │
│  │                             │   │
│  │ [Apply All Safe Fixes]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Needs Review (RISKY)        │   │
│  ├─────────────────────────────┤   │
│  │ • Remove noindex (3) ⚠️     │   │
│  │ • Update canonical (5) ⚠️   │   │
│  │                             │   │
│  │ [Review Each]               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Best Practices

1. **Start Conservative**: Enable only SAFE fixes initially
2. **Monitor Closely**: Review audit logs after each batch
3. **Use Dry Run**: Always test before applying to production
4. **Set Confidence Thresholds**: Tune based on your risk tolerance
5. **Human in Loop**: Keep editorial team involved in content decisions
6. **Rollback Ready**: Test rollback procedures before needing them
7. **Document Policies**: Maintain site-specific SEO policies in CMS

---

## FAQ

**Q: Can I override the classifier's safety recommendation?**
A: Yes, humans can approve any fix regardless of `safe_to_autofix` flag.

**Q: What if Google Search Console and my diagnostics disagree?**
A: GSC takes precedence. Use `gsc_hint` in classification to inform decisions.

**Q: How do I disable auto-fixes for a specific site?**
A: Set `autofix_enabled: false` in `sites_seo_config` table.

**Q: Can I schedule auto-fixes to run nightly?**
A: Yes, via cron job. Only SAFE fixes with confidence > 0.9 will auto-apply.

**Q: What happens if a fix is applied but Google still reports the issue?**
A: Mark as `needs_review`. May require re-crawl request or different fix strategy.

---

## Related Documentation

- [API Reference](./SEO_TRIAGE_API.md)
- [Deployment Guide](./SEO_DEPLOYMENT_GUIDE.md)
- [LLM Classifier Prompts](../supabase/functions/seo-shared/prompts.ts)
- [Database Schema](../supabase/migrations/20251218_seo_triage_schema.sql)



