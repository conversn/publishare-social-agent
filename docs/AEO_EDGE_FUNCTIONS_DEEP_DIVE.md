# AEO Edge Functions Deep Dive & Implementation Plan

## Executive Summary

This document provides a comprehensive analysis of existing Publishare CMS edge functions and outlines exactly where to transition agentic content generation into AEO powerhouses. It identifies enhancement opportunities in existing functions and specifies new functions required for AEO-first content generation.

---

## Current Edge Functions Inventory

### ✅ Existing Functions (12 - Confirmed via Supabase CLI)

**Content Generation:**
1. **`agentic-content-gen`** ✅ ACTIVE (v22) - Primary agentic content generator
2. **`ai-content-generator`** ✅ ACTIVE (v19) - AI content generation (fallback)

**Content Enhancement:**
3. **`ai-image-generator`** ✅ ACTIVE (v27) - Image generation with GPT-Image-1
4. **`ai-link-suggestions`** ✅ ACTIVE (v13) - Internal link suggestions
5. **`insert-links`** ✅ ACTIVE (v2) - Intelligent link insertion into markdown
6. **`markdown-to-html`** ✅ ACTIVE (v8) - Markdown to HTML conversion
7. **`keyword-suggestions`** ✅ ACTIVE (v3) - Keyword generation
8. **`content-optimizer`** ✅ ACTIVE (v3) - Content optimization

**Media & Utilities:**
9. **`link-image-to-article`** ✅ ACTIVE (v2) - Image-to-article linking helper
10. **`image-upload`** ✅ ACTIVE (v5) - Image upload handler
11. **`promotion-manager`** ✅ ACTIVE (v2) - Promotion management
12. **`notion-webhook`** ✅ ACTIVE (v7) - Notion integration

### 🔍 Key Discovery

Both `agentic-content-gen` and `ai-content-generator` **DO EXIST** and are active in Supabase. They were not found in the local codebase but are deployed and functional.

---

## Current Content Generation Workflow

```
1. agentic-content-gen (TRY) → Falls back to ai-content-generator
2. ai-image-generator
3. ai-link-suggestions
4. insert-links
5. markdown-to-html
```

**Problem:** No AEO optimization at any step.

---

## Phase 1: Enhance Existing Functions for AEO

### 1.1 `markdown-to-html` → AEO Enhancement

**Current Functionality:**
- Converts markdown to HTML
- Adds prose classes
- Saves to `html_body` column

**AEO Enhancements Needed:**

#### Enhancement 1.1.1: Extract AEO Summary (First 100 Words)
```typescript
// Add to markdown-to-html/index.ts

function extractAEOSummary(markdown: string): string {
  // Extract first 100 words
  const words = markdown.split(/\s+/).slice(0, 100).join(' ');
  
  // Remove markdown syntax for clean summary
  const cleanSummary = words
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
    .replace(/\n+/g, ' ') // Remove line breaks
    .trim();
  
  return cleanSummary;
}

// In main handler, after markdown parsing:
const aeoSummary = extractAEOSummary(markdown);

// Save to database if article_id provided
if (body.article_id && aeoSummary) {
  await supabase
    .from('articles')
    .update({ aeo_summary: aeoSummary })
    .eq('id', body.article_id);
}
```

