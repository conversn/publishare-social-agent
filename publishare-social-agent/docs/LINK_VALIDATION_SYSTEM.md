# Link Validation System

## Overview

The Link Validation System prevents 404 errors from broken internal links by:
1. **Validating** all internal links to ensure they point to existing articles
2. **Tracking** validation results in a database table
3. **Repairing** broken links automatically by finding alternatives or removing them
4. **Preventing** broken links from being created in the first place

---

## Problem Solved

**Before**: Internal linking was generating 404s because:
- Links were generated from keywords, not real articles
- URLs didn't match frontend routing (e.g., `/articles/` vs `/library/`)
- No validation that target articles exist
- No mechanism to repair broken links

**After**: 
- ✅ Only real articles are suggested
- ✅ URLs use correct route patterns per site
- ✅ All links are validated before insertion
- ✅ Broken links are automatically repaired

---

## Components

### 1. Database Migration

**File**: `supabase/migrations/20250129000000_add_link_validation_system.sql`

**Adds**:
- `sites.article_route_path` - Stores frontend route pattern per site
- `link_validation_results` table - Tracks validation status of all links
- `broken_links_summary` view - Quick overview of broken links

**Route Paths**:
- RateRoots: `/library`
- SeniorSimple: `/articles`
- Default: `/articles`

### 2. Link Validator Edge Function

**File**: `supabase/functions/link-validator/index.ts`

**Purpose**: Validates internal links in articles

**Usage**:
```typescript
POST /functions/v1/link-validator
{
  "article_id": "uuid",      // Optional: validate single article
  "site_id": "rateroots",     // Optional: validate all articles for site
  "validate_all": true,      // Optional: validate all articles
  "repair": true              // Optional: auto-repair broken links
}
```

**Response**:
```json
{
  "success": true,
  "validated": 48,
  "links_checked": 156,
  "broken_links": 12,
  "repaired": 8,
  "results": [...]
}
```

### 3. Link Repair Edge Function

**File**: `supabase/functions/link-repair/index.ts`

**Purpose**: Automatically repairs broken links

**How it works**:
1. Finds alternative articles with similar content
2. Replaces broken link with alternative
3. If no alternative found, removes the link (optional)

**Usage**:
```typescript
POST /functions/v1/link-repair
{
  "article_id": "uuid",
  "site_id": "rateroots",
  "repair_all": true,
  "remove_if_no_match": true
}
```

### 4. Updated AI Link Suggestions

**File**: `supabase/functions/ai-link-suggestions/index.ts`

**Changes**:
- ✅ Only suggests real articles (no fake keyword-based suggestions)
- ✅ Filters by `site_id` to ensure site-specific links
- ✅ Uses correct route path from `sites.article_route_path`
- ✅ Removed fake suggestions that caused 404s

**Before**:
```typescript
// Generated fake links from keywords
url: `/articles/${keyword}` // ❌ 404
```

**After**:
```typescript
// Only real articles with correct routes
url: `${routePath}/${article.slug}` // ✅ Valid
```

### 5. Validation Script

**File**: `scripts/validate-all-links.js`

**Purpose**: Manual or scheduled link validation

**Usage**:
```bash
# Validate all links
node scripts/validate-all-links.js

# Validate for specific site
node scripts/validate-all-links.js --site rateroots

# Validate and repair
node scripts/validate-all-links.js --site rateroots --repair
```

---

## Workflow Integration

### During Article Generation

The `agentic-content-gen` function now:
1. Passes `site_id` to `ai-link-suggestions`
2. Only receives real article suggestions
3. Links use correct route patterns
4. All links are validated before insertion

### Post-Generation Validation

Run validation after batch content generation:

```bash
# Validate all RateRoots articles
node scripts/validate-all-links.js --site rateroots

# If broken links found, repair them
node scripts/validate-all-links.js --site rateroots --repair
```

### Scheduled Validation

Set up a cron job to validate links periodically:

```bash
# Daily validation at 2 AM
0 2 * * * cd /path/to/publishare && node scripts/validate-all-links.js
```

---

## Database Schema

### `link_validation_results` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `article_id` | UUID | Article containing the link |
| `link_url` | TEXT | The link URL |
| `link_text` | TEXT | Anchor text |
| `target_article_id` | UUID | Target article (if valid) |
| `is_valid` | BOOLEAN | Whether link is valid |
| `validation_status` | VARCHAR | 'valid', 'broken', 'pending', 'repaired' |
| `error_message` | TEXT | Error if broken |
| `last_validated_at` | TIMESTAMP | Last validation time |

### `sites.article_route_path` Column

Stores the frontend route pattern for articles:
- RateRoots: `/library`
- SeniorSimple: `/articles`
- Default: `/articles`

---

## Querying Broken Links

### Get all broken links for a site:

```sql
SELECT 
  a.title as article_title,
  a.slug as article_slug,
  lvr.link_url,
  lvr.link_text,
  lvr.error_message
FROM link_validation_results lvr
JOIN articles a ON a.id = lvr.article_id
WHERE lvr.is_valid = false
  AND a.site_id = 'rateroots'
ORDER BY a.title;
```

### Get broken links summary:

```sql
SELECT * FROM broken_links_summary;
```

---

## Best Practices

1. **Validate after batch generation**: Always run validation after generating multiple articles
2. **Repair before publishing**: Fix broken links before articles go live
3. **Schedule regular validation**: Set up weekly/monthly validation jobs
4. **Monitor broken_links_summary**: Check this view regularly for issues
5. **Use site_id**: Always pass `site_id` when generating links

---

## Troubleshooting

### Links still showing 404s

1. **Check route path**: Verify `sites.article_route_path` is correct
2. **Validate links**: Run `link-validator` to find broken links
3. **Check frontend routing**: Ensure frontend routes match `article_route_path`
4. **Repair links**: Run `link-repair` to fix broken links

### No suggestions generated

1. **Check site_id**: Ensure `site_id` is passed to `ai-link-suggestions`
2. **Check published articles**: Only published articles are suggested
3. **Check site filter**: Suggestions are filtered by `site_id`

### Validation not working

1. **Check migration**: Ensure migration `20250129000000_add_link_validation_system.sql` is applied
2. **Check route paths**: Verify `sites.article_route_path` is set
3. **Check permissions**: Ensure service role key has access

---

## Deployment Checklist

- [ ] Deploy migration: `20250129000000_add_link_validation_system.sql`
- [ ] Deploy `link-validator` function
- [ ] Deploy `link-repair` function
- [ ] Deploy updated `ai-link-suggestions` function
- [ ] Update `agentic-content-gen` to pass `site_id`
- [ ] Run initial validation: `node scripts/validate-all-links.js`
- [ ] Repair existing broken links: `node scripts/validate-all-links.js --repair`
- [ ] Set up scheduled validation (optional)

---

**Last Updated**: 2025-01-29
**Status**: ✅ Ready for Deployment




