# Category Taxonomy Architecture - UX vs Content Strategy

## Problem Statement

The current `articles.category` field is being used for **content strategy** purposes (e.g., "business-loans", "sba-loans", "equipment-financing") but websites need **user-facing categories** for navigation and filtering (e.g., "Guides", "Resources", "News", "Tools", "Calculators").

This creates a conflict:
- **Content Strategy Categories**: Used internally for content planning, SEO grouping, workflow organization
- **UX Categories**: Used for site navigation, filtering, user experience

## Solution: Dual Category System

### Architecture Overview

```
Articles
├── content_category (string) - Content strategy category (existing)
├── ux_category_id (UUID) - User-facing category (new)
└── Multiple UX categories via junction table (many-to-many)
```

### Design Principles

1. **Separation of Concerns**: Content strategy and UX categories are independent
2. **Site-Specific UX Taxonomies**: Each site can define its own UX category structure
3. **Flexible Mapping**: One content category can map to multiple UX categories
4. **Backward Compatible**: Existing `category` field remains for content strategy
5. **Scalable**: Supports multiple sites with different UX needs

---

## Database Schema

### New Tables

#### 1. `ux_categories` Table

User-facing categories for site navigation and filtering.

```sql
CREATE TABLE ux_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- "Guides", "Resources", "News"
  slug VARCHAR(100) NOT NULL, -- "guides", "resources", "news"
  description TEXT,
  display_order INTEGER DEFAULT 0, -- For sorting in navigation
  icon VARCHAR(50), -- Optional icon identifier
  color VARCHAR(7), -- Optional hex color for UI
  is_active BOOLEAN DEFAULT TRUE,
  parent_id UUID REFERENCES ux_categories(id) ON DELETE SET NULL, -- For hierarchical categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(site_id, slug),
  CONSTRAINT ux_categories_name_check CHECK (char_length(name) > 0),
  CONSTRAINT ux_categories_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_ux_categories_site_id ON ux_categories(site_id);
CREATE INDEX idx_ux_categories_site_active ON ux_categories(site_id, is_active);
CREATE INDEX idx_ux_categories_parent ON ux_categories(parent_id) WHERE parent_id IS NOT NULL;
```

#### 2. `article_ux_categories` Junction Table

Many-to-many relationship between articles and UX categories.

```sql
CREATE TABLE article_ux_categories (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  ux_category_id UUID NOT NULL REFERENCES ux_categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE, -- Primary category for display
  display_order INTEGER DEFAULT 0, -- For sorting if multiple categories
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (article_id, ux_category_id),
  CONSTRAINT article_ux_categories_unique_primary 
    EXCLUDE (article_id WITH =) WHERE (is_primary = TRUE)
);

CREATE INDEX idx_article_ux_categories_article ON article_ux_categories(article_id);
CREATE INDEX idx_article_ux_categories_ux_category ON article_ux_categories(ux_category_id);
CREATE INDEX idx_article_ux_categories_primary ON article_ux_categories(article_id, is_primary) WHERE is_primary = TRUE;
```

#### 3. `content_category_ux_mapping` Table (Optional)

Automatic mapping rules from content strategy categories to UX categories.

```sql
CREATE TABLE content_category_ux_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  content_category VARCHAR(100) NOT NULL, -- "business-loans", "sba-loans"
  ux_category_id UUID NOT NULL REFERENCES ux_categories(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE, -- Default mapping for auto-assignment
  priority INTEGER DEFAULT 0, -- Higher priority = preferred mapping
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(site_id, content_category, ux_category_id)
);

CREATE INDEX idx_content_category_mapping_site ON content_category_ux_mapping(site_id);
CREATE INDEX idx_content_category_mapping_content ON content_category_ux_mapping(site_id, content_category);
```

---

## Field Usage

### Articles Table Fields

| Field | Purpose | Example | Auto-Generated? |
|-------|---------|---------|------------------|
| `category` | Content strategy category | `"business-loans"` | ✅ From strategy |
| `ux_category_id` | Primary UX category (legacy single) | UUID | ❌ Manual or mapping |
| (via junction) | Multiple UX categories | Multiple UUIDs | ❌ Manual or mapping |

### Content Strategy Categories

Used for:
- Content planning and organization
- SEO keyword grouping
- Workflow automation
- Internal reporting
- Batch content generation

