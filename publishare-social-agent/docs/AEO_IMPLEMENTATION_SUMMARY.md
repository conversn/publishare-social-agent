# AEO-First CMS Implementation Summary

## Quick Reference

This document provides a high-level summary of what needs to be done to transform Publishare into an AEO-dominant CMS.

---

## Current State Analysis

### ✅ Existing Edge Functions (5)
1. `ai-image-generator` - Image generation
2. `ai-link-suggestions` - Link suggestions
3. `insert-links` - Link insertion
4. `markdown-to-html` - HTML conversion
5. `link-image-to-article` - Image linking

### ❌ Missing Functions (Referenced but Not Implemented)
1. `agentic-content-gen` - Main content generator (referenced in scripts)
2. `ai-content-generator` - May be Next.js API route only

### 🔍 Key Findings
- **No AEO optimization** in any existing function
- **No answer-first validation**
- **No schema generation**
- **No content structure extraction**
- **No AEO-specific fields** in database

---

## What Needs to Be Done

### 1. Create 5 New Edge Functions

#### Priority 1 (Week 1-2)
1. **`agentic-content-gen`** - Primary AEO-optimized content generator
   - Detects AEO content type
   - Enforces answer-first structure
   - Generates schema
   - Multi-site support

2. **`aeo-content-validator`** - Validates AEO requirements
   - Checks answer-first
   - Validates structure
   - Scores AEO compliance (0-100)

3. **`schema-generator`** - Generates schema.org JSON-LD
   - Auto-detects schema type
   - Generates speakable schema
   - Site-specific organization data
   - Validates against schema.org

#### Priority 2 (Week 3)
4. **`aeo-content-enhancer`** - Enhances existing content for AEO
   - Fixes answer-first violations
   - Adds missing data points
   - Improves structure

5. **`aeo-query-analyzer`** - Analyzes queries for content strategy
   - Determines content type
   - Suggests structure
   - Identifies key terms

### 2. Enhance 3 Existing Functions

1. **`markdown-to-html`** - Add AEO extraction
   - Extract AEO summary (first 100 words)
   - Extract content structure (H1/H2/H3)
   - Validate answer-first
   - Save to database

2. **`ai-link-suggestions`** - Add AEO scoring
   - Prioritize AEO-optimized articles
   - Score by schema, data points, citations
   - Filter by AEO content type

3. **`insert-links`** - Add AEO placement
   - Prioritize first 100 words
   - Optimize for data sections
   - AEO-aware anchor text

### 3. Database Schema Updates

Add 9 new columns to `articles` table:
- `aeo_summary` (TEXT)
- `aeo_answer_first` (BOOLEAN)
- `content_structure` (JSONB)
- `speakable_summary` (TEXT)
- `schema_markup` (JSONB)
- `schema_validated` (BOOLEAN)
- `aeo_content_type` (VARCHAR)
- `citations` (JSONB)
- `data_points` (JSONB)

Create `aeo_content_templates` table for AEO templates.

### 4. CMS Integration

- Add AEO fields to article forms
- Add schema preview/validation UI
- Integrate `aeo-query-analyzer` in content creation
- Integrate `aeo-content-validator` in publishing workflow
- Show AEO score in CMS

---

## Updated Content Generation Workflow

### Current (Non-AEO)
```
1. agentic-content-gen (try) → ai-content-generator (fallback)
2. ai-image-generator
3. ai-link-suggestions
4. insert-links
5. markdown-to-html
```

### New (AEO-First)
```
1. aeo-query-analyzer → Analyze query, determine content type
2. agentic-content-gen → Generate AEO-optimized content
   ├─ Uses AEO template
   ├─ Enforces answer-first
   ├─ Extracts structure
   └─ Generates schema
3. aeo-content-validator → Validate AEO requirements
4. schema-generator → Generate/validate schema
5. ai-image-generator → Generate image
6. ai-link-suggestions → Get AEO-optimized links
7. insert-links → Insert links (AEO-optimized placement)
8. markdown-to-html → Convert to HTML
   ├─ Extracts AEO summary
   ├─ Validates answer-first
   └─ Extracts structure
9. Auto-inject schema into HTML (hardcoded in <head>)
```

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Database migration (AEO fields)
- [ ] Create `agentic-content-gen` function
- [ ] Create `aeo-content-validator` function
- [ ] Create `schema-generator` function

### Week 2: Enhance Existing
- [ ] Enhance `markdown-to-html` with AEO extraction
- [ ] Enhance `ai-link-suggestions` with AEO scoring
- [ ] Enhance `insert-links` with AEO placement

### Week 3: Additional Functions
- [ ] Create `aeo-content-enhancer` function
- [ ] Create `aeo-query-analyzer` function
- [ ] Update AI prompts for AEO structure

### Week 4: CMS Integration
- [ ] Add AEO fields to CMS forms
- [ ] Add schema preview UI
- [ ] Integrate validators in workflow

### Week 5: Automation & Multi-Site
- [ ] Auto-schema generation on publish
- [ ] Multi-site schema support
- [ ] Update `generate-complete-article.js` workflow

---

## Function Dependencies

```
agentic-content-gen (NEW)
  ├─ Uses: aeo-query-analyzer (optional)
  ├─ Uses: schema-generator (internal)
  └─ Outputs: Full AEO-optimized article

aeo-content-validator (NEW)
  ├─ Reads: articles table
  └─ Outputs: Validation report

schema-generator (NEW)
  ├─ Reads: articles table
  ├─ Reads: sites table
  └─ Outputs: JSON-LD schema

markdown-to-html (ENHANCED)
  ├─ Enhanced: Extracts AEO data
  └─ Outputs: HTML + AEO metadata

ai-link-suggestions (ENHANCED)
  ├─ Enhanced: AEO scoring
  └─ Outputs: AEO-optimized suggestions

insert-links (ENHANCED)
  ├─ Enhanced: AEO placement
  └─ Outputs: Markdown with AEO-optimized links
```

---

## Success Criteria

- ✅ 100% of new articles have AEO score > 80
- ✅ 100% of articles have valid schema
- ✅ 100% of articles have answer in first 100 words
- ✅ 100% of articles have speakable schema
- ✅ All 7 Simple sites have correct organization schema

---

## Detailed Documentation

For complete implementation details, see:

1. **`AEO_EDGE_FUNCTIONS_DEEP_DIVE.md`** - Comprehensive analysis of:
   - Existing function enhancements
   - New function specifications
   - Code examples
   - Integration points

2. **`AEO_FIRST_IMPLEMENTATION_PLAN.md`** - Overall implementation plan:
   - Database schema
   - Content generation
   - Schema system
   - CMS integration

---

## Next Actions

1. **Review** `AEO_EDGE_FUNCTIONS_DEEP_DIVE.md` for detailed function specs
2. **Review** `AEO_FIRST_IMPLEMENTATION_PLAN.md` for overall plan
3. **Approve** implementation approach
4. **Start** with Week 1: Database migration + Priority 1 functions
5. **Test** with one article on seniorsimple.org
6. **Iterate** and roll out to all Simple sites

---

## Key Takeaways

1. **5 new functions** need to be created (3 Priority 1, 2 Priority 2)
2. **3 existing functions** need AEO enhancements
3. **9 new database columns** required
4. **Workflow needs complete overhaul** to be AEO-first
5. **Multi-site support** must be built into all functions

The deep dive document provides exact code examples and implementation details for each function.


