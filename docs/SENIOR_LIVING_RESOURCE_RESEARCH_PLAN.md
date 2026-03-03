# Senior Living Resource Research & Article Backlog System

## Overview

Adapt Publishare's lender research functionality to create a comprehensive senior living resource database and generate article ideas for SeniorSimple.org based on Caring.com and A Place for Mom directory structures.

---

## Current System Analysis

### Existing Functions We Can Adapt

1. **`lender-website-crawler`** ✅
   - Crawls websites and extracts structured data
   - Stores information in database
   - Handles URL normalization and error correction
   - Extracts: name, description, services, contact info, locations

2. **`content-strategist`** ✅
   - Analyzes content gaps
   - Generates article recommendations
   - Creates `content_strategy` entries
   - Prioritizes by business impact

3. **`agentic-content-gen`** ✅
   - Generates full articles from strategy entries
   - Includes AEO optimization, images, linking

### Database Structure (Lenders → Senior Resources)

**Current `lenders` table structure:**
- Public fields: name, slug, description, highlights, qualification criteria
- Gated fields: detailed data, internal notes
- Integration: article_id, organization_id, site_id

**Proposed `senior_resources` table:**
- Similar structure but adapted for senior living facilities/services
- Resource types: Assisted Living, Memory Care, Independent Living, etc.
- Location data: states, cities, zip codes
- Service offerings: care levels, amenities, pricing ranges

---

## Implementation Plan

### Phase 1: Database Schema (30 min)

Create `senior_resources` table with structure similar to `lenders`:

```sql
CREATE TABLE IF NOT EXISTS senior_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership & Integration
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id VARCHAR(50) NOT NULL DEFAULT 'seniorsimple',
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Resource Identification
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'assisted-living', 'memory-care', 'independent-living', 'nursing-home', 'in-home-care', 'hospice'
  description TEXT,
  highlights TEXT[],
  
  -- Location Data
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  states_available TEXT[] DEFAULT '{}', -- Multi-state providers
  service_areas TEXT[], -- Specific cities/regions served
  
  -- Service Details (Public)
  care_levels TEXT[], -- ['minimal', 'moderate', 'extensive', 'skilled-nursing']
  amenities TEXT[], -- ['dining', 'transportation', 'activities', 'medical', etc.]
  pricing_range JSONB, -- {min: 2000, max: 8000, currency: 'USD', period: 'monthly'}
  accepts_medicare BOOLEAN,
  accepts_medicaid BOOLEAN,
  accepts_insurance BOOLEAN,
  
  -- Contact Information (Public)
  phone VARCHAR(20),
  website_url TEXT,
  email VARCHAR(255),
  
  -- Gated Fields (Internal)
  detailed_service_data JSONB DEFAULT '{}',
  internal_notes TEXT,
  competitor_data JSONB DEFAULT '{}',
  research_source TEXT, -- 'caring.com', 'aplaceformom.com', 'manual'
  source_url TEXT, -- Original listing URL
  
  -- Publication Status
  is_published BOOLEAN DEFAULT FALSE,
  publication_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(site_id, slug),
  CONSTRAINT senior_resources_name_check CHECK (char_length(name) > 0),
  CONSTRAINT senior_resources_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS idx_senior_resources_site_id ON senior_resources(site_id);
CREATE INDEX IF NOT EXISTS idx_senior_resources_type ON senior_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_senior_resources_state ON senior_resources(state);
CREATE INDEX IF NOT EXISTS idx_senior_resources_published ON senior_resources(site_id, is_published) WHERE is_published = TRUE;
```

### Phase 2: Senior Resource Crawler Function (2-3 hours)

**New Function:** `senior-resource-crawler`

**Adapted from:** `lender-website-crawler`

**Key Adaptations:**

1. **Source URL Parsing**
   - Parse Caring.com directory pages
   - Parse A Place for Mom directory pages
   - Extract facility/service listings

2. **Data Extraction**
   ```typescript
   // Extract from directory listings
   - Resource name
   - Resource type (assisted living, memory care, etc.)
   - Location (address, city, state, zip)
   - Phone number
   - Website URL
   - Services offered
   - Amenities
   - Pricing information (if available)
   ```

3. **Website Crawling** (for individual facility pages)
   - Crawl facility websites
   - Extract detailed information
   - Extract care levels, amenities, pricing

4. **Data Normalization**
   - Standardize resource types
   - Normalize location data
   - Extract structured data from unstructured text

**Request Format:**
```json
{
  "source": "caring.com" | "aplaceformom.com" | "both",
  "resource_type": "assisted-living" | "memory-care" | "all",
  "state": "CA" | null, // Optional state filter
  "max_resources": 50,
  "update_existing": true,
  "dry_run": false
}
```

### Phase 3: Article Idea Generator (1-2 hours)

**New Function:** `senior-resource-article-generator`

**Purpose:** Generate article ideas based on:
- Resource types discovered
- Location gaps (states/cities with few resources)
- Service gaps (missing care levels, amenities)
- Comparison opportunities (assisted living vs memory care, etc.)

**Output:** Creates `content_strategy` entries for:
- Resource type guides ("Complete Guide to Assisted Living")
- Location-specific content ("Best Assisted Living in California")
- Comparison articles ("Assisted Living vs Memory Care")
- Service-specific guides ("In-Home Care vs Assisted Living")
- Cost guides ("How Much Does Memory Care Cost?")

**Integration with content-strategist:**
- Uses existing `content-strategist` logic
- Adapts recommendations for senior living vertical
- Prioritizes by search volume and lead generation potential