Examples:
- `"business-loans"`
- `"sba-loans"`
- `"equipment-financing"`
- `"working-capital"`
- `"bad-credit-loans"`

### UX Categories

Used for:
- Site navigation menus
- Article filtering
- Category pages (`/guides`, `/resources`)
- Breadcrumbs
- User-facing organization

Examples for RateRoots:
- `"Guides"` - How-to guides and tutorials
- `"Resources"` - Reference materials
- `"Comparisons"` - Product/service comparisons
- `"News"` - Industry news and updates
- `"Tools"` - Calculators and interactive tools

Examples for SeniorSimple:
- `"Retirement Planning"` - Retirement guides
- `"Medicare"` - Medicare information
- `"Long-Term Care"` - Care planning resources
- `"Financial Planning"` - Financial advice

---

## Implementation Patterns

### Pattern 1: Site-Specific UX Categories

Each site defines its own UX category taxonomy based on user needs.

```sql
-- RateRoots UX Categories
INSERT INTO ux_categories (site_id, name, slug, description, display_order) VALUES
('rateroots', 'Guides', 'guides', 'Step-by-step guides and tutorials', 1),
('rateroots', 'Resources', 'resources', 'Reference materials and tools', 2),
('rateroots', 'Comparisons', 'comparisons', 'Product and service comparisons', 3),
('rateroots', 'News', 'news', 'Industry news and updates', 4);

-- SeniorSimple UX Categories
INSERT INTO ux_categories (site_id, name, slug, description, display_order) VALUES
('seniorsimple', 'Retirement Planning', 'retirement-planning', 'Retirement guides and resources', 1),
('seniorsimple', 'Medicare', 'medicare', 'Medicare information and guides', 2),
('seniorsimple', 'Long-Term Care', 'long-term-care', 'Care planning resources', 3);
```

### Pattern 2: Automatic Mapping Rules

Define rules to automatically assign UX categories based on content strategy categories.

```sql
-- Auto-map content strategy categories to UX categories
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default) VALUES
-- RateRoots mappings
('rateroots', 'business-loans', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'guides'), TRUE),
('rateroots', 'sba-loans', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'guides'), TRUE),
('rateroots', 'equipment-financing', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'guides'), TRUE),
('rateroots', 'comparison', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'comparisons'), TRUE);
```

### Pattern 3: Manual Assignment

Allow manual assignment of UX categories during article creation/editing.

```typescript
// Article creation with UX category
{
  title: "How to Get a Business Loan",
  content: "...",
  category: "business-loans", // Content strategy
  ux_categories: [
    { id: "guide-category-uuid", is_primary: true }
  ]
}
```

---

## Migration Strategy

### Phase 1: Add New Tables (Non-Breaking)

1. Create `ux_categories` table
2. Create `article_ux_categories` junction table
3. Create `content_category_ux_mapping` table
4. Add indexes and constraints

### Phase 2: Populate Default UX Categories

1. Create default UX categories for each site
2. Create mapping rules from content categories to UX categories
3. Run migration script to auto-assign UX categories to existing articles

### Phase 3: Update Application Code

1. Update article creation to support UX categories
2. Update article queries to include UX categories
3. Update frontend to display UX categories
4. Keep `category` field for content strategy (backward compatible)

### Phase 4: Optional - Deprecate `category` Field

If desired, can eventually deprecate `category` in favor of content strategy table, but keep for backward compatibility.

---

## Query Patterns

### Get Articles with UX Categories

```sql
SELECT 
  a.*,
  json_agg(
    json_build_object(
      'id', ux.id,
      'name', ux.name,
      'slug', ux.slug,
      'is_primary', auc.is_primary
    )
  ) FILTER (WHERE ux.id IS NOT NULL) as ux_categories
FROM articles a
LEFT JOIN article_ux_categories auc ON a.id = auc.article_id
LEFT JOIN ux_categories ux ON auc.ux_category_id = ux.id
WHERE a.site_id = 'rateroots'
  AND a.status = 'published'
GROUP BY a.id;
```

### Get Articles by UX Category

```sql
SELECT a.*
FROM articles a
INNER JOIN article_ux_categories auc ON a.id = auc.article_id
INNER JOIN ux_categories ux ON auc.ux_category_id = ux.id
WHERE ux.site_id = 'rateroots'
  AND ux.slug = 'guides'
  AND a.status = 'published'
ORDER BY a.created_at DESC;
```

