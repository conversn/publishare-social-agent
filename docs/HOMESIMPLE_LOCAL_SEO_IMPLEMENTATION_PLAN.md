# HomeSimple Local SEO Agent - Implementation Plan

## Overview

Implement local SEO page generation system for HomeSimple.org's `[city][problem][help].com` network. Enhance existing Publishare functions (70%) and build 3 new specialized functions (30%) to avoid bloat.

**Publishing Target**: Supabase (articles table)  
**Phone Routing**: CallReady system  
**Timeline**: 4 phases over 8 weeks

---

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Database Schema Migration

**File**: `supabase/migrations/20250201000001_create_homesimple_local_seo_tables.sql`

**Create tables**:
- `domains` - Domain/city/vertical mapping
- `local_facts` - City-specific facts (neighborhoods, climate, regulations)
- `quality_checks` - Uniqueness scores, doorway risk, validation results
- `content_blocks` - Modular page content blocks

**Extend `articles` table**:
- `page_type` VARCHAR(50) DEFAULT 'article' (add 'local_page')
- `city` VARCHAR(100)
- `state` VARCHAR(2)
- `vertical` VARCHAR(50) (hvac/plumbing/pest/etc)
- `phone_number` VARCHAR(20)
- `service_areas` TEXT[]
- `call_routing_configured` BOOLEAN DEFAULT false

**Dependencies**: None  
**Effort**: 1 day

---

### 1.2 Enhance `agentic-content-gen` for Local Pages

**File**: `supabase/functions/agentic-content-gen/index.ts`

**Changes**:
1. Add local page request parameters to `AgenticContentGenRequest`:
   - `page_type?: 'article' | 'local_page'`
   - `city?: string`
   - `state?: string`
   - `vertical?: string`
   - `service_areas?: string[]`
   - `local_facts?: { neighborhoods, climate_notes, common_issues, regulations }`
   - `phone_number?: string`
   - `call_routing_configured?: boolean`

2. Add `fetchLocalFacts()` function to query `local_facts` table

3. Enhance `generateAIContent()` prompt for local pages:
   - Include city/state context
   - Add service area sections
   - Include "What happens when you call" section
   - Add local trust cues (neighborhoods, climate-specific issues)
   - Generate click-to-call optimized CTAs

4. Generate LocalBusiness schema when `page_type === 'local_page'`

**Key Functions to Modify**:
- `generateAIContent()` - Add local context to prompts
- `buildContentAgentSystemPrompt()` - Include local page rules
- Main handler - Add local facts fetching and schema generation

**Dependencies**: Database migration (1.1)  
**Effort**: 2-3 days

---

### 1.3 Enhance `schema-generator` for LocalBusiness

**File**: `supabase/functions/schema-generator/index.ts`

**Changes**:
1. Add `generateLocalBusinessSchema()` function
2. Add ServiceArea schema support
3. Update `detectSchemaType()` to recognize local pages
4. Validate schema matches visible content (no invisible claims)

**Key Functions to Modify**:
- `detectSchemaType()` - Add 'LocalBusiness' detection
- `generateArticleSchema()` - Add LocalBusiness branch
- Main handler - Accept local business data

**Dependencies**: None  
**Effort**: 1-2 days

---

## Phase 2: Quality Gates (Weeks 3-4)

### 2.1 Build `validate-doorway-risk` Function

**File**: `supabase/functions/validate-doorway-risk/index.ts` (NEW)

**Purpose**: Detect doorway pages using embeddings similarity

**Implementation**:
1. Use OpenAI embeddings API for content similarity
2. Compare against all pages in same vertical
3. Calculate similarity scores (0-1 scale)
4. Threshold: >0.85 = high risk, >0.75 = medium risk
5. Store similarity hashes in `quality_checks` table

**Request Interface**:
```typescript
interface DoorwayRiskRequest {
  page_content: string;
  page_id?: string;
  domain_id: string;
  vertical: string;
  compare_against?: string[];
}
```

**Response Interface**:
```typescript
interface DoorwayRiskResponse {
  risk_level: 'low' | 'medium' | 'high';
  similarity_score: number;
  similar_pages: Array<{
    page_id: string;
    similarity: number;
    matching_sections: string[];
  }>;
  recommendations: string[];
  can_publish: boolean;
}
```