#### Enhancement 1.1.2: Extract Content Structure
```typescript
// Add to markdown-to-html/index.ts

interface ContentStructure {
  h1: string | null;
  h2: string[];
  h3: string[];
  lists: number;
  tables: number;
  dataPoints: string[];
}

function extractContentStructure(markdown: string): ContentStructure {
  const lines = markdown.split('\n');
  const structure: ContentStructure = {
    h1: null,
    h2: [],
    h3: [],
    lists: 0,
    tables: 0,
    dataPoints: []
  };
  
  for (const line of lines) {
    // Extract H1
    if (line.match(/^#\s+/)) {
      structure.h1 = line.replace(/^#\s+/, '').trim();
    }
    // Extract H2
    else if (line.match(/^##\s+/)) {
      structure.h2.push(line.replace(/^##\s+/, '').trim());
    }
    // Extract H3
    else if (line.match(/^###\s+/)) {
      structure.h3.push(line.replace(/^###\s+/, '').trim());
    }
    // Count lists
    else if (line.match(/^[\*\-\+]\s+|^\d+\.\s+/)) {
      structure.lists++;
    }
    // Count tables
    else if (line.includes('|')) {
      structure.tables++;
    }
    // Extract data points (numbers, percentages, statistics)
    const dataMatches = line.match(/\$[\d,]+|[\d,]+%|[\d,]+ (million|billion|thousand)/gi);
    if (dataMatches) {
      structure.dataPoints.push(...dataMatches);
    }
  }
  
  return structure;
}

// In main handler:
const contentStructure = extractContentStructure(markdown);

// Save to database
if (body.article_id) {
  await supabase
    .from('articles')
    .update({ content_structure: contentStructure })
    .eq('id', body.article_id);
}
```

#### Enhancement 1.1.3: Validate Answer-First Structure
```typescript
// Add to markdown-to-html/index.ts

function validateAnswerFirst(markdown: string): {
  valid: boolean;
  summary: string;
  issues: string[];
} {
  const first100Words = markdown.split(/\s+/).slice(0, 100).join(' ');
  const issues: string[] = [];
  
  // Check for direct answer indicators
  const hasDirectAnswer = 
    /(is|are|means|refers to|defined as|consists of)/i.test(first100Words) ||
    /\d+/.test(first100Words) || // Contains numbers
    /(yes|no|true|false|correct|incorrect)/i.test(first100Words);
  
  // Check for question-based opening
  const hasQuestion = /^(what|how|why|when|where|who|which)/i.test(markdown.trim());
  
  // Check for fluff (weak opening)
  const hasFluff = /^(in today|in this|welcome|introduction|overview)/i.test(first100Words);
  
  if (!hasDirectAnswer) {
    issues.push('Direct answer not found in first 100 words');
  }
  
  if (hasFluff) {
    issues.push('Content starts with fluff instead of direct answer');
  }
  
  return {
    valid: hasDirectAnswer && !hasFluff,
    summary: first100Words,
    issues
  };
}

// In main handler:
const answerFirstValidation = validateAnswerFirst(markdown);

// Save validation result
if (body.article_id) {
  await supabase
    .from('articles')
    .update({ 
      aeo_answer_first: answerFirstValidation.valid,
      aeo_summary: answerFirstValidation.summary
    })
    .eq('id', body.article_id);
}
```

**Updated Response:**
```typescript
interface MarkdownToHtmlResponse {
  success: boolean;
  html?: string;
  html_body?: string;
  aeo_summary?: string;
  content_structure?: ContentStructure;
  answer_first_valid?: boolean;
  timestamp: string;
  error?: string;
}
```

---

### 1.2 `ai-link-suggestions` → AEO Enhancement

**Current Functionality:**
- Keyword extraction
- Database query for related articles
- Basic relevance scoring

**AEO Enhancements Needed:**