### Get Primary UX Category

```sql
SELECT 
  a.*,
  ux.name as primary_category_name,
  ux.slug as primary_category_slug
FROM articles a
LEFT JOIN article_ux_categories auc ON a.id = auc.article_id AND auc.is_primary = TRUE
LEFT JOIN ux_categories ux ON auc.ux_category_id = ux.id
WHERE a.site_id = 'rateroots'
  AND a.status = 'published';
```

---

## Frontend Integration

### Display Categories

```typescript
// Get article with UX categories
const article = await getArticle(articleId);

// Display primary category
<Breadcrumb>
  <Link href={`/${article.ux_categories.find(c => c.is_primary)?.slug}`}>
    {article.ux_categories.find(c => c.is_primary)?.name}
  </Link>
  <span>{article.title}</span>
</Breadcrumb>

// Display all categories as tags
<div className="categories">
  {article.ux_categories.map(cat => (
    <Tag key={cat.id} href={`/${cat.slug}`}>
      {cat.name}
    </Tag>
  ))}
</div>
```

### Navigation Menu

```typescript
// Get UX categories for site navigation
const categories = await getUXCategories(siteId);

<nav>
  {categories.map(cat => (
    <NavLink key={cat.id} href={`/${cat.slug}`}>
      {cat.name}
    </NavLink>
  ))}
</nav>
```

---

## Edge Function Updates

### Update `agentic-content-gen`

```typescript
// Auto-assign UX category based on content strategy category
async function assignUXCategory(
  supabase: any,
  articleId: string,
  siteId: string,
  contentCategory: string
) {
  // Check for mapping rule
  const { data: mapping } = await supabase
    .from('content_category_ux_mapping')
    .select('ux_category_id')
    .eq('site_id', siteId)
    .eq('content_category', contentCategory)
    .eq('is_default', true)
    .single();

  if (mapping) {
    await supabase
      .from('article_ux_categories')
      .insert({
        article_id: articleId,
        ux_category_id: mapping.ux_category_id,
        is_primary: true
      });
  }
}
```

---

## Benefits

1. **Separation of Concerns**: Content strategy and UX are independent
2. **Site Flexibility**: Each site can define its own UX taxonomy
3. **Multiple Categories**: Articles can belong to multiple UX categories
4. **Backward Compatible**: Existing `category` field remains functional
5. **Auto-Mapping**: Rules can automatically assign UX categories
6. **Scalable**: Supports unlimited sites with different needs
7. **User-Friendly**: Navigation and filtering based on user needs, not internal organization

---

## Example: RateRoots Implementation

### UX Categories

```sql
-- RateRoots UX Categories
INSERT INTO ux_categories (site_id, name, slug, description, display_order) VALUES
('rateroots', 'Guides', 'guides', 'Step-by-step guides and tutorials', 1),
('rateroots', 'Resources', 'resources', 'Reference materials and tools', 2),
('rateroots', 'Comparisons', 'comparisons', 'Product and service comparisons', 3),
('rateroots', 'Industry Guides', 'industry-guides', 'Industry-specific financing guides', 4),
('rateroots', 'News & Updates', 'news', 'Industry news and updates', 5);
```

### Mapping Rules

```sql
-- Auto-map content strategy to UX categories
INSERT INTO content_category_ux_mapping (site_id, content_category, ux_category_id, is_default) VALUES
('rateroots', 'business-loans', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'guides'), TRUE),
('rateroots', 'sba-loans', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'guides'), TRUE),
('rateroots', 'comparison', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'comparisons'), TRUE),
('rateroots', 'construction', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'industry-guides'), TRUE),
('rateroots', 'healthcare', (SELECT id FROM ux_categories WHERE site_id = 'rateroots' AND slug = 'industry-guides'), TRUE);
```

### Result

- Content strategy uses: `"business-loans"`, `"sba-loans"`, etc.
- Users see: "Guides", "Comparisons", "Industry Guides", etc.
- Navigation: `/guides`, `/comparisons`, `/industry-guides`
- Filtering: Users can filter by UX categories
- SEO: Content strategy categories still used for SEO grouping

---

## Migration Script

See `supabase/migrations/YYYYMMDD_create_ux_categories.sql` for complete migration.




