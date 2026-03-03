# HomeSimple Local SEO Agent - Evaluation & Recommendations

**Date**: January 2025  
**Scope**: Evaluate existing Publishare edge functions against LOCAL_PAGES_AGENTS.md requirements  
**Goal**: Determine enhancement vs. new build strategy to avoid bloat

---

## Executive Summary

**Current State**: Publishare has robust **article/content generation** capabilities but **lacks local SEO specialization** required for `[city][problem][help].com` pages.

**Recommendation**: **Enhance existing functions** (70%) + **Build 3 new specialized functions** (30%) to avoid bloat while meeting HomeSimple requirements.

**Key Gap**: No doorway detection, local uniqueness validation, or city-specific content generation.

---

## Requirements Mapping (from LOCAL_PAGES_AGENTS.md)

### Required Functions

| Function | Purpose | Status | Recommendation |
|----------|---------|--------|----------------|
| `plan_pages()` | Generate rollout plan per city/vertical/domain | ❌ **Missing** | **NEW BUILD** |
| `draft_page()` | Create page draft from blocks + local facts + AEO | ⚠️ **Partial** | **ENHANCE** `agentic-content-gen` |
| `validate_page()` | QA gates: uniqueness, doorway risk, claim checks | ⚠️ **Partial** | **ENHANCE** `aeo-content-validator` |
| `publish_page()` | Push to CMS/static repo, update sitemap | ❌ **Missing** | **NEW BUILD** |
| `monitor_and_refresh()` | Daily/weekly refresh loop | ⚠️ **Partial** | **ENHANCE** `batch-strategy-processor` |

### Required Quality Gates

| Gate | Purpose | Status | Recommendation |
|------|---------|--------|----------------|
| **Gate A**: Doorway risk prevention | Block similar pages > threshold | ❌ **Missing** | **NEW BUILD** |
| **Gate B**: Claim integrity | Block unprovable claims (24/7, response times) | ❌ **Missing** | **ENHANCE** `aeo-content-validator` |
| **Gate C**: Schema correctness | LocalBusiness must match visible content | ⚠️ **Partial** | **ENHANCE** `schema-generator` |
| **Gate D**: Call-routing readiness | Don't publish without tracking/routing | ❌ **Missing** | **ENHANCE** `validate_page()` |

---

## Current Function Analysis

### ✅ Functions That Can Be Enhanced

#### 1. `agentic-content-gen` → Enhance for Local Pages

**Current Capabilities**:
- ✅ AEO-first content generation
- ✅ Answer-first format
- ✅ Schema generation (Article, HowTo, FAQ)
- ✅ Persona integration
- ✅ Site-specific content agent rules
- ✅ HTML conversion
- ✅ Internal linking

**Missing for Local SEO**:
- ❌ City-specific content blocks
- ❌ Local facts integration (neighborhoods, climate, regulations)
- ❌ Service area sections
- ❌ LocalBusiness schema (not just Article)
- ❌ Call-to-action optimization (click-to-call)
- ❌ "What happens when you call" sections

**Enhancement Recommendation**:
```typescript
// Add to agentic-content-gen request:
{
  // ... existing params ...
  page_type?: 'article' | 'local_page',  // NEW
  city?: string,                         // NEW
  state?: string,                        // NEW
  vertical?: string,                      // NEW (hvac/plumbing/etc)
  service_areas?: string[],              // NEW
  local_facts?: {                        // NEW
    neighborhoods?: string[],
    climate_notes?: string,
    common_issues?: string[],
    regulations?: string
  },
  phone_number?: string,                 // NEW
  call_routing_configured?: boolean,    // NEW
  generate_local_schema?: boolean        // NEW
}
```

**Effort**: Medium (2-3 days)  
**Impact**: High - Reuses 80% of existing logic

---

#### 2. `aeo-content-validator` → Enhance for Quality Gates

**Current Capabilities**:
- ✅ Answer-first validation
- ✅ Structure validation (H1/H2/H3)
- ✅ Data points validation
- ✅ Citations validation
- ✅ Schema validation

**Missing for Local SEO**:
- ❌ Doorway risk detection (similarity scoring)
- ❌ Uniqueness validation (embeddings + similarity)
- ❌ Claim integrity checks (24/7, response times)
- ❌ Service area validation (not keyword-stuffed)
- ❌ LocalBusiness schema validation