**Key Functions**:
- `generateEmbedding()` - Call OpenAI embeddings API
- `calculateSimilarity()` - Cosine similarity between embeddings
- `findSimilarPages()` - Query database for comparison
- `assessRiskLevel()` - Determine risk based on thresholds

**Dependencies**: 
- OpenAI API key (environment variable)
- `quality_checks` table (Phase 1.1)
- `articles` table with embeddings stored

**Effort**: 4-5 days

---

### 2.2 Enhance `aeo-content-validator` for Quality Gates

**File**: `supabase/functions/aeo-content-validator/index.ts`

**Changes**:
1. Add `validateDoorwayRisk()` - Calls `validate-doorway-risk` function
2. Add `validateUniqueness()` - Checks content uniqueness
3. Add `validateClaims()` - Validates operational claims (24/7, response times)
4. Add `validateCallRouting()` - Validates CallReady integration
5. Update response interface to include new checks

**Key Functions to Modify**:
- Main handler - Add new validation checks
- `calculateScore()` - Include new checks in scoring
- `generateRecommendations()` - Add recommendations for new checks

**Dependencies**: 
- `validate-doorway-risk` function (2.1)
- CallReady API integration (if available)
- `quality_checks` table

**Effort**: 4-5 days

---

## Phase 3: Publishing & Planning (Weeks 5-6)

### 3.1 Build `plan-pages` Function

**File**: `supabase/functions/plan-pages/index.ts` (NEW)

**Purpose**: Generate rollout plan per city/vertical/domain

**Implementation**:
1. Analyze existing pages for domain/vertical
2. Identify content gaps using AI
3. Generate page recommendations with slugs, keywords, internal links
4. Create internal linking strategy
5. Generate sitemap tasks

**Request Interface**:
```typescript
interface PlanPagesRequest {
  domain_id: string;
  city?: string;
  state?: string;
  vertical: string;
  target_pages?: number;
  existing_pages?: string[];
}
```

**Response Interface**:
```typescript
interface PlanPagesResponse {
  plan: {
    pages_to_create: Array<{
      slug: string;
      title: string;
      primary_keyword: string;
      internal_link_targets: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
    internal_linking_strategy: {
      hub_pages: string[];
      cluster_pages: string[];
      link_map: Record<string, string[]>;
    };
    sitemap_tasks: string[];
  };
}
```

**Key Functions**:
- `analyzeExistingPages()` - Query articles table
- `identifyContentGaps()` - AI-powered gap analysis
- `generatePageRecommendations()` - Create page specs
- `buildLinkingStrategy()` - Internal linking plan
- `generateSitemapTasks()` - Sitemap generation plan

**Dependencies**: 
- `domains` table (Phase 1.1)
- `articles` table
- OpenAI API for gap analysis

**Effort**: 3-4 days

---

### 3.2 Build `publish-page` Function

**File**: `supabase/functions/publish-page/index.ts` (NEW)

**Purpose**: Publish pages to Supabase (articles table) and update sitemap

**Implementation**:
1. Validate page passes all quality gates (calls `aeo-content-validator`)
2. Create/update article in `articles` table
3. Update sitemap (if applicable)
4. Ping indexing services (optional)
5. Update `domains.pages` count

**Request Interface**:
```typescript
interface PublishPageRequest {
  page_id: string;
  update_sitemap?: boolean;
  ping_indexing?: boolean;
  skip_validation?: boolean; // For testing
}
```

**Response Interface**:
```typescript
interface PublishPageResponse {
  success: boolean;
  published_url?: string;
  sitemap_updated?: boolean;
  indexing_pinged?: boolean;
  validation_results?: any;
}
```

**Key Functions**:
- `validatePage()` - Call `aeo-content-validator`
- `publishToSupabase()` - Insert/update articles table
- `updateSitemap()` - Generate/update sitemap.xml
- `pingIndexing()` - Ping Google/Bing (optional)

**Note**: Since publishing target is Supabase, this is simpler than WordPress/Webflow integration. Main work is validation orchestration and sitemap management.

**Dependencies**: 
- `aeo-content-validator` (Phase 2.2)
- `articles` table
- Sitemap generation logic

