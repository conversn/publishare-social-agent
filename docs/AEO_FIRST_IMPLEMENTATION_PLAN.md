# AEO-First CMS Implementation Plan for Publishare

## Executive Summary

This plan transforms Publishare into an **AEO-dominant CMS** that ensures all content generated and published across all Simple sites (seniorsimple.org, smallbizsimple.org, parentsimple.org, etc.) is optimized for Answer Engine Optimization.

**Current State:**
- ✅ Basic schema markup exists in some publisher platforms (not centralized)
- ✅ Articles table has `schema_type` field (unused)
- ❌ No AEO-specific content structure enforcement
- ❌ No "answer-first" content generation
- ❌ No speakable schema support
- ❌ No automatic schema generation/injection
- ❌ No multi-site schema support

**Target State:**
- ✅ All content follows "answer-first" structure (answer in first 100 words)
- ✅ Automatic schema generation and hardcoded injection
- ✅ Speakable schema for voice search
- ✅ AEO-optimized content templates
- ✅ Multi-site schema support
- ✅ Content structure validation

---

## Phase 1: Database Schema Enhancements

### 1.1 Add AEO-Specific Fields to Articles Table

```sql
-- Add AEO-specific columns to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS aeo_summary TEXT, -- Direct answer (first 100 words)
ADD COLUMN IF NOT EXISTS aeo_answer_first BOOLEAN DEFAULT FALSE, -- Validates answer is in first 100 words
ADD COLUMN IF NOT EXISTS content_structure JSONB, -- Stores H1/H2/H3 hierarchy
ADD COLUMN IF NOT EXISTS speakable_summary TEXT, -- 280-350 char voice-optimized summary
ADD COLUMN IF NOT EXISTS schema_markup JSONB, -- Generated schema in JSON-LD format
ADD COLUMN IF NOT EXISTS schema_validated BOOLEAN DEFAULT FALSE, -- Schema validation status
ADD COLUMN IF NOT EXISTS aeo_content_type VARCHAR(50), -- 'definition', 'how-to', 'comparison', 'data', 'formula'
ADD COLUMN IF NOT EXISTS citations JSONB, -- Array of citations/sources
ADD COLUMN IF NOT EXISTS data_points JSONB; -- Key statistics/data points

-- Add index for AEO content type filtering
CREATE INDEX IF NOT EXISTS idx_articles_aeo_content_type ON articles(aeo_content_type);
CREATE INDEX IF NOT EXISTS idx_articles_aeo_answer_first ON articles(aeo_answer_first) WHERE aeo_answer_first = TRUE;
```

### 1.2 Create AEO Content Templates Table

```sql
-- Store AEO-optimized content templates
CREATE TABLE IF NOT EXISTS aeo_content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id),
  template_type VARCHAR(50) NOT NULL, -- 'definition', 'how-to', 'comparison', 'data', 'formula'
  title_pattern TEXT NOT NULL, -- Pattern for generating titles
  structure_template JSONB NOT NULL, -- JSON structure for content sections
  schema_template JSONB NOT NULL, -- Schema.org template
  prompt_template TEXT NOT NULL, -- AI prompt template
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates for each content type
INSERT INTO aeo_content_templates (site_id, template_type, title_pattern, structure_template, schema_template, prompt_template) VALUES
-- Definition template
(NULL, 'definition', 'What is {topic}?', 
 '{"sections": ["definition", "key_points", "examples", "related_concepts"]}',
 '{"@type": "Article", "mainEntity": {"@type": "Thing", "name": "{topic}"}}',
 'Write a definition article about {topic}. Start with a direct answer in the first 100 words. Use clear headings (H1, H2, H3) and bullet points.'),
-- How-to template
(NULL, 'how-to', 'How to {action}',
 '{"sections": ["overview", "steps", "tips", "common_mistakes"]}',
 '{"@type": "HowTo", "name": "{action}"}',
 'Write a how-to guide for {action}. Start with a direct answer in the first 100 words. Use numbered steps and clear headings.'),
-- Comparison template
(NULL, 'comparison', '{option1} vs {option2}',
 '{"sections": ["overview", "comparison_table", "pros_cons", "recommendation"]}',
 '{"@type": "Article", "mainEntity": {"@type": "Comparison"}}',
 'Write a comparison article about {option1} vs {option2}. Start with a direct answer in the first 100 words. Include a comparison table and clear headings.');
```

