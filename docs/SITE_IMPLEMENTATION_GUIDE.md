# Publishare CMS - Site Implementation Guide

## Overview

This guide provides complete field mappings and integration patterns for developers connecting sites to the Publishare CMS. Use this to ensure all article fields are correctly mapped and all CMS features are properly utilized.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Field Mappings](#field-mappings)
4. [Edge Functions](#edge-functions)
5. [Integration Patterns](#integration-patterns)
6. [Example Implementations](#example-implementations)
7. [Best Practices](#best-practices)

---

## Database Schema

### Articles Table

**Table Name**: `articles`

**Primary Key**: `id` (UUID)

**Foreign Keys**:
- `user_id` → `auth.users.id` (Account owner)
- `author_id` → `authors.id` (Content author)
- `site_id` → `sites.id` (Site/brand)
- `category_id` → `article_categories.id` (Optional)

---

## Field Mappings

### Core Content Fields

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `id` | UUID | Auto | Unique article identifier | `"50ff8e32-8618-412e-a963-d9febd402b54"` |
| `title` | string | ✅ Yes | Article title | `"How to Get a Business Loan"` |
| `slug` | string | ✅ Yes | URL-friendly identifier | `"how-to-get-a-business-loan"` |
| `content` | text | ✅ Yes | Markdown content | `"# Introduction\n\nContent here..."` |
| `html_body` | text | Auto | HTML converted from markdown | `"<h1>Introduction</h1><p>Content here...</p>"` |
| `excerpt` | text | ✅ Yes | Short description (150-200 chars) | `"Learn how to secure business financing..."` |
| `status` | enum | ✅ Yes | Article status | `"published"`, `"draft"`, `"archived"` |
| `category` | string | Optional | **Content strategy** category (internal) | `"business-loans"` |
| `category_id` | UUID | Optional | Legacy category reference | `"uuid-here"` |
| (via `article_ux_categories`) | array | Auto | **UX categories** (user-facing) | `[{name: "Guides", slug: "guides"}]` |

### Ownership & Authorship

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `user_id` | UUID | ✅ Yes | Account owner (from auth) | `"user-uuid"` |
| `author_id` | UUID | Optional | Content author | `"author-uuid"` |
| `site_id` | string | ✅ Yes | Site/brand identifier | `"rateroots"`, `"seniorsimple"` |

### SEO Metadata

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `meta_title` | string | Auto | SEO title (50-60 chars) | `"Business Loans Guide 2025"` |
| `meta_description` | text | Auto | SEO description (150-160 chars) | `"Complete guide to business loans..."` |
| `focus_keyword` | string | Optional | Primary SEO keyword | `"business loans"` |
| `canonical_url` | string | Auto | Canonical URL | `"https://rateroots.com/how-to-get-a-business-loan"` |
| `breadcrumb_title` | string | Auto | Breadcrumb text (40-60 chars) | `"Business Loans Guide"` |

### Social Media Metadata

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `og_title` | string | Auto | Open Graph title | `"Business Loans Guide 2025"` |
| `og_description` | text | Auto | Open Graph description | `"Complete guide to business loans..."` |
| `og_image` | string | Auto | Open Graph image URL | `"https://.../featured-image.jpg"` |
| `twitter_title` | string | Auto | Twitter card title | `"Business Loans Guide 2025"` |
| `twitter_description` | text | Auto | Twitter card description | `"Complete guide to business loans..."` |
| `twitter_image` | string | Auto | Twitter card image URL | `"https://.../featured-image.jpg"` |

### Featured Image

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `featured_image_url` | string | Optional | Featured image URL | `"https://.../image.jpg"` |
| `featured_image_alt` | string | Auto | Image alt text | `"Business Loans Guide - Featured image"` |

### AEO (Answer Engine Optimization) Fields

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `aeo_summary` | text | Auto | Answer-first summary (100 words) | `"Business loans are financing..."` |
| `aeo_content_type` | enum | Auto | Content type | `"how-to"`, `"definition"`, `"comparison"` |
| `aeo_answer_first` | boolean | Auto | Answer in first 100 words | `true` |
| `content_structure` | jsonb | Auto | Content structure analysis | `{"h1": "...", "h2": [...], "h3": [...]}` |
| `data_points` | array | Auto | Extracted data points | `["$50K average", "5% interest rate"]` |
| `citations` | array | Auto | Source citations | `["source1.com", "source2.com"]` |
| `schema_markup` | jsonb | Auto | JSON-LD schema | `{"@context": "...", "@type": "Article"}` |
| `schema_validated` | boolean | Auto | Schema validation status | `true` |
| `speakable_summary` | text | Auto | Voice-friendly summary | `"Business loans are..."` |

### Content Organization

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `persona` | string | Optional | Content persona/voice | `"Marcus Chen"` |
| `tags` | array | Optional | Content tags | `["business-loans", "financing", "sba"]` |
| `scheduled_date` | timestamp | Optional | Scheduled publish date | `"2025-12-01T10:00:00Z"` |

### Timestamps

| Field Name | Type | Required | Description | Example |
|------------|------|----------|-------------|---------|
| `created_at` | timestamp | Auto | Creation timestamp | `"2025-11-28T04:20:38Z"` |
| `updated_at` | timestamp | Auto | Last update timestamp | `"2025-11-28T04:20:38Z"` |

### UI-Only Fields (Not in Database)

| Field Name | Type | Description | Notes |
|------------|------|-------------|-------|
| `readability_score` | number | Readability score (0-100) | Calculated in UI only |
| `seo_score` | number | SEO score (0-100) | Calculated in UI only |

---

## API Endpoints

### Base URL
```
https://vpysqshhafthuxvokwqj.supabase.co
```

### REST API

#### Get Articles
```http
GET /rest/v1/articles?site_id=eq.rateroots&status=eq.published
Headers:
  apikey: YOUR_ANON_KEY
  Authorization: Bearer YOUR_ANON_KEY
```

#### Get Single Article
```http
GET /rest/v1/articles?id=eq.{article_id}
Headers:
  apikey: YOUR_ANON_KEY
  Authorization: Bearer YOUR_ANON_KEY
```

#### Create Article
```http
POST /rest/v1/articles
Headers:
  apikey: YOUR_SERVICE_ROLE_KEY
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  Prefer: return=representation
Body:
{
  "title": "Article Title",
  "slug": "article-slug",
  "content": "Markdown content...",
  "excerpt": "Short description",
  "site_id": "rateroots",
  "status": "draft",
  "user_id": "user-uuid",
  "author_id": "author-uuid"
}
```

#### Update Article
```http
PATCH /rest/v1/articles?id=eq.{article_id}
Headers:
  apikey: YOUR_SERVICE_ROLE_KEY
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
Body:
{
  "title": "Updated Title",
  "status": "published"
}
```

---

## Edge Functions

### Agentic Content Generation

**Endpoint**: `/functions/v1/agentic-content-gen`

**Purpose**: Generate complete articles with all metadata, images, and assets

**Request**:
```json
{
  "topic": "How to get a business loan",
  "title": "Complete Guide to Business Loans",
  "site_id": "rateroots",
  "target_audience": "Small business owners",
  "content_type": "article",
  "content_length": 2000,
  "aeo_optimized": true,
  "aeo_content_type": "how-to",
  "generate_image": true,
  "generate_links": true,
  "convert_to_html": true,
  "auto_publish": false,
  "focus_keyword": "business loans",
  "tags": ["business-loans", "financing"],
  "persona": "Marcus Chen"
}
```

**Response**:
```json
{
  "article_id": "uuid",
  "id": "uuid",
  "title": "Complete Guide to Business Loans",
  "content": "Markdown content...",
  "html_body": "<h1>Complete Guide...</h1>",
  "status": "draft",
  "featured_image_url": "https://.../image.jpg",
  "aeo_summary": "Business loans are...",
  "aeo_content_type": "how-to",
  "schema_markup": {...},
  "canonical_url": "https://rateroots.com/...",
  "og_title": "...",
  "og_description": "...",
  "og_image": "https://.../image.jpg"
}
```

### Article Metadata Enhancer

**Endpoint**: `/functions/v1/article-metadata-enhancer`

**Purpose**: Generate missing metadata for existing articles

**Request**:
```json
{
  "site_id": "rateroots",
  "limit": 100
}
```

**Response**:
```json
{
  "success": true,
  "processed": 48,
  "total_updated_fields": 428,
  "total_errors": 0,
  "results": [...]
}
```

### Markdown to HTML Converter

**Endpoint**: `/functions/v1/markdown-to-html`

**Purpose**: Convert markdown content to HTML

**Request**:
```json
{
  "markdown": "# Title\n\nContent...",
  "article_id": "uuid",
  "conversionType": "enhanced",
  "styling": "modern"
}
```

**Response**:
```json
{
  "html": "<h1>Title</h1><p>Content...</p>",
  "html_body": "<h1>Title</h1><p>Content...</p>"
}
```

### AI Image Generator

**Endpoint**: `/functions/v1/ai-image-generator`

**Purpose**: Generate featured images for articles

**Request**:
```json
{
  "title": "Article Title",
  "content": "Article excerpt",
  "article_id": "uuid",
  "style": "professional",
  "aspect_ratio": "16:9",
  "imageType": "featured"
}
```

**Response**:
```json
{
  "imageUrl": "https://.../image.jpg",
  "image_url": "https://.../image.jpg",
  "success": true
}
```

---

## Integration Patterns

### Pattern 1: Fetch Published Articles for Site

```javascript
const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

async function getPublishedArticles(siteId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?site_id=eq.${siteId}&status=eq.published&order=created_at.desc`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  
  return await response.json();
}
```

### Pattern 2: Render Article with All Metadata

```javascript
async function renderArticle(articleId) {
  const article = await getArticle(articleId);
  
  return {
    // Core content
    title: article.title,
    content: article.html_body || article.content, // Prefer HTML
    excerpt: article.excerpt,
    
    // SEO
    metaTitle: article.meta_title || article.title,
    metaDescription: article.meta_description || article.excerpt,
    canonicalUrl: article.canonical_url,
    focusKeyword: article.focus_keyword,
    
    // Social
    ogTitle: article.og_title || article.title,
    ogDescription: article.og_description || article.excerpt,
    ogImage: article.og_image || article.featured_image_url,
    twitterTitle: article.twitter_title || article.title,
    twitterDescription: article.twitter_description || article.excerpt,
    twitterImage: article.twitter_image || article.featured_image_url,
    
    // Featured image
    featuredImage: article.featured_image_url,
    featuredImageAlt: article.featured_image_alt,
    
    // Schema
    schemaMarkup: article.schema_markup,
    
    // Metadata
    publishedAt: article.created_at,
    updatedAt: article.updated_at,
    author: article.author_id,
    tags: article.tags || []
  };
}
```

### Pattern 3: Generate Article via Agentic CMS

```javascript
async function generateArticle(params) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/agentic-content-gen`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        topic: params.topic,
        title: params.title,
        site_id: params.siteId,
        target_audience: params.audience,
        content_length: params.wordCount || 2000,
        aeo_optimized: true,
        generate_image: true,
        generate_links: true,
        convert_to_html: true,
        focus_keyword: params.keyword,
        tags: params.tags,
        auto_publish: false
      })
    }
  );
  
  return await response.json();
}
```

### Pattern 4: Update Article Metadata

```javascript
async function updateArticleMetadata(articleId, updates) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?id=eq.${articleId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString()
      })
    }
  );
  
  return await response.json();
}
```

---

## Field Mapping Reference

### Required Fields for Article Creation

```typescript
interface RequiredArticleFields {
  title: string;           // Article title
  slug: string;            // URL-friendly identifier
  content: string;         // Markdown content
  excerpt: string;         // Short description (150-200 chars)
  status: 'draft' | 'published' | 'archived';
  user_id: string;         // Account owner UUID
  site_id: string;        // Site identifier
}
```

### Auto-Generated Fields (Don't Set Manually)

These fields are automatically generated by the CMS:

- `id` - UUID
- `html_body` - Generated from markdown
- `meta_title` - Generated from title
- `meta_description` - Generated from excerpt
- `canonical_url` - Generated from site domain + slug
- `breadcrumb_title` - Generated from title
- `og_title`, `og_description`, `og_image` - Generated from content
- `twitter_title`, `twitter_description`, `twitter_image` - Generated from content
- `featured_image_alt` - Generated when image is set
- `aeo_summary`, `aeo_content_type`, `schema_markup` - Generated by AEO functions
- `created_at`, `updated_at` - Timestamps

### Optional Fields (Set When Available)

```typescript
interface OptionalArticleFields {
  author_id?: string;           // Author UUID
  category?: string;             // Content strategy category (internal)
  category_id?: string;          // Legacy category UUID
  ux_categories?: Array<{        // User-facing categories (via junction table)
    id: string;
    name: string;
    slug: string;
    is_primary: boolean;
  }>;
  focus_keyword?: string;        // Primary SEO keyword
  persona?: string;              // Content persona
  tags?: string[];               // Content tags
  scheduled_date?: string;       // ISO timestamp
  featured_image_url?: string;   // Image URL
}
```

### Category System

**Important**: The CMS uses a dual category system:

1. **Content Strategy Category** (`category` field)
   - Internal organization and SEO grouping
   - Examples: `"business-loans"`, `"sba-loans"`, `"equipment-financing"`
   - Set automatically from content strategy
   - Used for: Content planning, batch processing, reporting

2. **UX Categories** (via `article_ux_categories` junction table)
   - User-facing categories for navigation
   - Examples: `"Guides"`, `"Resources"`, `"Comparisons"`, `"Industry Guides"`
   - Site-specific (each site defines its own taxonomy)
   - Used for: Navigation menus, filtering, category pages (`/guides`, `/resources`)

**Auto-Assignment**: UX categories are automatically assigned based on content strategy categories via mapping rules. See `UX_CATEGORY_QUICK_START.md` for details.

---

## Site-Specific Configuration

### Site Identifiers

| Site ID | Domain | Description |
|---------|--------|-------------|
| `rateroots` | `https://rateroots.com` | Business loans comparison |
| `seniorsimple` | `https://seniorsimple.org` | Senior financial planning |
| `mortgagesimple` | `https://mortgagesimple.org` | Mortgage information |

### Canonical URL Pattern

```javascript
function generateCanonicalUrl(siteId, slug) {
  const domains = {
    'rateroots': 'https://rateroots.com',
    'seniorsimple': 'https://seniorsimple.org',
    'mortgagesimple': 'https://mortgagesimple.org'
  };
  
  return `${domains[siteId] || 'https://example.com'}/${slug}`;
}
```

---

## Example Implementations

### Next.js Implementation

```typescript
// app/articles/[slug]/page.tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (!article) return <div>Article not found</div>;

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>{article.meta_title || article.title}</title>
        <meta name="description" content={article.meta_description || article.excerpt} />
        <link rel="canonical" href={article.canonical_url} />
        
        {/* Open Graph */}
        <meta property="og:title" content={article.og_title || article.title} />
        <meta property="og:description" content={article.og_description || article.excerpt} />
        <meta property="og:image" content={article.og_image || article.featured_image_url} />
        
        {/* Twitter */}
        <meta name="twitter:title" content={article.twitter_title || article.title} />
        <meta name="twitter:description" content={article.twitter_description || article.excerpt} />
        <meta name="twitter:image" content={article.twitter_image || article.featured_image_url} />
        
        {/* Schema Markup */}
        {article.schema_markup && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema_markup) }}
          />
        )}
      </head>

      {/* Article Content */}
      <article>
        {article.featured_image_url && (
          <img
            src={article.featured_image_url}
            alt={article.featured_image_alt || article.title}
          />
        )}
        <h1>{article.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: article.html_body || article.content }} />
      </article>
    </>
  );
}
```

### React Implementation

```typescript
// components/Article.tsx
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function Article({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState(null);

  useEffect(() => {
    async function fetchArticle() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
      
      setArticle(data);
    }
    
    fetchArticle();
  }, [articleId]);

  if (!article) return <div>Loading...</div>;

  return (
    <article>
      {/* Featured Image */}
      {article.featured_image_url && (
        <img
          src={article.featured_image_url}
          alt={article.featured_image_alt || article.title}
        />
      )}
      
      {/* Title */}
      <h1>{article.title}</h1>
      
      {/* Content - Prefer HTML, fallback to markdown */}
      <div
        dangerouslySetInnerHTML={{
          __html: article.html_body || article.content
        }}
      />
      
      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="tags">
          {article.tags.map(tag => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  );
}
```

---

## Best Practices

### 1. Always Use HTML Body When Available

```javascript
// ✅ Good
const content = article.html_body || article.content;

// ❌ Bad
const content = article.content; // May be markdown
```

### 2. Include All SEO Metadata

```javascript
// ✅ Good - Complete SEO
<head>
  <title>{article.meta_title}</title>
  <meta name="description" content={article.meta_description} />
  <link rel="canonical" href={article.canonical_url} />
  <meta property="og:title" content={article.og_title} />
  <meta property="og:description" content={article.og_description} />
  <meta property="og:image" content={article.og_image} />
</head>

// ❌ Bad - Missing metadata
<head>
  <title>{article.title}</title>
</head>
```

### 3. Use Featured Image Alt Text

```javascript
// ✅ Good
<img
  src={article.featured_image_url}
  alt={article.featured_image_alt || article.title}
/>

// ❌ Bad
<img src={article.featured_image_url} />
```

### 4. Include Schema Markup

```javascript
// ✅ Good
{article.schema_markup && (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(article.schema_markup)
    }}
  />
)}
```

### 5. Filter by Site ID

```javascript
// ✅ Good - Site-specific
const articles = await supabase
  .from('articles')
  .select('*')
  .eq('site_id', 'rateroots')
  .eq('status', 'published');

// ❌ Bad - All sites
const articles = await supabase
  .from('articles')
  .select('*');
```

### 6. Use Agentic Content Generation

For new articles, use the agentic content generation function to ensure all metadata is automatically generated:

```javascript
// ✅ Good - Full workflow
const article = await generateArticle({
  topic: 'Business loans',
  siteId: 'rateroots',
  keyword: 'business loans',
  wordCount: 2000
});
// Article includes: content, html_body, metadata, images, schema

// ❌ Bad - Manual creation
const article = await createArticle({
  title: 'Business Loans',
  content: '...'
});
// Missing: html_body, metadata, images, schema
```

---

## Common Issues & Solutions

### Issue 1: Missing HTML Body

**Problem**: `html_body` is null

**Solution**: 
1. Use `article-metadata-enhancer` function to convert existing articles
2. For new articles, ensure `convert_to_html: true` in agentic-content-gen

### Issue 2: Missing Metadata

**Problem**: SEO and social metadata fields are null

**Solution**:
1. Run `article-metadata-enhancer` on existing articles
2. For new articles, metadata is auto-generated by `agentic-content-gen`

### Issue 3: Wrong Canonical URL

**Problem**: Canonical URL doesn't match site domain

**Solution**: Ensure `site_id` is correctly set. Canonical URLs are auto-generated based on `site_id`.

### Issue 4: Missing Featured Image Alt Text

**Problem**: `featured_image_alt` is null

**Solution**: 
1. Run `article-metadata-enhancer` to generate alt text
2. For new articles, alt text is auto-generated when image is created

---

## API Keys & Authentication

### Anon Key (Read-Only)
- Use for: Fetching published articles
- Scope: Public read access
- Environment: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Service Role Key (Full Access)
- Use for: Creating/updating articles, calling edge functions
- Scope: Full database access
- Environment: `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ **Never expose in client-side code**

---

## Support & Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj
- **Edge Functions**: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions
- **API Documentation**: https://supabase.com/docs/reference/javascript/introduction

---

## Quick Reference Checklist

When integrating articles, ensure:

- [ ] `html_body` is used for rendering (not raw markdown)
- [ ] All SEO metadata fields are included in `<head>`
- [ ] Canonical URL is set correctly
- [ ] Open Graph tags are included
- [ ] Twitter card tags are included
- [ ] Schema markup is included
- [ ] Featured image has alt text
- [ ] Articles are filtered by `site_id`
- [ ] Only `status = 'published'` articles are displayed
- [ ] Edge functions are called with proper authentication

---

**Last Updated**: 2025-11-28
**Version**: 1.0