#### Enhancement 1.2.1: AEO-Optimized Link Suggestions
```typescript
// Add to ai-link-suggestions/index.ts

// Prioritize links that:
// 1. Answer related questions
// 2. Provide data/comparisons
// 3. Are definition articles
// 4. Have proper schema

async function getAEOOptimizedSuggestions(
  content: string,
  articleId: string | null,
  maxSuggestions: number
): Promise<LinkSuggestion[]> {
  // Extract question-based keywords
  const questionKeywords = extractQuestionKeywords(content);
  
  // Query for AEO-optimized articles
  let query = supabase
    .from('articles')
    .select('id, title, slug, excerpt, category, aeo_content_type, schema_markup')
    .eq('status', 'published')
    .eq('aeo_answer_first', true) // Only AEO-optimized articles
    .limit(maxSuggestions * 3);
  
  // Prioritize definition articles for "what is" queries
  if (questionKeywords.includes('what')) {
    query = query.eq('aeo_content_type', 'definition');
  }
  
  // Prioritize how-to articles for "how" queries
  if (questionKeywords.includes('how')) {
    query = query.eq('aeo_content_type', 'how-to');
  }
  
  // Prioritize comparison articles for "vs" queries
  if (questionKeywords.includes('vs') || questionKeywords.includes('versus')) {
    query = query.eq('aeo_content_type', 'comparison');
  }
  
  const { data } = await query;
  
  // Score by AEO factors
  return (data || []).map(article => ({
    ...article,
    aeo_score: calculateAEOScore(article, content)
  })).sort((a, b) => b.aeo_score - a.aeo_score)
    .slice(0, maxSuggestions);
}

function extractQuestionKeywords(content: string): string[] {
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'vs', 'versus'];
  const lowerContent = content.toLowerCase();
  return questionWords.filter(word => lowerContent.includes(word));
}

function calculateAEOScore(article: any, content: string): number {
  let score = 0;
  
  // Has schema = +10
  if (article.schema_markup) score += 10;
  
  // Answer-first validated = +5
  if (article.aeo_answer_first) score += 5;
  
  // Has data points = +3
  if (article.data_points && article.data_points.length > 0) score += 3;
  
  // Has citations = +2
  if (article.citations && article.citations.length > 0) score += 2;
  
  // Content type match = +5
  const contentType = detectContentType(content);
  if (article.aeo_content_type === contentType) score += 5;
  
  return score;
}
```

---

### 1.3 `insert-links` → AEO Enhancement

**Current Functionality:**
- Intelligent link insertion
- Contextual anchor text
- Avoids over-linking

**AEO Enhancements Needed:**

#### Enhancement 1.3.1: AEO-Optimized Link Placement
```typescript
// Add to insert-links/index.ts

// Prioritize link placement in:
// 1. First 100 words (if relevant)
// 2. Data-heavy sections
// 3. Comparison sections
// 4. Definition sections

function findAEOInsertionPoints(
  markdown: string,
  suggestions: LinkSuggestion[]
): InsertionPoint[] {
  const insertionPoints: InsertionPoint[] = [];
  const first100Words = markdown.split(/\s+/).slice(0, 100).join(' ');
  
  // Priority 1: First 100 words (if definition/comparison link)
  for (const suggestion of suggestions) {
    if (suggestion.aeo_content_type === 'definition' || 
        suggestion.aeo_content_type === 'comparison') {
      const first100Match = findBestMatchInText(first100Words, suggestion);
      if (first100Match) {
        insertionPoints.push({
          ...first100Match,
          priority: 'high',
          aeo_optimized: true
        });
      }
    }
  }
  
  // Priority 2: Data sections (sections with numbers/statistics)
  const dataSections = findDataSections(markdown);
  for (const section of dataSections) {
    for (const suggestion of suggestions) {
      if (suggestion.aeo_content_type === 'data') {
        const match = findBestMatchInText(section.text, suggestion);
        if (match) {
          insertionPoints.push({
            ...match,
            priority: 'medium',
            aeo_optimized: true,
            section_type: 'data'
          });
        }
      }
    }
  }
  
  // Priority 3: Regular insertion points (existing logic)
  const regularPoints = findInsertionPoints(markdown, suggestions);
  insertionPoints.push(...regularPoints.map(p => ({ ...p, priority: 'low' })));
  
  return insertionPoints.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}
```

---

## Phase 2: Enhance Existing & Create New AEO Functions

### 2.1 `agentic-content-gen` (EXISTS - Enhance for AEO)

**Current Status:** ✅ ACTIVE (v22) - Deployed in Supabase

**Current Request Parameters (from scripts):**
```typescript
{
  topic: string;
  source_url?: string;
  platform?: string;
  target_audience?: string;
  content_type?: string; // 'guide', etc.
  content_length?: number;
  tone?: string;
  site_id?: string;
  workflowType?: string;
  businessContext?: string;
  goals?: string;
  seo_optimized?: boolean;
  model?: 'gpt4' | 'claude';
}
```