---

## Phase 2: Content Generation AEO Enforcement

### 2.1 Update AI Content Generation Prompts

**File:** `supabase/functions/ai-content-generator/index.ts` or `agentic-content-gen/index.ts`

**Changes Required:**

1. **Add AEO System Prompt:**
```typescript
const AEO_SYSTEM_PROMPT = `You are an AEO (Answer Engine Optimization) content specialist. Your content must:

1. ANSWER FIRST: Provide the definitive answer in the first 100 words
2. STRUCTURE: Use clear H1, H2, H3 headings
3. CHUNK: Use bullet points, numbered lists, and tables
4. DATA: Include specific data points, statistics, or citations
5. CERTAINTY: Show confidence through comparisons and clear recommendations

Content Structure:
- First 100 words: Direct answer to the question
- H1: Main question/topic
- H2: Key sections (3-5 sections)
- H3: Subsections as needed
- Bullet points for key information
- Tables for comparisons
- Data points highlighted

Return format:
{
  "aeo_summary": "Direct answer in first 100 words",
  "title": "Question-based title",
  "content": "Full markdown content with proper headings",
  "content_structure": {"h1": "...", "h2": [...], "h3": [...]},
  "data_points": ["stat1", "stat2"],
  "citations": ["source1", "source2"]
}`;
```

2. **Add Content Type Detection:**
```typescript
function detectAEOContentType(title: string, topic: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTitle.startsWith('what is') || lowerTitle.startsWith('what are')) {
    return 'definition';
  }
  if (lowerTitle.startsWith('how to') || lowerTitle.startsWith('how do')) {
    return 'how-to';
  }
  if (lowerTitle.includes(' vs ') || lowerTitle.includes(' vs. ') || lowerTitle.includes(' versus ')) {
    return 'comparison';
  }
  if (lowerTitle.includes('calculator') || lowerTitle.includes('formula') || lowerTitle.includes('calculate')) {
    return 'formula';
  }
  if (lowerTitle.includes('statistics') || lowerTitle.includes('data') || lowerTitle.includes('study')) {
    return 'data';
  }
  return 'article';
}
```

3. **Add Answer-First Validation:**
```typescript
function validateAnswerFirst(content: string): { valid: boolean; summary: string } {
  // Extract first 100 words
  const words = content.split(/\s+/).slice(0, 100).join(' ');
  
  // Check if it contains a direct answer (not just introduction)
  const hasDirectAnswer = 
    words.toLowerCase().includes('is ') ||
    words.toLowerCase().includes('are ') ||
    words.toLowerCase().includes('means ') ||
    words.toLowerCase().includes('refers to') ||
    words.match(/\d+/) !== null; // Contains numbers (data)
  
  return {
    valid: hasDirectAnswer,
    summary: words
  };
}
```

### 2.2 Create AEO Content Validator Edge Function

**New File:** `supabase/functions/aeo-content-validator/index.ts`

```typescript
// Validates content meets AEO requirements
// - Answer in first 100 words
// - Proper heading structure
// - Data points present
// - Schema can be generated
```

---

## Phase 3: Schema Generation & Injection System

### 3.1 Create Schema Generator Edge Function

**New File:** `supabase/functions/schema-generator/index.ts`

**Functionality:**
- Analyzes article content
- Determines appropriate schema type (Article, HowTo, FAQ, etc.)
- Generates JSON-LD schema
- Includes Speakable schema
- Validates against schema.org

**Key Features:**
```typescript
interface SchemaGenerator {
  generateArticleSchema(article: Article): JSONLD;
  generateHowToSchema(article: Article): JSONLD;
  generateFAQSchema(article: Article): JSONLD;
  generateSpeakableSchema(article: Article): JSONLD;
  validateSchema(schema: JSONLD): boolean;
}
```

### 3.2 Create Schema Injection System

**File:** `lib/schema-injection.ts` (new utility)

