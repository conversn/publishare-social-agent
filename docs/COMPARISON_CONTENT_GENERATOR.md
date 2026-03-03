# Comparison Content Generator

## Overview

The `comparison-content-generator` is a specialized edge function for creating editorial comparison/list articles that highlight a preferred service or client as superior. Designed for "best X" articles that provide thorough analysis while naturally positioning a specific service as the best choice.

## Use Case

**Primary Use Case:** Create "Best College Consulting Services" articles for ParentSimple that highlight Empowerly as superior, while providing fair, thorough analysis of alternatives.

**Future Use Cases:**
- Best business loan providers (RateRoots)
- Best retirement planning services (SeniorSimple)
- Any vertical where you want to highlight a preferred partner/client

## Architecture

```
┌─────────────────────────────────────┐
│  agentic-content-gen                │
│  Detects: content_type='comparison' │
└──────────────┬──────────────────────┘
               │
               │ Calls
               ▼
┌─────────────────────────────────────┐
│  comparison-content-generator       │
│  (Specialized comparison logic)     │
└──────────────┬──────────────────────┘
               │
               │ Returns content
               ▼
┌─────────────────────────────────────┐
│  agentic-content-gen                 │
│  (Continues workflow)                │
│  - Images                            │
│  - Links                             │
│  - HTML conversion                   │
│  - Publishing                        │
└─────────────────────────────────────┘
```

## Request Parameters

### Required
- `topic`: string - e.g., "Best College Consulting Services"
- `preferred_service`: string - Service to highlight as best (e.g., "Empowerly")
- `alternatives`: string[] - List of competing services

### Optional
- `title`: string - Article title
- `preferred_service_description`: string - Key differentiators and strengths
- `comparison_criteria`: string[] - What to compare (defaults provided)
- `site_id`: string - Site ID (fetches config automatically)
- `target_audience`: string
- `content_length`: number (default: 3000)
- `editorial_tone`: 'authoritative' | 'balanced' | 'enthusiastic' (default: 'authoritative')
- `conclusion_style`: 'editorial' | 'data-driven' | 'testimonial' (default: 'editorial')

## Site Configuration

Comparison content configuration is stored in `sites.config->comparison_content`:

```json
{
  "comparison_content": {
    "preferred_service": "Empowerly",
    "preferred_service_description": "...",
    "comparison_criteria": [
      "pricing and value",
      "expertise and qualifications",
      "success rates and outcomes",
      "personalization and approach",
      "accessibility and support",
      "reputation and trust"
    ],
    "editorial_tone": "authoritative",
    "conclusion_style": "editorial"
  }
}
```

## Usage Examples

### Via agentic-content-gen (Recommended)

```typescript
// agentic-content-gen automatically detects and calls comparison generator
await fetch('/functions/v1/agentic-content-gen', {
  method: 'POST',
  body: JSON.stringify({
    topic: 'Best College Consulting Services',
    content_type: 'comparison',
    preferred_service: 'Empowerly',
    preferred_service_description: 'Leading college consulting with personalized guidance...',
    alternatives: ['CollegeVine', 'IvyWise', 'College Confidential', 'PrepScholar'],
    site_id: 'parentsimple',
    generate_image: true,
    generate_links: true,
    convert_to_html: true
  })
});
```

### Direct Call

```typescript
await fetch('/functions/v1/comparison-content-generator', {
  method: 'POST',
  body: JSON.stringify({
    topic: 'Best College Consulting Services',
    preferred_service: 'Empowerly',
    alternatives: ['CollegeVine', 'IvyWise'],
    site_id: 'parentsimple'
  })
});
```

## Content Structure

The generator creates articles with:

1. **Engaging Introduction** (first 100 words answers "what is the best X?")
2. **"What to Look For" Section** - Explains comparison criteria
3. **Deep Dive Sections** - One section per service (detailed analysis)
4. **Comparison Table** - Markdown table format
5. **Editorial Conclusion** - Naturally positions preferred service as best

## Editorial Positioning

The generator:
- Provides fair, thorough analysis of all services
- Highlights strengths AND weaknesses of alternatives
- Uses specific examples, data points, or case studies
- Concludes with natural, well-reasoned recommendation
- Maintains educational, helpful tone (not salesy)

## Integration with Content Agent

The comparison generator:
- Fetches Content Agent config from site
- Fetches persona profile from avatar config
- Applies vertical theme and tone guidelines
- Follows safety rules and storytelling guidelines
- Maintains brand voice consistency

## Example Output

**Title:** "Best College Consulting Services: A Comprehensive Comparison"

**Structure:**
- Introduction (answers "what is the best college consulting service?")
- What to Look For in a College Consultant
- Empowerly: Deep Dive
- CollegeVine: Analysis
- IvyWise: Analysis
- Comparison Table
- Editorial Conclusion (positions Empowerly as best)

## Configuration per Site

Each site can have different:
- Preferred service/client
- Comparison criteria
- Editorial tone
- Conclusion style

This allows the same function to work across all verticals with site-specific positioning.

## Next Steps

1. ✅ Function created
2. ✅ Integration with agentic-content-gen
3. ✅ ParentSimple/Empowerly config added
4. ⏳ Deploy functions
5. ⏳ Test with first comparison article
6. ⏳ Add configs for other sites/verticals as needed


