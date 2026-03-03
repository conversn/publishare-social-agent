# ParentSimple Agent Quick Start Guide

**For:** ParentSimple Development Agent  
**Purpose:** Find and verify newly created articles for Early Years and Middle School categories

---

## 🎯 What Was Created

**20 new articles** were generated through the content strategy system:

- **11 Early Years articles** (target: 10) ✅
- **9 Middle School articles** (target: 10) ⚠️ Need 1 more

All articles were created using the proper workflow:
- `content-strategist` → `content_strategy` table → `batch-strategy-processor` → `agentic-content-gen`

---

## 🔍 How to Find the Articles

### Method 1: Use the View (Recommended)

```sql
SELECT 
  id,
  title,
  slug,
  status,
  primary_ux_category_slug,
  primary_ux_category_name,
  featured_image_url,
  html_body,
  canonical_url,
  created_at
FROM articles_with_primary_ux_category
WHERE site_id = 'parentsimple'
  AND primary_ux_category_slug IN ('early-years', 'middle-school')
  AND created_at >= '2025-12-01'
ORDER BY primary_ux_category_slug, created_at DESC;
```

### Method 2: Query by Article IDs

**Early Years IDs:**
```sql
SELECT * FROM articles
WHERE id IN (
  '20ff69b0-e0b2-44c4-bc59-b5c9493a7a6b',
  '66c884a6-1760-420a-b008-e0911bdb6e66',
  '9e9c927e-3e7f-46dc-8cdc-88559555da56',
  'c189896d-18cf-4ff0-91fd-b3eeeca8351d',
  '0af10a17-7637-42cd-885b-773761c55329',
  'c3a21928-030a-45a6-b506-873052c25c7d',
  '16da8097-b046-450c-abed-461dc592de86',
  'dad097ec-dc11-47ba-9acc-08338be767c1',
  '981c4192-46eb-41fe-903a-2e254d723e5c',
  'b9ebd73e-1255-4f0b-98fb-0713ef6a6459',
  '9a56d079-1a21-4c49-a748-a08950365153'
)
AND site_id = 'parentsimple';
```

**Middle School IDs:**
```sql
SELECT * FROM articles
WHERE id IN (
  '22dac303-0e2a-40a9-bb5b-bd1ca73668ad',
  '5910e087-b3c7-4023-a3ad-cff773d8d983',
  'f2f7e6ae-6a0d-48e9-9e52-7abf5a48e1af',
  '5c23064b-a5b1-49e2-92d0-05553bfbc82b',
  '0a0a5b01-9dca-49ea-9447-87f90188606d',
  'b6b7748c-c071-4c2d-bb03-547885c63e0d',
  'a63af696-4710-4871-80a0-b94f979bccc0',
  'f3793bcc-1dd8-44b7-b296-16e4697ddf90',
  '915b751c-7f67-42bb-be4a-d52ed8242b1b'
)
AND site_id = 'parentsimple';
```

### Method 3: Query by Status and Category

```sql
-- Get all draft articles for these categories
SELECT 
  a.id,
  a.title,
  a.slug,
  a.status,
  ux.slug as category_slug,
  ux.name as category_name
FROM articles a
INNER JOIN article_ux_categories auc ON a.id = auc.article_id AND auc.is_primary = true
INNER JOIN ux_categories ux ON auc.ux_category_id = ux.id
WHERE a.site_id = 'parentsimple'
  AND ux.slug IN ('early-years', 'middle-school')
  AND a.status = 'draft'
ORDER BY ux.slug, a.created_at DESC;
```

---

## 📊 Current Status

### Early Years (11 articles)
- **Published:** 1
- **Draft:** 10
- **With Images:** 1 (workflow completion in progress)
- **With HTML:** 2 (workflow completion in progress)

### Middle School (9 articles)
- **Published:** 0
- **Draft:** 9
- **With Images:** 0 (workflow completion in progress)
- **With HTML:** 0 (workflow completion in progress)

**Note:** Workflow completion script is running in background to generate images, HTML, and links for all articles.

---

## ✅ Verification Checklist

For each article, verify:

1. **Article exists in database**
   ```sql
   SELECT * FROM articles WHERE id = '{article_id}';
   ```

2. **UX category is assigned**
   ```sql
   SELECT 
     a.title,
     ux.slug as category_slug,
     ux.name as category_name
   FROM articles a
   INNER JOIN article_ux_categories auc ON a.id = auc.article_id AND auc.is_primary = true
   INNER JOIN ux_categories ux ON auc.ux_category_id = ux.id
   WHERE a.id = '{article_id}';
   ```