**Functionality:**
- Injects schema into HTML `<head>` tag
- Supports multiple schema types per page
- Hardcodes JSON-LD (not JavaScript-loaded)
- Site-specific organization/publisher data

**Implementation:**
```typescript
export function injectSchema(html: string, schemas: JSONLD[]): string {
  const schemaScripts = schemas.map(schema => 
    `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
  ).join('\n');
  
  // Insert before </head>
  return html.replace('</head>', `${schemaScripts}\n</head>`);
}
```

### 3.3 Update Article Rendering

**Files to Update:**
- `app/articles/[slug]/page.tsx` (if exists in publishare)
- Article rendering components
- Preview pages

**Changes:**
1. Load schema from `articles.schema_markup` column
2. Inject into `<head>` via Next.js metadata or script tag
3. Include speakable schema
4. Add organization schema for each site

---

## Phase 4: Multi-Site Schema Support

### 4.1 Create Site-Specific Schema Configuration

**New File:** `lib/site-schema-config.ts`

```typescript
interface SiteSchemaConfig {
  siteId: string;
  organizationName: string;
  organizationLogo: string;
  organizationUrl: string;
  publisherName: string;
  publisherLogo: string;
}

const SITE_SCHEMA_CONFIGS: Record<string, SiteSchemaConfig> = {
  'seniorsimple': {
    siteId: 'seniorsimple',
    organizationName: 'SeniorSimple',
    organizationLogo: 'https://seniorsimple.org/logo.png',
    organizationUrl: 'https://seniorsimple.org',
    publisherName: 'SeniorSimple',
    publisherLogo: 'https://seniorsimple.org/logo.png'
  },
  'smallbizsimple': {
    siteId: 'smallbizsimple',
    organizationName: 'SmallBizSimple',
    organizationLogo: 'https://smallbizsimple.org/logo.png',
    organizationUrl: 'https://smallbizsimple.org',
    publisherName: 'SmallBizSimple',
    publisherLogo: 'https://smallbizsimple.org/logo.png'
  },
  // ... add all sites
};
```

### 4.2 Update Schema Generation to Use Site Config

- Pull site_id from article
- Use site-specific organization data
- Generate site-appropriate schema

---

## Phase 5: Content Structure Enforcement

### 5.1 Create Content Structure Analyzer

**New File:** `lib/content-structure-analyzer.ts`

**Functionality:**
- Analyzes markdown/HTML for heading structure
- Validates H1/H2/H3 hierarchy
- Extracts data points
- Identifies lists and tables
- Validates answer-first placement

### 5.2 Add Content Structure Validation to CMS

**File:** `components/cms/ContentEditor.tsx`

**Add:**
- Real-time structure validation
- AEO score indicator
- Warnings for non-AEO structure
- Suggestions for improvement

---

## Phase 6: CMS UI Enhancements

### 6.1 Add AEO Content Type Selector

**Location:** `components/cms/ContentEditor.tsx`

**Add:**
- Dropdown for AEO content type (Definition, How-To, Comparison, Data, Formula)
- Template selection based on type
- AEO optimization checklist

### 6.2 Add AEO Summary Field

**Location:** Article form

**Add:**
- Dedicated "AEO Summary" field (first 100 words)
- Auto-extract from content
- Validation that answer is present
- Character counter (100 words max)

### 6.3 Add Schema Preview

**Location:** Article preview/edit

**Add:**
- Schema preview panel
- Validation status indicator
- Edit schema button
- Speakable schema preview

---

## Phase 7: Automated Workflows

### 7.1 Content Generation Workflow

**Update:** `supabase/functions/agentic-content-gen/index.ts`

**Flow:**
1. Detect AEO content type from title/topic
2. Load appropriate template
3. Generate content with AEO structure
4. Validate answer-first
5. Extract data points
6. Generate schema
7. Save all AEO fields

### 7.2 Schema Generation Workflow

**New:** `supabase/functions/auto-schema-generator/index.ts`

**Trigger:** On article publish/update

**Flow:**
1. Analyze article content
2. Determine schema type
3. Generate schema with site-specific data
4. Add speakable schema
5. Validate schema
6. Save to `articles.schema_markup`
7. Mark as validated

---

## Phase 8: Integration Points

### 8.1 Update Markdown-to-HTML Function

**File:** `supabase/functions/markdown-to-html/index.ts`

**Add:**
- Extract AEO summary during conversion
- Preserve heading structure
- Identify data points
- Generate content structure JSON

### 8.2 Update Article Save/Update

**Files:** `app/cms/new/page.tsx`, `app/cms/edit/[id]/page.tsx`

**Add:**
- Call schema generator on save
- Validate AEO structure
- Auto-populate AEO fields
- Show AEO score

---

## Implementation Priority (Updated with Edge Functions Analysis)

### Week 1: Foundation & Core Functions
1. ✅ Database schema updates (AEO fields)
2. ✅ AEO content templates table
3. ✅ Site schema configurations
4. ✅ **NEW:** Create `agentic-content-gen` edge function (AEO-optimized)
5. ✅ **NEW:** Create `aeo-content-validator` edge function
6. ✅ **NEW:** Create `schema-generator` edge function

### Week 2: Enhance Existing Functions
7. ✅ Enhance `markdown-to-html` with AEO extraction
   - Extract AEO summary (first 100 words)
   - Extract content structure
   - Validate answer-first
8. ✅ Enhance `ai-link-suggestions` with AEO scoring
   - Prioritize AEO-optimized articles
   - Score by schema, data points, citations
9. ✅ Enhance `insert-links` with AEO placement
   - Prioritize first 100 words
   - Optimize for data sections

### Week 3: Additional AEO Functions
10. ✅ **NEW:** Create `aeo-content-enhancer` edge function
11. ✅ **NEW:** Create `aeo-query-analyzer` edge function
12. ✅ Update AI prompts for AEO structure in `agentic-content-gen`
13. ✅ Add answer-first validation to content generation

### Week 4: CMS Integration
14. ✅ AEO fields in CMS forms
15. ✅ Schema preview/validation UI
16. ✅ Content structure analyzer component
17. ✅ Integrate `aeo-query-analyzer` in CMS
18. ✅ Integrate `aeo-content-validator` in publishing workflow

### Week 5: Automation & Multi-Site
19. ✅ Auto-schema generation on publish
20. ✅ AEO validation workflow automation
21. ✅ Multi-site schema support
22. ✅ Update `generate-complete-article.js` workflow
23. ✅ Retrofit existing content with `aeo-content-enhancer`

---

## Testing Checklist

- [ ] Answer appears in first 100 words
- [ ] Schema is generated and valid
- [ ] Schema is hardcoded in HTML (not JS-loaded)
- [ ] Speakable schema is present
- [ ] Site-specific organization data correct
- [ ] Content structure has proper H1/H2/H3
- [ ] Data points are extracted
- [ ] Citations are included
- [ ] All Simple sites have correct schema

---

## Success Metrics

1. **Indexability:** 100% of published articles have valid schema
2. **Answer-First:** 100% of articles have answer in first 100 words
3. **Schema Coverage:** All sites have organization + article schema
4. **Voice Ready:** All articles have speakable schema
5. **Structure:** All articles have proper heading hierarchy

---

## Next Steps

1. **Review Deep Dive Document:** See `AEO_EDGE_FUNCTIONS_DEEP_DIVE.md` for detailed function analysis
2. **Review and approve this plan**
3. **Create database migration** for AEO fields
4. **Implement Priority 1 functions:**
   - Create `agentic-content-gen` (primary AEO generator)
   - Create `aeo-content-validator` (validation system)
   - Create `schema-generator` (schema generation)
5. **Enhance existing functions:**
   - Update `markdown-to-html` with AEO extraction
   - Update `ai-link-suggestions` with AEO scoring
   - Update `insert-links` with AEO placement
6. **Test with one article** on seniorsimple.org
7. **Roll out incrementally** to all Simple sites

## Related Documents

- **`AEO_EDGE_FUNCTIONS_DEEP_DIVE.md`** - Comprehensive analysis of existing functions and new functions needed
- **`AEO_FIRST_IMPLEMENTATION_PLAN.md`** - This document (overall implementation plan)

