# Comparison Content Generator - Quick Start

## For ParentSimple / Empowerly Use Case

### Step 1: Create Content Strategy Entry

```sql
INSERT INTO content_strategy (
  site_id,
  content_title,
  content_type,
  primary_keyword,
  category,
  target_audience,
  word_count,
  status
) VALUES (
  'parentsimple',
  'Best College Consulting Services: A Comprehensive Comparison',
  'comparison',
  'best college consulting services',
  'College Planning',
  'Affluent parents (40-55, $150K+ income) with college-bound children',
  3500,
  'Planned'
);
```

### Step 2: Process via Batch (Recommended)

The batch processor will:
- ✅ Detect `content_type: 'comparison'`
- ✅ Fetch Empowerly config from `sites.config->comparison_content`
- ✅ Pass to `agentic-content-gen`
- ✅ `agentic-content-gen` calls `comparison-content-generator`
- ✅ Full workflow: images, links, HTML, publishing

```bash
# Via API
curl -X POST "https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor" \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "parentsimple",
    "limit": 1
  }'
```

### Step 3: Direct Call (If Alternatives Needed)

If you need to specify alternatives manually:

```typescript
await fetch('/functions/v1/agentic-content-gen', {
  method: 'POST',
  body: JSON.stringify({
    topic: 'Best College Consulting Services',
    content_type: 'comparison',
    preferred_service: 'Empowerly',
    alternatives: [
      'CollegeVine',
      'IvyWise',
      'College Confidential',
      'PrepScholar',
      'College Essay Guy'
    ],
    site_id: 'parentsimple',
    content_length: 3500,
    generate_image: true,
    generate_links: true,
    convert_to_html: true
  })
});
```

## What Gets Generated

**Article Structure:**
1. Introduction (answers "what is the best college consulting service?")
2. What to Look For in a College Consultant
3. Empowerly: Deep Dive Analysis
4. CollegeVine: Analysis
5. IvyWise: Analysis
6. [Other alternatives...]
7. Comparison Table
8. Editorial Conclusion (positions Empowerly as best)

**Editorial Tone:**
- Fair, thorough analysis
- Highlights strengths AND weaknesses
- Natural, well-reasoned conclusion
- Educational, not salesy

## Site Configuration

Empowerly is already configured in `sites.config->comparison_content` for ParentSimple:

```json
{
  "preferred_service": "Empowerly",
  "preferred_service_description": "Empowerly is a leading college consulting service...",
  "comparison_criteria": [...],
  "editorial_tone": "authoritative",
  "conclusion_style": "editorial"
}
```

## Next Steps

1. ✅ Functions created and integrated
2. ⏳ **Deploy functions**
3. ⏳ **Deploy migration** (adds Empowerly config)
4. ⏳ **Test** with first comparison article
5. ⏳ **Create content strategy entries** for comparison articles

## Example Topics for ParentSimple

- "Best College Consulting Services"
- "Best SAT/ACT Prep Services"
- "Best Scholarship Search Services"
- "Best College Essay Writing Services"
- "Best Financial Aid Consulting Services"

All will highlight Empowerly (or other preferred service) as the best choice.


