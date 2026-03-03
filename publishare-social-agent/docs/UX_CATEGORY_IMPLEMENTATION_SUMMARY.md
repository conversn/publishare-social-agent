# UX Category System - Implementation Summary

## Problem Solved

**Issue**: The `articles.category` field was being used for content strategy purposes (e.g., "business-loans", "sba-loans") but websites need user-facing categories for navigation (e.g., "Guides", "Resources", "Comparisons").

**Solution**: Dual category system that separates:
- **Content Strategy Categories** (`articles.category`) - Internal organization, SEO grouping
- **UX Categories** (`ux_categories` + `article_ux_categories`) - User-facing navigation, filtering

---

## Architecture

### Three-Tier System

1. **Content Strategy Category** (`articles.category`)
   - Used for: Content planning, SEO grouping, workflow automation
   - Example: `"business-loans"`, `"sba-loans"`, `"equipment-financing"`
   - Set automatically from content strategy

2. **UX Categories** (`ux_categories` table)
   - Used for: Site navigation, user filtering, category pages
   - Example: `"Guides"`, `"Resources"`, `"Comparisons"`, `"Industry Guides"`
   - Site-specific (each site defines its own taxonomy)

3. **Mapping Rules** (`content_category_ux_mapping` table)
   - Automatically maps content strategy categories → UX categories
   - Enables auto-assignment during article creation

---

## Database Schema

### New Tables

1. **`ux_categories`**
   - Site-specific user-facing categories
   - Supports hierarchical categories (parent_id)
   - Includes display_order, icon, color for UI customization

2. **`article_ux_categories`**
   - Many-to-many relationship
   - Articles can belong to multiple UX categories
   - One primary category per article (for breadcrumbs)

3. **`content_category_ux_mapping`**
   - Auto-mapping rules
   - Maps content strategy categories to UX categories
   - Supports priority and default flags

### Helper Views

1. **`articles_with_primary_ux_category`**
   - Quick access to primary UX category
   - Includes category name and slug

2. **`articles_with_ux_categories`**
   - All UX categories as JSON array
   - Includes is_primary and display_order

---

## Default Implementation for RateRoots

### UX Categories Created

| Name | Slug | Description | Order |
|------|------|-------------|-------|
| Guides | `guides` | Step-by-step guides and tutorials | 1 |
| Resources | `resources` | Reference materials and tools | 2 |
| Comparisons | `comparisons` | Product and service comparisons | 3 |
| Industry Guides | `industry-guides` | Industry-specific financing guides | 4 |
| News & Updates | `news` | Industry news and updates | 5 |

### Auto-Mapping Rules

Content Strategy Category → UX Category:
- `business-loans` → `guides`
- `sba-loans` → `guides`
- `equipment-financing` → `guides`
- `working-capital` → `guides`
- `bad-credit-loans` → `guides`
- `startup-loans` → `guides`
- `small-business-grants` → `resources`
- `comparison` → `comparisons`
- `construction` → `industry-guides`
- `healthcare` → `industry-guides`
- `restaurant` → `industry-guides`
- `retail` → `industry-guides`
- `trucking` → `industry-guides`
- `real-estate` → `industry-guides`
- `e-commerce` → `industry-guides`
- `manufacturing` → `industry-guides`

---

## Usage Patterns

### For Content Creators

Articles are created with content strategy categories (automatically from strategy):
```typescript
{
  category: "business-loans", // Content strategy
  // UX category auto-assigned via mapping
}
```

### For Frontend Developers

Query articles with UX categories:
```sql
SELECT * FROM articles_with_ux_categories 
WHERE site_id = 'rateroots' 
  AND status = 'published';
```

Display in navigation:
```typescript
const categories = await getUXCategories('rateroots');
// Returns: [{ name: "Guides", slug: "guides", ... }, ...]
```

Filter articles by UX category:
```sql
SELECT a.* FROM articles a
INNER JOIN article_ux_categories auc ON a.id = auc.article_id
INNER JOIN ux_categories ux ON auc.ux_category_id = ux.id
WHERE ux.slug = 'guides' AND a.status = 'published';
```

---

## Migration Status

✅ **Migration Created**: `20250128000000_create_ux_categories.sql`
- Creates all tables
- Populates default RateRoots UX categories
- Creates mapping rules
- Auto-assigns UX categories to existing articles

⏳ **Next Steps**:
1. Deploy migration
2. Update frontend to use UX categories
3. Add UX category management to CMS UI
4. Create UX categories for other sites (seniorsimple, mortgagesimple)

---

## Benefits

1. **User-Friendly Navigation**: Categories match user mental models
2. **Site Flexibility**: Each site defines its own taxonomy
3. **Backward Compatible**: Existing `category` field still works
4. **Auto-Assignment**: Rules automatically assign UX categories
5. **Multiple Categories**: Articles can belong to multiple UX categories
6. **Scalable**: Supports unlimited sites with different needs

---

## Example: Multi-Site Usage

### RateRoots
- UX Categories: Guides, Resources, Comparisons, Industry Guides, News
- Content Categories: business-loans, sba-loans, equipment-financing

### SeniorSimple
- UX Categories: Retirement Planning, Medicare, Long-Term Care, Financial Planning
- Content Categories: retirement-planning, medicare-guides, long-term-care

### MortgageSimple
- UX Categories: First-Time Buyers, Refinancing, Rates & Trends, Calculators
- Content Categories: first-time-buyer, refinancing, rate-comparison

Each site maintains its own UX taxonomy while sharing the same content strategy system.