**Enhancement Recommendation**:
```typescript
// Add to aeo-content-validator:
{
  // ... existing params ...
  validate_doorway_risk?: boolean,      // NEW
  validate_uniqueness?: boolean,         // NEW
  validate_claims?: boolean,             // NEW
  validate_local_schema?: boolean,        // NEW
  compare_against_pages?: string[],      // NEW (page IDs to compare)
  phone_number?: string,                 // NEW
  call_routing_configured?: boolean      // NEW
}

// New response fields:
{
  // ... existing checks ...
  doorway_risk: {
    valid: boolean,
    similarity_score: number,  // 0-1, higher = more similar
    similar_pages: Array<{page_id, similarity, reason}>,
    risk_level: 'low' | 'medium' | 'high'
  },
  uniqueness: {
    valid: boolean,
    uniqueness_score: number,  // 0-1, higher = more unique
    issues: string[]
  },
  claims: {
    valid: boolean,
    unverified_claims: string[],
    missing_proof: string[]
  },
  call_routing: {
    valid: boolean,
    phone_provisioned: boolean,
    routing_configured: boolean,
    fallback_set: boolean
  }
}
```

**Effort**: High (4-5 days) - Requires embeddings/similarity logic  
**Impact**: Critical - Core quality gate

---

#### 3. `schema-generator` → Enhance for LocalBusiness

**Current Capabilities**:
- ✅ Article schema
- ✅ HowTo schema
- ✅ FAQPage schema
- ✅ Speakable schema

**Missing for Local SEO**:
- ❌ LocalBusiness schema
- ❌ ServiceArea schema
- ❌ AggregateRating (if applicable)
- ❌ Validation that schema matches visible content

**Enhancement Recommendation**:
```typescript
// Add LocalBusiness support:
{
  article_id: string,
  schema_types?: ['Article', 'LocalBusiness', 'ServiceArea'],  // NEW
  local_business_data?: {                    // NEW
    name: string,
    address: {
      street: string,
      city: string,
      state: string,
      zip: string
    },
    phone: string,
    service_areas: string[],
    business_hours?: object,
    price_range?: string
  }
}
```

**Effort**: Low (1-2 days)  
**Impact**: Medium - Required for local SEO

---

#### 4. `batch-strategy-processor` → Enhance for Monitoring/Refresh

**Current Capabilities**:
- ✅ Processes content strategies
- ✅ Calls agentic-content-gen
- ✅ Updates strategy status
- ✅ Rate limiting

**Missing for Local SEO**:
- ❌ Ranking/CTR monitoring
- ❌ Weak section detection
- ❌ A/B testing support
- ❌ Block-level rewriting
- ❌ Refresh cycles (weekly/monthly)

**Enhancement Recommendation**:
```typescript
// Add refresh mode:
{
  mode?: 'generate' | 'refresh',        // NEW
  site_id: string,
  refresh_criteria?: {                  // NEW
    min_age_days?: number,
    ranking_drop_threshold?: number,
    ctr_threshold?: number
  },
  refresh_scope?: 'full' | 'section',   // NEW
  section_to_refresh?: string           // NEW (hero, answer_pack, faq, etc)
}
```

**Effort**: Medium (2-3 days)  
**Impact**: Medium - Nice-to-have for long-term

---

### ❌ Functions That Must Be Built New

#### 1. `plan-pages` (NEW) - Page Planning Function

**Purpose**: Generate rollout plan per city/vertical/domain

**Why New**: No existing function handles:
- Multi-city/vertical planning
- Internal linking strategy
- Sitemap generation planning
- Content gap analysis per location

**Specification**:
```typescript
POST /functions/v1/plan-pages
{
  domain_id: string,
  city?: string,
  state?: string,
  vertical: string,  // hvac/plumbing/pest/etc
  target_pages?: number,
  existing_pages?: string[]  // page IDs to consider
}

Response:
{
  plan: {
    pages_to_create: Array<{
      slug: string,
      title: string,
      primary_keyword: string,
      internal_link_targets: string[],
      priority: 'high' | 'medium' | 'low'
    }>,
    internal_linking_strategy: object,
    sitemap_tasks: string[]
  }
}
```

**Effort**: Medium (3-4 days)  
**Dependencies**: None (standalone)

---

#### 2. `validate-doorway-risk` (NEW) - Doorway Detection

**Purpose**: Detect doorway pages using embeddings + similarity

**Why New**: Critical quality gate, requires specialized ML logic

