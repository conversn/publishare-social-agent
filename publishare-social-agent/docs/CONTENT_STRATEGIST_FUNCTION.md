# Content Strategist Edge Function

## Overview

The `content-strategist` edge function analyzes content coverage for a site and provides actionable recommendations for filling content gaps, prioritizing based on business impact, and identifying opportunities for content re-categorization.

## Purpose

This function helps content teams:
- **Identify content gaps** - Find categories with no published articles
- **Prioritize content creation** - Rank gaps by business impact (revenue, funnel, engagement)
- **Recommend specific articles** - Suggest exact article titles to create
- **Find re-categorization opportunities** - Identify existing articles that could be moved to empty categories
- **Estimate effort** - Calculate time and articles needed to fill gaps

## API Endpoint

```
POST /functions/v1/content-strategist
```

## Request

```json
{
  "site_id": "parentsimple"
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `site_id` | string | Yes | The site identifier (e.g., "parentsimple", "rateroots") |

## Response

```json
{
  "site_id": "parentsimple",
  "analysis_date": "2025-12-02T10:30:00.000Z",
  "total_articles": 50,
  "categories_with_content": 2,
  "categories_without_content": 4,
  "gaps": [
    {
      "ux_category_slug": "financial-planning",
      "ux_category_name": "Financial Planning",
      "article_count": 0,
      "priority": 1,
      "recommended_articles": [
        "529 Plan Basics: Everything Parents Need to Know",
        "How to Calculate Your College Savings Goal",
        ...
      ],
      "similar_content_ids": ["uuid1", "uuid2", ...],
      "re_categorization_opportunities": [
        {
          "article_id": "uuid",
          "article_title": "529 Plan Contribution Limits and Rules",
          "from_category": "resources",
          "to_category": "financial-planning"
        }
      ]
    }
  ],
  "immediate_actions": [
    {
      "action": "Create foundational content for Financial Planning",
      "priority": "critical",
      "description": "Financial Planning has no published articles...",
      "articles_to_create": [
        "529 Plan Basics: Everything Parents Need to Know",
        ...
      ],
      "articles_to_re_categorize": [
        {
          "article_id": "uuid",
          "article_title": "529 Plan Contribution Limits...",
          "from_category": "resources",
          "to_category": "financial-planning"
        }
      ]
    }
  ],
  "content_creation_plan": {
    "priority_1": [...],
    "priority_2": [...],
    "priority_3": [...],
    "priority_4": [...]
  },
  "estimated_articles_needed": 35,
  "estimated_time_to_complete": "3 weeks"
}
```

## Priority Levels

### Priority 1 (Critical) - Revenue Drivers
- Categories that directly impact revenue
- Examples: Financial Planning, Product Categories
- **Action:** Create content immediately

### Priority 2 (High) - Funnel Feeders
- Categories that feed main conversion funnels
- Examples: High School (feeds College Planning)
- **Action:** Create within 1-2 weeks

### Priority 3 (Medium) - Engagement
- Categories that improve engagement and retention
- Examples: Middle School, Resources
- **Action:** Create within 1 month

### Priority 4 (Low) - Trust Building
- Categories that build long-term trust
- Examples: Early Years, Educational Content
- **Action:** Create as capacity allows

## Usage Examples

### JavaScript/TypeScript

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'apikey': SUPABASE_KEY
  },
  body: JSON.stringify({ site_id: 'parentsimple' })
});

const strategy = await response.json();
console.log(`Found ${strategy.gaps.length} content gaps`);
console.log(`Need ${strategy.estimated_articles_needed} articles`);
```

### Node.js Script

```bash
node scripts/test-content-strategist.js parentsimple
```

### cURL

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/content-strategist' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"site_id": "parentsimple"}'
```

## Integration with Content Generation

The recommendations can be directly used with `agentic-content-gen`:

```typescript
// Get strategy recommendations
const strategy = await getContentStrategy('parentsimple');

// Generate articles for priority 1 gaps
for (const gap of strategy.content_creation_plan.priority_1) {
  for (const articleTitle of gap.recommended_articles.slice(0, 3)) {
    await generateArticle({
      topic: articleTitle,
      site_id: 'parentsimple',
      category: gap.ux_category_slug,
      // ... other params
    });
  }
}
```

## Re-categorization Workflow

The function identifies existing articles that could be moved to empty categories:

1. **Find similar content** - Searches for articles with relevant keywords
2. **Suggest re-categorization** - Lists articles that match empty category themes
3. **Provide migration path** - Shows current category → suggested category

To re-categorize an article:

```typescript
// Update article's UX category
await supabase
  .from('article_ux_categories')
  .update({ ux_category_id: newCategoryId })
  .eq('article_id', articleId)
  .eq('is_primary', true);
```

## Algorithm Details

### Gap Detection
- Queries `articles_with_primary_ux_category` view
- Filters by `site_id` and `status = 'published'`
- Groups by UX category slug
- Identifies categories with `article_count = 0`

### Similar Content Detection
- Uses keyword matching against article titles and categories
- Keyword mappings defined per category:
  - Financial Planning: "529", "life insurance", "estate planning", etc.
  - High School: "gpa", "sat", "act", "ap", "extracurricular", etc.
  - Middle School: "middle school", "8th grade", "course selection", etc.
  - Early Years: "early childhood", "preschool", "baby", "toddler", etc.

### Priority Assignment
- **Priority 1:** Revenue-driving categories (financial-planning)
- **Priority 2:** Funnel-feeding categories (high-school)
- **Priority 3:** Engagement categories (middle-school)
- **Priority 4:** Trust-building categories (early-years)

### Time Estimation
- Assumes 2 articles per day (conservative)
- Calculates days, weeks, or months based on total articles needed

## Best Practices

1. **Run regularly** - Check content gaps monthly or after major content pushes
2. **Prioritize critical gaps** - Focus on Priority 1 and 2 first
3. **Consider re-categorization** - Review suggested re-categorizations before creating new content
4. **Batch creation** - Use `batch-strategy-processor` to create multiple articles at once
5. **Monitor progress** - Re-run analysis after creating content to track progress

## Related Functions

- `agentic-content-gen` - Generate articles based on recommendations
- `batch-strategy-processor` - Batch process multiple articles
- `content_strategy` table - Store content strategy entries

## Example Output

```
📊 Summary:
   Total Articles: 50
   Categories with Content: 2
   Categories without Content: 4
   Estimated Articles Needed: 35
   Estimated Time to Complete: 3 weeks

⚠️  Content Gaps:
   1. 🔴 Financial Planning (financial-planning)
      Articles: 0
      Priority: 1
      Recommended Articles: 10
      Re-categorization Opportunities: 5

🎯 Immediate Actions:
   1. 🔴 Create foundational content for Financial Planning
      Priority: critical
      Articles to Create:
         - 529 Plan Basics: Everything Parents Need to Know
         - How to Calculate Your College Savings Goal
         - Life Insurance for Parents: Protecting Your Family's Future
```

## Error Handling

The function returns standard error responses:

```json
{
  "error": "site_id is required"
}
```

Common errors:
- `400` - Missing required parameters
- `500` - Database query errors
- `404` - Site not found

## Future Enhancements

Potential improvements:
- [ ] AI-powered article title generation
- [ ] SEO keyword analysis for recommendations
- [ ] Competitive content gap analysis
- [ ] Content performance predictions
- [ ] Automated content strategy table population
- [ ] Integration with content calendar