3. **Featured image exists**
   ```sql
   SELECT id, title, featured_image_url, featured_image_alt
   FROM articles
   WHERE id = '{article_id}' AND featured_image_url IS NOT NULL;
   ```

4. **HTML body exists** (use this for frontend, NOT content field)
   ```sql
   SELECT id, title, html_body
   FROM articles
   WHERE id = '{article_id}' AND html_body IS NOT NULL;
   ```

5. **Canonical URL is set**
   ```sql
   SELECT id, title, canonical_url
   FROM articles
   WHERE id = '{article_id}' AND canonical_url IS NOT NULL;
   ```

---

## 🚀 Frontend Integration

### Get Articles for Category Page

```typescript
// Example: Get published Early Years articles
const { data: articles, error } = await supabase
  .from('articles_with_primary_ux_category')
  .select('*')
  .eq('site_id', 'parentsimple')
  .eq('primary_ux_category_slug', 'early-years')
  .eq('status', 'published')
  .order('created_at', { ascending: false });
```

### Display Article

```typescript
// Get single article by slug
const { data: article } = await supabase
  .from('articles_with_primary_ux_category')
  .select('*')
  .eq('site_id', 'parentsimple')
  .eq('slug', articleSlug)
  .eq('status', 'published')
  .single();

// IMPORTANT: Use html_body for rendering, NOT content
<div dangerouslySetInnerHTML={{ __html: article.html_body }} />
```

### Category Routes

- **Early Years:** `/category/early-years`
- **Middle School:** `/category/middle-school`
- **Individual Articles:** `/{article-slug}`

---

## 📝 Publishing Articles

### Publish All Draft Articles

```sql
UPDATE articles
SET status = 'published'
WHERE site_id = 'parentsimple'
  AND id IN (
    SELECT a.id
    FROM articles a
    INNER JOIN article_ux_categories auc ON a.id = auc.article_id AND auc.is_primary = true
    INNER JOIN ux_categories ux ON auc.ux_category_id = ux.id
    WHERE ux.slug IN ('early-years', 'middle-school')
      AND a.status = 'draft'
      AND a.featured_image_url IS NOT NULL
      AND a.html_body IS NOT NULL
  );
```

### Publish Individual Article

```sql
UPDATE articles
SET status = 'published'
WHERE id = '{article_id}' AND site_id = 'parentsimple';
```

---

## 🔗 API Endpoints

### Supabase REST API

**Base URL:** `https://vpysqshhafthuxvokwqj.supabase.co/rest/v1/`

**Get Articles:**
```
GET /articles_with_primary_ux_category?site_id=eq.parentsimple&primary_ux_category_slug=eq.early-years&status=eq.published
```

**Headers:**
```
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

---

## 🐛 Troubleshooting

### Articles Not Showing on Site

1. **Check Status:** Articles must be `published`, not `draft`
2. **Check Frontend Query:** Ensure query filters by `status=published`
3. **Check UX Category:** Verify `article_ux_categories` has correct assignments
4. **Check Route:** Verify frontend route matches article slug

### Missing Images

- Check `featured_image_url` field
- Workflow completion script should generate images automatically
- If missing, call `ai-image-generator` edge function

### HTML Not Rendering

- **CRITICAL:** Use `html_body` field, NOT `content` field
- `content` is markdown source
- `html_body` is rendered HTML ready for display

### Category Page 404

- Verify category has published articles
- Check `ux_categories` table for category existence
- Verify frontend route matches category slug

---

## 📋 Complete Article List

See `docs/PARENTSIMPLE_NEW_ARTICLES_REPORT.md` for complete list with all article IDs, titles, slugs, and status.

---

## 🎯 Next Steps

1. **Wait for Workflow Completion** - Script is running to generate images and HTML
2. **Verify Articles** - Use queries above to check all articles have required elements
3. **Publish Articles** - Update status from 'draft' to 'published'
4. **Test Category Pages** - Verify `/category/early-years` and `/category/middle-school` work
5. **Test Individual Articles** - Verify article pages render correctly
6. **Check Navigation** - Ensure MegaMenu links work

---

## 📞 Support

- **Full Report:** `docs/PARENTSIMPLE_NEW_ARTICLES_REPORT.md`
- **System Integration:** `docs/CONTENT_STRATEGY_SYSTEM_INTEGRATION.md`
- **Content Strategist API:** `docs/CONTENT_STRATEGIST_FUNCTION.md`