**Specification**:
```typescript
POST /functions/v1/validate-doorway-risk
{
  page_content: string,
  page_id?: string,
  domain_id: string,
  vertical: string,
  compare_against?: string[]  // page IDs
}

Response:
{
  risk_level: 'low' | 'medium' | 'high',
  similarity_score: number,  // 0-1
  similar_pages: Array<{
    page_id: string,
    similarity: number,
    matching_sections: string[]
  }>,
  recommendations: string[],
  can_publish: boolean
}
```

**Implementation Notes**:
- Use OpenAI embeddings API for similarity
- Compare against all pages in same vertical
- Threshold: >0.85 similarity = high risk
- Store similarity hashes in `quality_checks` table

**Effort**: High (4-5 days) - Requires embeddings infrastructure  
**Dependencies**: OpenAI API, `quality_checks` table

---

#### 3. `publish-page` (NEW) - Publishing Function

**Purpose**: Push pages to CMS/static repo, update sitemap

**Why New**: No existing function handles external publishing

**Specification**:
```typescript
POST /functions/v1/publish-page
{
  page_id: string,
  publish_target: 'wordpress' | 'webflow' | 'static' | 'supabase',
  target_config?: {
    // WordPress
    wp_url?: string,
    wp_username?: string,
    wp_password?: string,  // Use secrets
    
    // Webflow
    webflow_site_id?: string,
    webflow_collection_id?: string,
    
    // Static
    repo_url?: string,
    branch?: string
  },
  update_sitemap?: boolean,
  ping_indexing?: boolean
}

Response:
{
  success: boolean,
  published_url?: string,
  sitemap_updated?: boolean,
  indexing_pinged?: boolean
}
```

**Effort**: High (5-7 days) - Multiple publishing targets  
**Dependencies**: Publishing target APIs, sitemap generation

---

## Database Schema Requirements

### New Tables Needed

```sql
-- 1. domains table
CREATE TABLE domains (
  id UUID PRIMARY KEY,
  domain VARCHAR(255) UNIQUE,
  city VARCHAR(100),
  state VARCHAR(2),
  vertical VARCHAR(50),  -- hvac/plumbing/pest/etc
  status VARCHAR(50),
  canonical_url TEXT
);

-- 2. pages table (extends articles for local pages)
-- Option A: Add columns to existing articles table
ALTER TABLE articles ADD COLUMN page_type VARCHAR(50) DEFAULT 'article';
ALTER TABLE articles ADD COLUMN city VARCHAR(100);
ALTER TABLE articles ADD COLUMN state VARCHAR(2);
ALTER TABLE articles ADD COLUMN vertical VARCHAR(50);
ALTER TABLE articles ADD COLUMN phone_number VARCHAR(20);
ALTER TABLE articles ADD COLUMN service_areas TEXT[];

-- Option B: Create separate pages table (if articles table is too different)
CREATE TABLE pages (
  id UUID PRIMARY KEY,
  slug VARCHAR(255),
  domain_id UUID REFERENCES domains(id),
  template_id VARCHAR(100),
  phone_number VARCHAR(20),
  schema_json JSONB,
  meta_title VARCHAR(500),
  meta_desc TEXT,
  published_at TIMESTAMP,
  -- ... other fields
);

-- 3. content_blocks table (modular content)
CREATE TABLE content_blocks (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES pages(id),
  block_type VARCHAR(50),  -- hero, trust_bar, problem_signals, etc
  content JSONB,
  order_index INTEGER
);

-- 4. local_facts table
CREATE TABLE local_facts (
  id UUID PRIMARY KEY,
  city VARCHAR(100),
  state VARCHAR(2),
  vertical VARCHAR(50),
  fact_type VARCHAR(50),  -- neighborhood, climate, regulation, etc
  content TEXT,
  source_url TEXT
);

-- 5. quality_checks table
CREATE TABLE quality_checks (
  id UUID PRIMARY KEY,
  page_id UUID REFERENCES pages(id),
  uniqueness_score DECIMAL(3,2),
  similarity_hash TEXT,
  doorway_risk_score DECIMAL(3,2),
  claims_validated BOOLEAN,
  schema_validated BOOLEAN,
  checked_at TIMESTAMP
);
```

---

## Recommended Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **Database Schema** ✅
   - Create `domains`, `local_facts`, `quality_checks` tables
   - Extend `articles` table with local page fields
   - Create `content_blocks` table