### Phase 4: Content Strategy Integration (1 hour)

**Enhance `content-strategist` for SeniorSimple:**

Add senior living-specific categories:
- Assisted Living
- Memory Care
- Independent Living
- Nursing Homes
- In-Home Care
- Hospice Care
- Senior Housing Options
- Cost & Financing

**Article Templates:**
- "Complete Guide to [Resource Type]"
- "Best [Resource Type] in [State/City]"
- "[Resource Type] vs [Resource Type]: Which is Right for You?"
- "How Much Does [Resource Type] Cost in [Location]?"
- "What to Look for in [Resource Type]"

---

## Implementation Steps

### Step 1: Create Database Migration

**File:** `supabase/migrations/20251210000001_create_senior_resources_table.sql`

Create the `senior_resources` table with all fields above.

### Step 2: Create Senior Resource Crawler

**File:** `supabase/functions/senior-resource-crawler/index.ts`

**Key Functions:**
1. `parseDirectoryPage(url: string)` - Parse Caring.com/A Place for Mom directory pages
2. `extractResourceInfo(html: string)` - Extract structured data from listing
3. `crawlResourceWebsite(url: string)` - Crawl individual facility websites
4. `normalizeResourceData(data: any)` - Normalize and validate data
5. `storeResource(supabase: any, resource: any)` - Store in database

**Adaptation from lender crawler:**
- Replace business lending keywords with senior care keywords
- Replace loan types with care types
- Replace FICO/LTV with care levels/pricing
- Replace states_available with service_areas

### Step 3: Create Article Idea Generator

**File:** `supabase/functions/senior-resource-article-generator/index.ts`

**Logic:**
1. Query `senior_resources` table
2. Analyze gaps:
   - Resource types with few entries
   - States/cities with no resources
   - Missing comparison articles
3. Generate article recommendations
4. Create `content_strategy` entries

### Step 4: Create Research Script

**File:** `scripts/research-senior-living-resources.js`

**Usage:**
```bash
node scripts/research-senior-living-resources.js \
  --source caring.com \
  --type assisted-living \
  --state CA \
  --max 100
```

---

## Data Sources Analysis

### Caring.com Structure

**Directory Pages:**
- `/senior-care` - Main directory
- `/assisted-living` - Assisted living directory
- `/memory-care` - Memory care directory
- `/independent-living` - Independent living directory
- `/nursing-homes` - Nursing homes directory
- `/in-home-care` - In-home care directory

**Listing Structure:**
- Facility name
- Address
- Phone number
- Website URL
- Services offered
- Amenities
- Pricing (if available)
- Reviews/ratings

### A Place for Mom Structure

**Directory Pages:**
- `/assisted-living` - Assisted living
- `/memory-care` - Memory care
- `/independent-living` - Independent living
- `/home-care` - Home care
- `/nursing-homes` - Nursing homes

**Listing Structure:**
- Similar to Caring.com
- Additional: Care level details, Medicare/Medicaid acceptance

---

## Article Backlog Generation Strategy

### Tier 1: Pillar Pages (High Priority)

1. **Complete Guide to Assisted Living**
2. **Complete Guide to Memory Care**
3. **Complete Guide to Independent Living**
4. **Complete Guide to In-Home Care**
5. **Complete Guide to Nursing Homes**
6. **Complete Guide to Hospice Care**

### Tier 2: Comparison Articles (High Priority)

1. **Assisted Living vs Memory Care: Which is Right for Your Loved One?**
2. **Assisted Living vs Independent Living: Key Differences**
3. **In-Home Care vs Assisted Living: Cost and Care Comparison**
4. **Nursing Home vs Assisted Living: When to Choose Each**
5. **Memory Care vs Nursing Home: Understanding the Differences**

### Tier 3: Location-Specific (Medium Priority)

Generate for top 20 states:
- "Best Assisted Living in [State]"
- "Best Memory Care Facilities in [State]"
- "Assisted Living Costs in [State]"

### Tier 4: Service-Specific (Medium Priority)

1. **How Much Does Assisted Living Cost?**
2. **How Much Does Memory Care Cost?**
3. **What Services Does Assisted Living Provide?**
4. **Medicare and Assisted Living: What's Covered?**
5. **Medicaid and Assisted Living: Eligibility and Coverage**

### Tier 5: Decision Guides (Lower Priority)

1. **How to Choose an Assisted Living Facility**
2. **Questions to Ask When Touring Memory Care**
3. **Signs Your Loved One Needs Assisted Living**
4. **When to Move from Independent to Assisted Living**

---

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Database Schema | 30 min | Low |
| Resource Crawler | 2-3 hours | Medium |
| Article Generator | 1-2 hours | Low |
| Content Strategy Integration | 1 hour | Low |
| Testing & Refinement | 2 hours | Medium |
| **Total** | **6-8 hours** | **Medium** |

---

## Success Criteria

1. ✅ Database table created with proper indexes
2. ✅ Crawler successfully extracts data from Caring.com and A Place for Mom
3. ✅ At least 100 senior resources stored in database
4. ✅ Article generator creates 50+ article ideas
5. ✅ Content strategy entries created and ready for generation
6. ✅ Integration with existing `agentic-content-gen` workflow

---

## Next Steps

1. Review and approve this plan
2. Create database migration
3. Adapt lender crawler to senior resource crawler
4. Test crawler on sample pages
5. Generate initial article backlog
6. Integrate with content strategy system





