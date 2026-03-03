# Comparison Content Generator - Implementation Summary

## ✅ Completed

### 1. New Edge Function Created
- **File**: `supabase/functions/comparison-content-generator/index.ts`
- **Purpose**: Specialized content generator for comparison/list articles
- **Features**:
  - Editorial positioning of preferred service
  - Fair, thorough analysis of alternatives
  - Site-specific configuration support
  - Content Agent and persona integration

### 2. Integration with agentic-content-gen
- **Detection**: Automatically detects `content_type: 'comparison'` or `aeo_content_type: 'comparison'`
- **Auto-call**: Calls `comparison-content-generator` when comparison content detected
- **Workflow**: Continues with full workflow (images, links, HTML, publishing)

### 3. Database Configuration
- **Migration**: `20251202000004_add_comparison_content_config.sql`
- **Storage**: `sites.config->comparison_content` JSONB
- **ParentSimple Config**: Empowerly configured as preferred service

### 4. Batch Strategy Processor Updated
- **Detection**: Detects comparison content from strategy
- **Config Fetch**: Fetches comparison config from site automatically
- **Parameter Passing**: Passes comparison parameters to agentic-content-gen

## Architecture

```
Content Strategy (content_type: 'comparison')
         ↓
batch-strategy-processor
  - Detects comparison
  - Fetches site comparison config
  - Maps parameters
         ↓
agentic-content-gen
  - Detects comparison
  - Calls comparison-content-generator
         ↓
comparison-content-generator
  - Generates editorial comparison content
  - Returns content
         ↓
agentic-content-gen
  - Continues workflow
  - Images, links, HTML, publishing
```

## Configuration Structure

### Site Configuration (`sites.config->comparison_content`)

```json
{
  "comparison_content": {
    "preferred_service": "Empowerly",
    "preferred_service_description": "Leading college consulting service...",
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

## Usage

### Via Content Strategy Table

1. **Create Strategy Entry**:
```sql
INSERT INTO content_strategy (
  site_id,
  content_title,
  content_type,
  primary_keyword,
  category,
  status
) VALUES (
  'parentsimple',
  'Best College Consulting Services: A Comprehensive Comparison',
  'comparison',
  'best college consulting services',
  'College Planning',
  'Planned'
);
```

2. **Add Comparison Parameters** (optional - can be in strategy or fetched from site):
```sql
-- Store alternatives in strategy metadata or pass manually
-- For now, alternatives should be provided when calling agentic-content-gen directly
```

3. **Process via Batch**:
```bash
# batch-strategy-processor will:
# - Detect comparison content_type
# - Fetch comparison config from site
# - Pass to agentic-content-gen
# - agentic-content-gen calls comparison-content-generator
```

### Direct Call

```typescript
await fetch('/functions/v1/agentic-content-gen', {
  method: 'POST',
  body: JSON.stringify({
    topic: 'Best College Consulting Services',
    content_type: 'comparison',
    preferred_service: 'Empowerly',
    preferred_service_description: 'Leading college consulting...',
    alternatives: ['CollegeVine', 'IvyWise', 'College Confidential'],
    site_id: 'parentsimple',
    generate_image: true,
    generate_links: true,
    convert_to_html: true
  })
});
```

## Content Structure Generated

1. **Introduction** (first 100 words - answers "what is the best X?")
2. **"What to Look For"** section
3. **Deep Dive Sections** (one per service)
4. **Comparison Table** (markdown format)
5. **Editorial Conclusion** (positions preferred service as best)

## Next Steps

1. ✅ Function created
2. ✅ Integration complete
3. ✅ Database config added
4. ⏳ **Deploy functions**:
   - `comparison-content-generator`
   - Updated `agentic-content-gen`
   - Updated `batch-strategy-processor`
5. ⏳ **Deploy migration**: `20251202000004_add_comparison_content_config.sql`
6. ⏳ **Test** with first Empowerly comparison article
7. ⏳ **Add alternatives field** to content_strategy table (optional enhancement)

## Future Enhancements

1. **Store alternatives in content_strategy**:
   - Add `alternatives` JSONB column
   - Store array of competing services
   - Auto-populate from site config if not provided

2. **Auto-generate alternatives**:
   - Use AI to suggest competing services based on topic
   - Validate against known competitors

3. **Comparison templates**:
   - Pre-defined comparison structures per vertical
   - Reusable criteria sets

4. **Multi-site support**:
   - Different preferred services per site
   - Vertical-specific comparison logic


