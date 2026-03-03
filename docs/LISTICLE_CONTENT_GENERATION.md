# Listicle Content Generation Guide

## Overview

The `agentic-content-gen` function now supports generating premium listicle articles optimized for SEO, AEO (Answer Engine Optimization), with affiliate/offer links and images.

## Features

- **Premium Editorial Quality**: Narrative-driven content (not generic "top 10" lists)
- **Structured Format**: Problem/Solution/Example/CTA pattern for each item
- **Affiliate Link Integration**: Automatic insertion of offer links after each item
- **Multi-Image Generation**: Optional images for each listicle item
- **AEO Optimization**: Answer-first format optimized for featured snippets
- **SEO Optimized**: Proper headings, schema markup, and internal linking

## Request Format

### Basic Listicle Request

```json
{
  "topic": "12 Best Ways to Live Happy, Healthy, and Rich in Retirement",
  "content_type": "listicle",
  "site_id": "seniorsimple",
  "listicle_item_count": 12,
  "listicle_subtitle": "Why the 'Old Rules' of retirement no longer work, and the new strategies affluent retirees use to protect their lifestyle, health, and wealth.",
  "listicle_intro_context": "For decades, the 'Three-Legged Stool' of retirement—Social Security, a pension, and personal savings—was enough. But for today's retiree, two of those legs are wobbly or missing.",
  "content_length": 5000,
  "editorial_quality": "premium",
  "use_deepseek": true,
  "generate_image": true,
  "generate_item_images": false
}
```

### Full Listicle Request with Offers

```json
{
  "topic": "12 Best Ways to Live Happy, Healthy, and Rich in Retirement",
  "content_type": "listicle",
  "site_id": "seniorsimple",
  "target_audience": "Affluent retirees and pre-retirees seeking advanced strategies",
  "businessContext": "SeniorSimple helps seniors navigate retirement planning with expert guidance and financial products.",
  "goals": "1. Provide comprehensive retirement strategies 2. Drive affiliate conversions 3. Establish authority in retirement planning",
  "listicle_item_count": 12,
  "listicle_subtitle": "Why the 'Old Rules' of retirement no longer work, and the new strategies affluent retirees use to protect their lifestyle, health, and wealth.",
  "listicle_intro_context": "For decades, the 'Three-Legged Stool' of retirement—Social Security, a pension, and personal savings—was enough. But for today's retiree, two of those legs are wobbly or missing.",
  "listicle_sections": [
    {
      "title": "PART I: FINANCIAL & WEALTH STRATEGIES",
      "item_indices": [1, 2, 3, 4, 5, 6]
    },
    {
      "title": "PART II: LIFESTYLE & TAX STRATEGIES",
      "item_indices": [7, 8, 9, 10, 11, 12]
    }
  ],
  "listicle_offers": [
    {
      "item_number": 1,
      "anchor_text": "Get Your Free Annuity Comparison →",
      "url": "https://seniorsimple.org/annuity-comparison",
      "type": "owned_offer"
    },
    {
      "item_number": 2,
      "anchor_text": "Calculate Your Available Home Equity →",
      "url": "https://seniorsimple.org/reverse-mortgage-calculator",
      "type": "owned_offer"
    },
    {
      "item_number": 3,
      "anchor_text": "Request Your Custom Policy Illustration →",
      "url": "https://affiliate.example.com/whole-life?ref=seniorsimple",
      "type": "affiliate"
    }
    // ... more offers for each item
  ],
  "listicle_conclusion_cta": "Take Your Free 2-Minute Retirement Assessment →",
  "listicle_disclaimer": "The information provided in this article is for educational purposes only and does not constitute financial, tax, or legal advice. SeniorSimple.org is not a financial advisor.",
  "content_length": 6000,
  "editorial_quality": "premium",
  "use_deepseek": true,
  "generate_image": true,
  "generate_item_images": false,
  "aeo_optimized": true,
  "generate_schema": true
}
```

## Parameters

### Required Parameters

- `topic`: The main topic/title of the listicle
- `content_type`: Must be `"listicle"`

### Listicle-Specific Parameters

- `listicle_item_count` (number): Number of items in the list (e.g., 12)
- `listicle_subtitle` (string, optional): Subtitle/value proposition
- `listicle_intro_context` (string, optional): Introduction context/problem setup
- `listicle_sections` (array, optional): Pre-defined sections with item groupings
  ```json
  {
    "title": "PART I: FINANCIAL & WEALTH STRATEGIES",
    "item_indices": [1, 2, 3, 4, 5, 6]
  }
  ```