2. **Enhance `agentic-content-gen`** ✅
   - Add local page type support
   - Integrate local facts
   - Add service area sections
   - Generate LocalBusiness schema

3. **Enhance `schema-generator`** ✅
   - Add LocalBusiness schema support
   - Add ServiceArea schema

**Deliverable**: Can generate local pages with local facts

---

### Phase 2: Quality Gates (Week 3-4)

4. **Build `validate-doorway-risk`** ✅
   - Implement embeddings similarity
   - Store similarity hashes
   - Return risk scores

5. **Enhance `aeo-content-validator`** ✅
   - Add doorway risk check
   - Add uniqueness validation
   - Add claim integrity checks
   - Add call-routing validation

**Deliverable**: Quality gates prevent doorway pages

---

### Phase 3: Publishing & Planning (Week 5-6)

6. **Build `plan-pages`** ✅
   - Multi-city/vertical planning
   - Internal linking strategy
   - Sitemap generation

7. **Build `publish-page`** ✅
   - WordPress integration
   - Webflow integration (if needed)
   - Static site generation
   - Sitemap updates

**Deliverable**: End-to-end local page generation workflow

---

### Phase 4: Monitoring (Week 7-8)

8. **Enhance `batch-strategy-processor`** ✅
   - Add refresh mode
   - Add ranking/CTR monitoring
   - Add A/B testing support

**Deliverable**: Automated refresh cycles

---

## Function Overlap Analysis

### ✅ No Overlap Concerns

- `plan-pages`: Unique - no existing planning function
- `validate-doorway-risk`: Unique - no existing similarity detection
- `publish-page`: Unique - no existing publishing function

### ⚠️ Potential Overlap (Mitigated)

- `agentic-content-gen` enhancement: Extends existing, doesn't duplicate
- `aeo-content-validator` enhancement: Extends existing, doesn't duplicate
- `schema-generator` enhancement: Extends existing, doesn't duplicate

### ✅ Reusable Components

- **AEO processing**: Reuse from `agentic-content-gen`
- **Schema generation**: Reuse from `schema-generator`
- **Content Agent rules**: Reuse from existing system
- **Persona profiles**: Reuse from `heygen_avatar_config`

---

## Cost-Benefit Analysis

### Option A: Build All New Functions
- **Effort**: 15-20 days
- **Risk**: High (duplicates existing logic)
- **Maintenance**: High (two codebases)
- **Recommendation**: ❌ **Not Recommended**

### Option B: Enhance Existing + Build 3 New (RECOMMENDED)
- **Effort**: 12-15 days
- **Risk**: Low (reuses 70% of existing code)
- **Maintenance**: Low (single codebase)
- **Recommendation**: ✅ **Recommended**

### Option C: Build All New, Ignore Existing
- **Effort**: 20-25 days
- **Risk**: Very High (ignores proven systems)
- **Maintenance**: Very High (parallel systems)
- **Recommendation**: ❌ **Not Recommended**

---

## Final Recommendations

### ✅ DO: Enhance Existing Functions

1. **`agentic-content-gen`** → Add local page support
2. **`aeo-content-validator`** → Add quality gates
3. **`schema-generator`** → Add LocalBusiness schema
4. **`batch-strategy-processor`** → Add refresh mode

### ✅ DO: Build 3 New Functions

1. **`plan-pages`** → Page planning (unique requirement)
2. **`validate-doorway-risk`** → Doorway detection (critical gate)
3. **`publish-page`** → Publishing (unique requirement)

### ❌ DON'T: Build Overlapping Functions

- Don't create new content generator (enhance existing)
- Don't create new validator (enhance existing)
- Don't create new schema generator (enhance existing)

---

## Next Steps

1. **Review this evaluation** with team
2. **Approve enhancement plan** for existing functions
3. **Approve new function specs** for 3 new functions
4. **Create database migrations** for new tables
5. **Begin Phase 1 implementation**

---

## Questions to Resolve

1. **Publishing Target**: WordPress, Webflow, or static site? (affects `publish-page` complexity)
2. **Phone Number Provisioning**: How are tracking numbers assigned? (affects call-routing validation)
3. **Call Routing System**: What system handles routing? (affects validation logic)
4. **Similarity Threshold**: What similarity score = doorway? (affects `validate-doorway-risk`)
5. **Local Facts Source**: Where do local facts come from? (affects `agentic-content-gen` enhancement)

---

**Status**: ✅ **Evaluation Complete - Ready for Implementation Planning**