**Effort**: 2-3 days

---

## Phase 4: Monitoring & Refresh (Weeks 7-8)

### 4.1 Enhance `batch-strategy-processor` for Refresh Mode

**File**: `supabase/functions/batch-strategy-processor/index.ts`

**Changes**:
1. Add refresh mode to request interface:
   - `mode?: 'generate' | 'refresh'`
   - `refresh_criteria?: { min_age_days, ranking_drop_threshold, ctr_threshold }`
   - `refresh_scope?: 'full' | 'section'`
   - `section_to_refresh?: string` (hero, answer_pack, faq, etc)

2. Add ranking/CTR monitoring:
   - Query Search Console API (if available)
   - Track ranking changes
   - Identify underperforming pages

3. Add section-level rewriting:
   - Identify weak sections (hero, answer pack, FAQ)
   - Regenerate only weak sections
   - Preserve strong sections

4. Add A/B testing support:
   - Track variant performance
   - Rotate CTAs, headlines, trust bars

**Key Functions to Modify**:
- `fetchStrategies()` - Add refresh mode filtering
- `processStrategy()` - Add refresh logic
- `identifyWeakSections()` - AI-powered analysis
- `refreshSection()` - Regenerate specific sections

**Dependencies**: 
- Search Console API (optional)
- `agentic-content-gen` (Phase 1.2)
- `experiments` table (if A/B testing)

**Effort**: 2-3 days

---

## Implementation Order & Dependencies

```
Phase 1.1: Database Schema
    ├──> Phase 1.2: Enhance agentic-content-gen
    └──> Phase 1.3: Enhance schema-generator

Phase 1.1 + Phase 1.2
    └──> Phase 2.1: Build validate-doorway-risk

Phase 2.1 + Phase 1.3
    └──> Phase 2.2: Enhance aeo-content-validator

Phase 1.1
    └──> Phase 3.1: Build plan-pages

Phase 2.2
    └──> Phase 3.2: Build publish-page

Phase 1.2 + Phase 3.2
    └──> Phase 4.1: Enhance batch-strategy-processor
```

---

## Testing Strategy

### Phase 1 Testing
- Generate test local page with city/vertical
- Verify local facts integration
- Verify LocalBusiness schema generation

### Phase 2 Testing
- Test doorway risk detection with similar pages
- Test claim validation with CallReady integration
- Test call-routing validation

### Phase 3 Testing
- Test page planning for multi-city rollout
- Test publishing workflow end-to-end
- Test sitemap generation

### Phase 4 Testing
- Test refresh mode with existing pages
- Test section-level rewriting
- Test A/B testing rotation

---

## Configuration & Environment Variables

**New Environment Variables**:
- `OPENAI_API_KEY` - For embeddings (doorway detection)
- `CALLREADY_API_KEY` - For call routing validation (if available)
- `GOOGLE_SEARCH_CONSOLE_API_KEY` - For ranking monitoring (optional)

**Database Secrets**:
- Store CallReady credentials in Supabase secrets
- Store Search Console credentials in Supabase secrets

---

## Success Criteria

### Phase 1
- Can generate local pages with city-specific content
- LocalBusiness schema generated correctly
- Local facts integrated into content

### Phase 2
- Doorway risk detection blocks similar pages (>0.85 threshold)
- Claim validation prevents unverified claims
- Call-routing validation ensures pages are ready

### Phase 3
- Page planning generates actionable rollout plans
- Publishing workflow completes end-to-end
- Sitemap updates automatically

### Phase 4
- Refresh mode identifies and fixes weak sections
- A/B testing rotates variants automatically
- Monitoring tracks page performance

---

## Risk Mitigation

1. **Embeddings API Costs**: Monitor OpenAI usage, implement caching
2. **CallReady Integration**: If API unavailable, make validation optional
3. **Similarity Thresholds**: Start conservative (0.85), adjust based on results
4. **Local Facts Data**: Start with manual entry, automate later
5. **Performance**: Batch similarity checks, use database indexes

---

## Next Steps After Plan Approval

1. Create database migration file (Phase 1.1)
2. Begin Phase 1.1 implementation
3. Set up environment variables
4. Create test data for local facts
5. Begin iterative development and testing