- `listicle_offers` (array, optional): Affiliate/offer links for each item
  ```json
  {
    "item_number": 1,
    "anchor_text": "Get Your Free Annuity Comparison →",
    "url": "https://seniorsimple.org/annuity-comparison",
    "type": "owned_offer" // or "affiliate" or "internal_link"
  }
  ```
- `generate_item_images` (boolean, default: false): Generate images for each list item
- `listicle_conclusion_cta` (string, optional): Final CTA text for conclusion
- `listicle_disclaimer` (string, optional): Custom disclaimer text

### Standard Parameters (Recommended)

- `site_id`: Site identifier (e.g., "seniorsimple")
- `content_length`: Target word count (default: 2000, recommend 5000+ for listicles)
- `editorial_quality`: "premium" (default) or "standard"
- `use_deepseek`: true (default) for better editorial quality
- `generate_image`: true (default) to generate featured image
- `aeo_optimized`: true (default) for AEO optimization
- `generate_schema`: true (default) for schema markup

## Content Structure

The generated listicle follows this structure:

1. **Header/Branding**: `[SiteName] Special Report | [Series Name]` (if applicable)
2. **Title**: The provided title
3. **Subtitle**: Value proposition
4. **Introduction**: Problem/context setup
5. **Sections** (if provided): Organized sections with H2 headings
6. **Numbered Items**: Each item includes:
   - Item number and title
   - "The Problem" section
   - "The Solution" section
   - "Real Life Example" or "How it works" section
   - CTA link (automatically inserted)
7. **Conclusion**: Summary and final CTA
8. **Disclaimer**: Legal/financial disclaimer

## Example: Calling the Function

### Using cURL

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "topic": "12 Best Ways to Live Happy, Healthy, and Rich in Retirement",
    "content_type": "listicle",
    "site_id": "seniorsimple",
    "listicle_item_count": 12,
    "listicle_subtitle": "Why the Old Rules no longer work...",
    "listicle_offers": [
      {
        "item_number": 1,
        "anchor_text": "Get Your Free Annuity Comparison →",
        "url": "https://seniorsimple.org/annuity-comparison",
        "type": "owned_offer"
      }
    ],
    "content_length": 5000,
    "editorial_quality": "premium"
  }'
```

### Using JavaScript/Node.js

```javascript
const response = await fetch('https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    topic: "12 Best Ways to Live Happy, Healthy, and Rich in Retirement",
    content_type: "listicle",
    site_id: "seniorsimple",
    listicle_item_count: 12,
    listicle_subtitle: "Why the Old Rules no longer work...",
    listicle_offers: [
      {
        item_number: 1,
        anchor_text: "Get Your Free Annuity Comparison →",
        url: "https://seniorsimple.org/annuity-comparison",
        type: "owned_offer"
      }
    ],
    content_length: 5000,
    editorial_quality: "premium"
  })
});

const result = await response.json();
console.log('Article ID:', result.article_id);
```

## Response Format

```json
{
  "success": true,
  "article_id": "uuid",
  "title": "12 Best Ways to Live Happy, Healthy, and Rich in Retirement",
  "content": "...",
  "html_body": "...",
  "aeo_summary": "...",
  "aeo_score": 85,
  "schema_markup": { ... }
}
```

## Best Practices

1. **Item Count**: Use 10-15 items for optimal engagement (not too few, not too many)
2. **Offer Links**: Provide offers for all items to maximize conversion opportunities
3. **Sections**: Organize items into 2-3 logical sections for better readability
4. **Content Length**: Aim for 4000-6000 words for comprehensive listicles
5. **Editorial Quality**: Always use "premium" for listicles to ensure narrative flow
6. **Images**: Use `generate_item_images: true` sparingly (adds processing time and cost)

## Integration with Content Strategy

You can integrate listicles into your content strategy workflow:

1. Create a `content_strategy` entry with `content_type: 'listicle'`
2. Use `batch-strategy-processor` to generate listicles in bulk
3. Ensure offers are configured in the strategy metadata

## Notes

- Offer links are automatically inserted after each item's content
- Images for items are generated with metadata linking them to specific items
- The function uses DeepSeek by default for premium editorial quality
- AEO optimization ensures answer-first format for featured snippets
- Schema markup is automatically generated for better SEO