**Current Response (inferred):**
```typescript
{
  article_id?: string;
  id?: string; // Alternative article_id
  // ... article data
}
```

**AEO Enhancements Needed:**

**Purpose:** Transform existing agentic content generator into AEO powerhouse

**Current Location:** Deployed in Supabase (needs to be downloaded/enhanced)

**Action Required:** 
1. Download existing function code from Supabase
2. Enhance with AEO capabilities
3. Redeploy with AEO optimizations

**Key Features:**
1. AEO content type detection
2. Answer-first structure enforcement
3. Template-based generation
4. Schema generation integration
5. Multi-site support

**Enhanced Request Body (Add AEO Parameters):**
```typescript
interface AgenticContentGenRequest {
  // Existing parameters
  topic: string;
  title?: string;
  source_url?: string;
  site_id: string;
  target_audience?: string;
  content_type?: string; // 'guide', 'definition', 'how-to', 'comparison', etc.
  content_length?: number;
  tone?: string;
  seo_optimized?: boolean;
  model?: 'gpt4' | 'claude';
  
  // NEW AEO Parameters
  aeo_optimized?: boolean; // Default true - enable AEO optimization
  aeo_content_type?: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula' | 'article'; // Auto-detect if not provided
  generate_schema?: boolean; // Default true - generate schema markup
  answer_first?: boolean; // Default true - enforce answer in first 100 words
}
```

**Enhanced Response (Add AEO Data):**
```typescript
interface AgenticContentGenResponse {
  // Existing response
  article_id: string;
  id?: string; // Alternative
  title: string;
  content: string;
  
  // NEW AEO Response Fields
  aeo_summary?: string; // First 100 words
  aeo_content_type?: string; // Detected content type
  content_structure?: ContentStructure; // H1/H2/H3 hierarchy
  answer_first_valid?: boolean; // Validation result
  data_points?: string[]; // Extracted statistics
  citations?: string[]; // Extracted sources
  schema_markup?: JSONLD; // Generated schema
  aeo_score?: number; // 0-100 AEO compliance score
  speakable_summary?: string; // 280-350 char voice summary
}
```

**Enhancement Strategy (Add to Existing Function):**

```typescript
// In existing agentic-content-gen function, add AEO processing:

serve(async (req) => {
  const body: AgenticContentGenRequest = await req.json();
  
  // EXISTING: Generate content (keep existing logic)
  const content = await generateContent(body); // Existing function
  
  // NEW: AEO Processing (if aeo_optimized !== false)
  if (body.aeo_optimized !== false) {
    // Step 1: Detect AEO content type (if not provided)
    const aeoContentType = body.aeo_content_type || 
      detectAEOContentType(body.topic, body.title || content.title);
    
    // Step 2: Validate answer-first
    const validation = validateAnswerFirst(content.content || content.markdown);
    
    // Step 3: Extract structure and data points
    const structure = extractContentStructure(content.content || content.markdown);
    const dataPoints = extractDataPoints(content.content || content.markdown);
    
    // Step 4: Generate schema (if generate_schema !== false)
    let schema = null;
    if (body.generate_schema !== false) {
      schema = await generateSchema({
        article: content,
        site_id: body.site_id,
        content_type: aeoContentType
      });
    }
    
    // Step 5: Generate speakable summary
    const speakableSummary = generateSpeakableSummary(
      content.content || content.markdown,
      content.title
    );
    
    // Step 6: Calculate AEO score
    const aeoScore = calculateAEOScore({
      answerFirst: validation.valid,
      structure: structure,
      dataPoints: dataPoints.length,
      hasSchema: !!schema
    });
    
    // Step 7: Update article in database with AEO data
    if (content.article_id || content.id) {
      await supabase
        .from('articles')
        .update({
          aeo_summary: validation.summary,
          aeo_content_type: aeoContentType,
          content_structure: structure,
          answer_first_valid: validation.valid,
          data_points: dataPoints,
          schema_markup: schema,
          speakable_summary: speakableSummary
        })
        .eq('id', content.article_id || content.id);
    }
    
    // Step 8: Add AEO data to response
    return {
      ...content, // Existing response
      aeo_summary: validation.summary,
      aeo_content_type: aeoContentType,
      content_structure: structure,
      answer_first_valid: validation.valid,
      data_points: dataPoints,
      schema_markup: schema,
      aeo_score: aeoScore,
      speakable_summary: speakableSummary
    };
  }
  
  // Return existing response if AEO not enabled
  return content;
});
```

