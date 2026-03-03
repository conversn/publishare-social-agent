# UX Categories - Quick Start Guide

## Overview

The UX Category system separates **content strategy categories** (internal) from **user-facing categories** (navigation). This allows each site to have its own navigation structure while maintaining content strategy organization.

---

## Key Concepts

### Content Strategy Category (`articles.category`)
- **Purpose**: Internal organization, SEO grouping, workflow automation
- **Examples**: `"business-loans"`, `"sba-loans"`, `"equipment-financing"`
- **Set by**: Content strategy, agentic content generation
- **Used for**: Content planning, batch processing, reporting

### UX Category (`ux_categories` table)
- **Purpose**: User-facing navigation, filtering, category pages
- **Examples**: `"Guides"`, `"Resources"`, `"Comparisons"`, `"Industry Guides"`
- **Set by**: Site-specific taxonomy (each site defines its own)
- **Used for**: Navigation menus, article filtering, `/guides`, `/resources` pages

### Auto-Mapping (`content_category_ux_mapping`)
- **Purpose**: Automatically assign UX categories based on content strategy categories
- **Example**: `"business-loans"` → `"Guides"`
- **Set by**: Migration or CMS admin
- **Used for**: Automatic assignment during article creation

---

## For Frontend Developers

### Get Articles with UX Categories

```typescript
// Using the helper view
const { data: articles } = await supabase
  .from('articles_with_ux_categories')
  .select('*')
  .eq('site_id', 'rateroots')
  .eq('status', 'published');

// Each article has:
// - ux_categories: [{ id, name, slug, is_primary, display_order }, ...]
```

### Get Primary UX Category

```typescript
// Using the helper view
const { data: articles } = await supabase
  .from('articles_with_primary_ux_category')
  .select('*')
  .eq('site_id', 'rateroots')
  .eq('status', 'published');

// Each article has:
// - primary_ux_category_id
// - primary_ux_category_name
// - primary_ux_category_slug
```

### Get UX Categories for Navigation

```typescript
const { data: categories } = await supabase
  .from('ux_categories')
  .select('*')
  .eq('site_id', 'rateroots')
  .eq('is_active', true)
  .order('display_order');

// Returns: [{ id, name, slug, description, display_order, ... }, ...]
```

### Filter Articles by UX Category

```typescript
const { data: articles } = await supabase
  .from('articles')
  .select(`
    *,
    article_ux_categories!inner(
      ux_categories!inner(
        id,
        name,
        slug
      )
    )
  `)
  .eq('site_id', 'rateroots')
  .eq('status', 'published')
  .eq('article_ux_categories.ux_categories.slug', 'guides');
```

### Display Breadcrumb

```typescript
const article = await getArticle(articleId);

<Breadcrumb>
  <Link href="/">Home</Link>
  <Link href={`/${article.primary_ux_category_slug}`}>
    {article.primary_ux_category_name}
  </Link>
  <span>{article.title}</span>
</Breadcrumb>
```

### Display Category Tags

```typescript
const article = await getArticle(articleId);

<div className="categories">
  {article.ux_categories.map(cat => (
    <Link 
      key={cat.id} 
      href={`/${cat.slug}`}
      className={cat.is_primary ? 'primary' : ''}
    >
      {cat.name}
    </Link>
  ))}
</div>
```

---

## For Content Creators

### Creating Articles

Articles are created with content strategy categories (automatically):

```typescript
// Via agentic-content-gen
{
  topic: "How to get a business loan",
  site_id: "rateroots",
  content_type: "business-loans" // Content strategy category
}

// UX category automatically assigned via mapping:
// "business-loans" → "Guides"
```

### Manual Assignment

If you need to manually assign or change UX categories:

```typescript
// Assign primary UX category
await supabase
  .from('article_ux_categories')
  .upsert({
    article_id: articleId,
    ux_category_id: uxCategoryId,
    is_primary: true
  }, {
    onConflict: 'article_id,ux_category_id'
  });

// Assign additional UX categories
await supabase
  .from('article_ux_categories')
  .insert({
    article_id: articleId,
    ux_category_id: anotherUxCategoryId,
    is_primary: false
  });
```

---

## For Site Administrators

### Create UX Categories for Your Site

```sql
INSERT INTO ux_categories (site_id, name, slug, description, display_order) VALUES
('yoursite', 'Guides', 'guides', 'Step-by-step guides', 1),
('yoursite', 'Resources', 'resources', 'Reference materials', 2),
('yoursite', 'News', 'news', 'Latest updates', 3);
```

### Create Mapping Rules

```sql
INSERT INTO content_category_ux_mapping 
  (site_id, content_category, ux_category_id, is_default) 
SELECT 
  'yoursite',
  'your-content-category',
  ux.id,
  TRUE
FROM ux_categories ux
WHERE ux.site_id = 'yoursite' AND ux.slug = 'guides';
```

### Update Existing Articles

```sql
-- Auto-assign UX categories to existing articles
INSERT INTO article_ux_categories (article_id, ux_category_id, is_primary)
SELECT 
  a.id,
  mapping.ux_category_id,
  TRUE
FROM articles a
INNER JOIN content_category_ux_mapping mapping 
  ON a.site_id = mapping.site_id 
  AND a.category = mapping.content_category
WHERE a.site_id = 'yoursite'
  AND mapping.is_default = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM article_ux_categories 
    WHERE article_id = a.id
  );
```

---

## Current RateRoots Setup

### UX Categories Available

- **Guides** (`/guides`) - Step-by-step guides and tutorials
- **Resources** (`/resources`) - Reference materials and tools
- **Comparisons** (`/comparisons`) - Product and service comparisons
- **Industry Guides** (`/industry-guides`) - Industry-specific financing guides
- **News & Updates** (`/news`) - Industry news and updates

### Auto-Mapping Active

All existing RateRoots articles have been auto-assigned UX categories based on their content strategy categories.

---

## Migration Status

✅ **Migration Deployed**: `20250128000000_create_ux_categories.sql`
✅ **RateRoots UX Categories**: Created
✅ **Mapping Rules**: Created
✅ **Existing Articles**: Auto-assigned
✅ **agentic-content-gen**: Updated to auto-assign UX categories

---

## Next Steps

1. **Update Frontend**: Use UX categories for navigation and filtering
2. **Create Category Pages**: Build `/guides`, `/resources`, etc. pages
3. **Add to CMS UI**: Allow manual UX category assignment in article editor
4. **Other Sites**: Create UX categories for seniorsimple, mortgagesimple, etc.