---

### 2.2 `ai-content-generator` (EXISTS - Enhance for AEO)

**Current Status:** ✅ ACTIVE (v19) - Deployed in Supabase

**Current Usage:** Fallback when `agentic-content-gen` fails

**AEO Enhancements Needed:**
- Same AEO processing as `agentic-content-gen`
- Add AEO parameters to request
- Add AEO data to response
- Can be used as standalone AEO generator

### 2.3 `aeo-content-validator` (NEW)

**Purpose:** Validates content meets AEO requirements

**Location:** `supabase/functions/aeo-content-validator/index.ts`

**Request:**
```typescript
{
  content: string;
  article_id?: string;
  validate_all?: boolean; // Validate all AEO requirements
}
```

**Response:**
```typescript
{
  valid: boolean;
  score: number; // 0-100 AEO score
  checks: {
    answer_first: { valid: boolean; summary: string; issues: string[] };
    structure: { valid: boolean; h1: boolean; h2_count: number; h3_count: number };
    data_points: { valid: boolean; count: number; points: string[] };
    citations: { valid: boolean; count: number; citations: string[] };
    schema: { valid: boolean; has_schema: boolean; schema_type: string };
  };
  recommendations: string[];
}
```

---

### 2.4 `schema-generator` (NEW)

**Purpose:** Generates schema.org JSON-LD for articles

**Location:** `supabase/functions/schema-generator/index.ts`

**Request:**
```typescript
{
  article_id: string;
  site_id?: string;
  schema_types?: string[]; // ['Article', 'HowTo', 'FAQ', 'Speakable']
  regenerate?: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  schemas: JSONLD[];
  speakable_schema?: JSONLD;
  validated: boolean;
  timestamp: string;
}
```

**Key Features:**
- Auto-detects schema type from content
- Generates site-specific organization schema
- Creates speakable schema (280-350 chars)
- Validates against schema.org
- Supports multiple schema types per article

---

### 2.5 `aeo-content-enhancer` (NEW)

**Purpose:** Enhances existing content to meet AEO requirements

**Location:** `supabase/functions/aeo-content-enhancer/index.ts`

**Request:**
```typescript
{
  article_id: string;
  enhancement_type: 'answer-first' | 'structure' | 'data-points' | 'schema' | 'all';
}
```

**Response:**
```typescript
{
  success: boolean;
  enhanced_content: string;
  changes: string[];
  aeo_score_before: number;
  aeo_score_after: number;
  timestamp: string;
}
```

**Use Cases:**
- Retrofit existing articles for AEO
- Fix answer-first violations
- Add missing data points
- Improve structure

---

### 2.6 `aeo-query-analyzer` (NEW)

**Purpose:** Analyzes search queries to determine AEO content type and structure

**Location:** `supabase/functions/aeo-query-analyzer/index.ts`

**Request:**
```typescript
{
  query: string;
  site_id?: string;
}
```

**Response:**
```typescript
{
  content_type: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula';
  question_type: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which';
  suggested_title: string;
  suggested_structure: ContentStructure;
  key_terms: string[];
  data_focus: boolean;
  comparison_focus: boolean;
}
```

**Use Cases:**
- Pre-generation analysis
- Content strategy planning
- Template selection

---

## Phase 3: Updated Content Generation Workflow

### Current Workflow (Non-AEO)
```
1. agentic-content-gen (TRY) → ai-content-generator (FALLBACK) → Generate content
2. ai-image-generator → Generate image
3. ai-link-suggestions → Get links
4. insert-links → Insert links
5. markdown-to-html → Convert to HTML
```

**Note:** Both `agentic-content-gen` and `ai-content-generator` exist and are active. The workflow tries `agentic-content-gen` first, then falls back to `ai-content-generator`.

### New AEO-First Workflow
```
1. aeo-query-analyzer → Analyze query, determine content type (OPTIONAL)
2. agentic-content-gen (ENHANCED) → Generate AEO-optimized content
   ├─ Detects AEO content type
   ├─ Uses AEO template
   ├─ Enforces answer-first
   ├─ Extracts structure
   ├─ Generates schema
   └─ Returns AEO metadata
   OR
   ai-content-generator (ENHANCED) → Fallback with AEO
3. aeo-content-validator → Validate AEO requirements (OPTIONAL - can be inline)
4. schema-generator → Generate/validate schema (if not done in step 2)
5. ai-image-generator → Generate image (AEO-optimized prompt)
6. ai-link-suggestions (ENHANCED) → Get AEO-optimized links
7. insert-links (ENHANCED) → Insert links (AEO-optimized placement)
8. markdown-to-html (ENHANCED) → Convert to HTML
   ├─ Extracts AEO summary (if not already done)
   ├─ Validates answer-first (if not already done)
   └─ Extracts structure (if not already done)
9. Auto-inject schema into HTML (hardcoded in <head>)
```

**Key Change:** Since `agentic-content-gen` already exists, we enhance it rather than create new. AEO processing can be integrated directly into the existing function.

---

## Phase 4: Function Integration Points

### 4.1 CMS Integration

**File:** `app/cms/new/page.tsx`

**Update `handleAIGeneratedContent`:**
```typescript
const handleAIGeneratedContent = async (aiFormData: any) => {
  // Step 1: Analyze query
  const queryAnalysis = await fetch('/api/aeo-query-analyzer', {
    method: 'POST',
    body: JSON.stringify({ query: aiFormData.topic })
  });
  
  // Step 2: Generate AEO content
  const response = await fetch(
    'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen',
    {
      method: 'POST',
      body: JSON.stringify({
        topic: aiFormData.topic,
        site_id: currentSiteId,
        aeo_optimized: true,
        content_type: queryAnalysis.content_type,
        ...aiFormData
      })
    }
  );
  
  // Step 3: Validate
  const validation = await fetch(
    'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/aeo-content-validator',
    {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId })
    }
  );
  
  // Step 4: Update form with AEO data
  setFormData(prev => ({
    ...prev,
    ...articleData,
    aeo_summary: articleData.aeo_summary,
    aeo_content_type: articleData.aeo_content_type,
    answer_first_valid: validation.valid
  }));
};
```

### 4.2 Article Publishing Integration

**File:** `app/cms/edit/[id]/page.tsx`

**Update `handleSave`:**
```typescript
const handleSave = async () => {
  // ... existing save logic ...
  
  // After save, validate AEO
  const validation = await fetch(
    'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/aeo-content-validator',
    {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId })
    }
  );
  
  // Generate schema if missing
  if (!article.schema_markup) {
    await fetch(
      'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/schema-generator',
      {
        method: 'POST',
        body: JSON.stringify({ article_id: articleId })
      }
    );
  }
  
  // Show AEO score
  toast({
    title: 'Article Saved',
    description: `AEO Score: ${validation.score}/100`
  });
};
```

---

## Phase 5: Implementation Priority (Updated)

### Priority 1: Enhance Existing Content Generators (Week 1-2)
1. ✅ **Download & Enhance `agentic-content-gen`** - Add AEO processing
   - Download existing function from Supabase
   - Add AEO content type detection
   - Add answer-first validation
   - Add schema generation
   - Add AEO metadata extraction
   - Redeploy enhanced version
2. ✅ **Download & Enhance `ai-content-generator`** - Add AEO processing
   - Same enhancements as agentic-content-gen
   - Can serve as AEO fallback
3. ✅ **Create `aeo-content-validator`** - Standalone validation system
4. ✅ **Create `schema-generator`** - Standalone schema generation

### Priority 2: Enhancement Functions (Week 3)
5. ✅ **Create `aeo-content-enhancer`** - Retrofit existing content
6. ✅ **Create `aeo-query-analyzer`** - Query analysis

### Priority 3: Enhance Other Existing Functions (Week 4)
7. ✅ Enhance `markdown-to-html` with AEO extraction
8. ✅ Enhance `ai-link-suggestions` with AEO scoring
9. ✅ Enhance `insert-links` with AEO placement
10. ✅ Review `content-optimizer` - May already have some AEO features
11. ✅ Review `keyword-suggestions` - May need AEO enhancements

---

## Function Dependencies (Updated)

```
agentic-content-gen (EXISTS - ENHANCE)
  ├─ Current: Generates content, creates article
  ├─ NEW: Uses aeo-query-analyzer (optional)
  ├─ NEW: Uses schema-generator (internal or external)
  ├─ NEW: Validates answer-first
  └─ Outputs: Full AEO-optimized article + AEO metadata

ai-content-generator (EXISTS - ENHANCE)
  ├─ Current: Fallback content generator
  ├─ NEW: Same AEO enhancements as agentic-content-gen
  └─ Outputs: AEO-optimized content + metadata

aeo-content-validator
  ├─ Reads: articles table
  └─ Outputs: Validation report

schema-generator
  ├─ Reads: articles table
  ├─ Reads: sites table (for org data)
  └─ Outputs: JSON-LD schema

markdown-to-html
  ├─ Enhanced: Extracts AEO data
  └─ Outputs: HTML + AEO metadata

ai-link-suggestions
  ├─ Enhanced: AEO scoring
  └─ Outputs: AEO-optimized suggestions

insert-links
  ├─ Enhanced: AEO placement
  └─ Outputs: Markdown with AEO-optimized links
```

---

## Database Schema Requirements

All functions require these columns in `articles` table:
- `aeo_summary` (TEXT)
- `aeo_answer_first` (BOOLEAN)
- `content_structure` (JSONB)
- `speakable_summary` (TEXT)
- `schema_markup` (JSONB)
- `schema_validated` (BOOLEAN)
- `aeo_content_type` (VARCHAR)
- `citations` (JSONB)
- `data_points` (JSONB)

---

## Testing Strategy

### Unit Tests
- Test each function independently
- Mock Supabase calls
- Validate AEO requirements

### Integration Tests
- Test full workflow
- Verify schema injection
- Validate answer-first enforcement

### End-to-End Tests
- Generate article from query
- Validate AEO score > 80
- Verify schema in HTML
- Test multi-site support

---

## Migration Path (Updated)

### Step 1: Download & Enhance Existing Functions
- Download `agentic-content-gen` from Supabase
- Download `ai-content-generator` from Supabase
- Review existing code structure
- Add AEO enhancements (backward compatible)
- Test enhanced versions
- Redeploy enhanced functions

### Step 2: Create New Functions
- Deploy `aeo-content-validator`
- Deploy `schema-generator`

### Step 2: Enhance Existing Functions
- Update `markdown-to-html`
- Update `ai-link-suggestions`
- Update `insert-links`

### Step 3: Update Workflows
- Update `generate-complete-article.js`
- Update CMS forms
- Update publishing workflow

### Step 4: Retrofit Existing Content
- Use `aeo-content-enhancer` on existing articles
- Validate and fix answer-first issues
- Generate missing schemas

---

## Success Metrics

- ✅ 100% of new articles have AEO score > 80
- ✅ 100% of articles have valid schema
- ✅ 100% of articles have answer in first 100 words
- ✅ 100% of articles have speakable schema
- ✅ All 7 Simple sites have correct organization schema

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Create database migration** - Add AEO columns
3. **Implement Priority 1 functions** - Core AEO generators
4. **Test with one article** - Validate workflow
5. **Roll out incrementally** - Site by site

