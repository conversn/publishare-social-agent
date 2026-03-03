# Agentic Content Generation & Multi-Site Architecture

## Current Implementation

### How Agentic Content Generation Works with Content Strategy

#### 1. **Content Strategy Table Structure**

The `content_strategy` table stores planned content items with the following key fields:

```typescript
{
  id: string                    // Unique strategy ID
  user_id: string | null       // ✅ User who owns the strategy
  content_title: string | null
  content_type: string | null
  category: string | null
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low' | null
  status: 'Planned' | 'In Progress' | 'Completed' | 'Failed' | null
  target_audience: string | null
  primary_keyword: string | null
  search_volume: number | null
  funnel_stage: string | null
  content_pillar: string | null
  lead_magnet: string | null
  call_to_action: string | null
  word_count: number | null
  target_date: string | null
  last_generation_attempt: string | null
  // ❌ MISSING: site_id - No site association!
}
```

#### 2. **Workflow Process**

**Step 1: User Triggers Workflow**
```typescript
// From ContentStrategyManager.tsx
const triggerAgenticWorkflow = async (strategyId: string) => {
  const response = await fetch(
    'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        strategyId: strategyId, 
        action: 'process-strategy' 
      })
    }
  )
}
```

**Step 2: Edge Function Processes Strategy**
- Receives `strategyId` and `action: 'process-strategy'`
- Fetches strategy from `content_strategy` table using `strategyId`
- Extracts strategy parameters (title, keywords, audience, etc.)
- Generates content using AI based on strategy parameters
- Creates article in `articles` table
- Updates strategy status to 'Completed' or 'Failed'

**Step 3: Article Creation**
- Article is created with:
  - `user_id` from the authenticated user
  - `site_id` from... **❌ WHERE DOES THIS COME FROM?**

### Current Problem: Missing Site Context

#### Issues:

1. **No `site_id` in `content_strategy` table**
   - Cannot associate strategies with specific sites
   - Cannot filter strategies by site
   - Cannot generate site-specific content

2. **No site context in workflow**
   - Edge function doesn't know which site to generate content for
   - Article creation may not include `site_id`
   - Content may be generated without site-specific context

3. **No site filtering in queries**
   ```typescript
   // Current query (ContentStrategyManager.tsx)
   const { data } = await supabase
     .from('content_strategy')
     .select('*')
     .order('priority_level', { ascending: false })
     // ❌ No site_id filter!
   ```

## Multi-Site Architecture Requirements

### Required Changes

#### 1. **Add `site_id` to `content_strategy` Table**

```sql
-- Add site_id column to content_strategy
ALTER TABLE content_strategy 
ADD COLUMN site_id VARCHAR(50) REFERENCES sites(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_content_strategy_site_id 
ON content_strategy(site_id);

-- Add index for user + site queries
CREATE INDEX IF NOT EXISTS idx_content_strategy_user_site 
ON content_strategy(user_id, site_id);

-- Update existing strategies (set default site)
UPDATE content_strategy 
SET site_id = 'seniorsimple' 
WHERE site_id IS NULL;
```

#### 2. **Update Edge Function to Handle Site Context**

The `agentic-content-gen` edge function should:

```typescript
// Pseudo-code for edge function
async function processStrategy(strategyId: string, siteId?: string) {
  // 1. Fetch strategy
  const strategy = await supabase
    .from('content_strategy')
    .select('*, site_id')
    .eq('id', strategyId)
    .single();
  
  // 2. Determine site_id (from strategy or parameter)
  const targetSiteId = siteId || strategy.site_id;
  
  if (!targetSiteId) {
    throw new Error('Site ID required for content generation');
  }
  
  // 3. Fetch site configuration
  const site = await supabase
    .from('sites')
    .select('*')
    .eq('id', targetSiteId)
    .single();
  
  // 4. Generate content with site context
  const content = await generateContent({
    ...strategy,
    siteId: targetSiteId,
    siteConfig: site.config,
    siteName: site.name,
    siteDomain: site.domain
  });
  
  // 5. Create article with site_id
  const article = await supabase
    .from('articles')
    .insert({
      ...content,
      user_id: strategy.user_id,
      site_id: targetSiteId,  // ✅ Explicitly set site_id
      category: strategy.category
    });
  
  // 6. Update strategy status
  await supabase
    .from('content_strategy')
    .update({ 
      status: 'Completed',
      last_generation_attempt: new Date().toISOString()
    })
    .eq('id', strategyId);
}
```

#### 3. **Update Frontend to Filter by Site**

```typescript
// ContentStrategyManager.tsx - Updated
const loadContentStrategies = async (siteId?: string) => {
  setIsLoading(true)
  try {
    let query = supabase
      .from('content_strategy')
      .select('*')
      .eq('user_id', user.id)  // ✅ Filter by user
    
    // ✅ Filter by site if provided
    if (siteId) {
      query = query.eq('site_id', siteId)
    }
    
    const { data, error } = await query
      .order('priority_level', { ascending: false })
      .order('target_date', { ascending: true })

    if (error) throw error
    setStrategies((data || []) as ContentStrategy[])
  } catch (error) {
    // Error handling
  } finally {
    setIsLoading(false)
  }
}

// Trigger workflow with site context
const triggerAgenticWorkflow = async (strategyId: string, siteId: string) => {
  const response = await fetch(
    'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/agentic-content-gen',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ 
        strategyId: strategyId,
        siteId: siteId,  // ✅ Pass site_id
        action: 'process-strategy' 
      })
    }
  )
}
```

#### 4. **Add Site Selection to Strategy Creation**

```typescript
// When creating a new content strategy
interface ContentStrategyForm {
  site_id: string  // ✅ Required field
  content_title: string
  content_type: string
  // ... other fields
}

// Strategy creation with site_id
const createStrategy = async (formData: ContentStrategyForm) => {
  const { data, error } = await supabase
    .from('content_strategy')
    .insert({
      ...formData,
      user_id: user.id,
      site_id: formData.site_id  // ✅ Explicitly set
    })
}
```

## Multi-Site Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Site Selector│  │  Strategy     │  │  Generate    │    │
│  │  (Dropdown)  │→ │  List (by    │→ │  Content     │    │
│  │               │  │   site)      │  │  Button      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Content Strategy Table                         │
│  ┌────────────────────────────────────────────────────┐   │
│  │ id | user_id | site_id | content_title | status    │   │
│  │────┼─────────┼─────────┼───────────────┼──────────│   │
│  │ 1  | user-1  | seniorsimple | "Guide" | Planned  │   │
│  │ 2  | user-1  | rateroots    | "Article"| Planned  │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         agentic-content-gen Edge Function                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 1. Fetch strategy (with site_id)                    │   │
│  │ 2. Fetch site config from sites table               │   │
│  │ 3. Generate content (site-aware prompts)            │   │
│  │ 4. Create article (with site_id)                    │   │
│  │ 5. Update strategy status                           │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Articles Table                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │ id | user_id | site_id | title | content | status  │   │
│  │────┼─────────┼─────────┼───────┼─────────┼─────────│   │
│  │ 1  | user-1  | seniorsimple | "..." | "..." | draft│   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Checklist

### Database Changes
- [ ] Add `site_id` column to `content_strategy` table
- [ ] Add foreign key constraint to `sites` table
- [ ] Add indexes for performance (`site_id`, `user_id + site_id`)
- [ ] Migrate existing strategies (set default `site_id`)
- [ ] Update TypeScript types

### Edge Function Updates
- [ ] Accept `siteId` parameter in request
- [ ] Fetch strategy with `site_id`
- [ ] Fetch site configuration from `sites` table
- [ ] Pass site context to AI generation
- [ ] Ensure article creation includes `site_id`
- [ ] Add site validation

### Frontend Updates
- [ ] Add site selector to strategy list
- [ ] Filter strategies by `site_id`
- [ ] Add `site_id` to strategy creation form
- [ ] Pass `site_id` when triggering workflow
- [ ] Display site name in strategy cards

### Testing
- [ ] Test strategy creation with `site_id`
- [ ] Test strategy filtering by site
- [ ] Test content generation with site context
- [ ] Test article creation with correct `site_id`
- [ ] Test multi-site user scenarios

## Benefits of Multi-Site Support

1. **Site-Specific Content Generation**
   - AI can use site-specific tone, style, and branding
   - Content matches site's target audience
   - SEO optimized for site's domain

2. **Better Organization**
   - Users can manage strategies per site
   - Clear separation of content by platform
   - Easier reporting and analytics

3. **Scalability**
   - Easy to add new sites
   - Site-specific configurations
   - Independent content pipelines

4. **Data Integrity**
   - Foreign key ensures valid `site_id`
   - Prevents orphaned strategies
   - Clear data relationships

## Migration Path

1. **Phase 1: Database Schema**
   - Add `site_id` column (nullable initially)
   - Add foreign key constraint
   - Add indexes

2. **Phase 2: Data Migration**
   - Set default `site_id` for existing strategies
   - Verify all strategies have valid `site_id`

3. **Phase 3: Code Updates**
   - Update edge function
   - Update frontend components
   - Update TypeScript types

4. **Phase 4: Testing**
   - Test with existing data
   - Test new strategy creation
   - Test content generation

5. **Phase 5: Make `site_id` Required**
   - Add NOT NULL constraint
   - Update validation
   - Final testing

## Example SQL Migration

```sql
-- Step 1: Add site_id column
ALTER TABLE content_strategy 
ADD COLUMN site_id VARCHAR(50);

-- Step 2: Set default for existing records
UPDATE content_strategy 
SET site_id = 'seniorsimple' 
WHERE site_id IS NULL;

-- Step 3: Add foreign key
ALTER TABLE content_strategy
ADD CONSTRAINT fk_content_strategy_site_id
FOREIGN KEY (site_id) REFERENCES sites(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Step 4: Add indexes
CREATE INDEX IF NOT EXISTS idx_content_strategy_site_id 
ON content_strategy(site_id);

CREATE INDEX IF NOT EXISTS idx_content_strategy_user_site 
ON content_strategy(user_id, site_id);

-- Step 5: Make NOT NULL (after data migration)
ALTER TABLE content_strategy
ALTER COLUMN site_id SET NOT NULL;
```

## Summary

**Current State:**
- ✅ Content strategy table exists with `user_id`
- ✅ Agentic workflow can process strategies
- ❌ No `site_id` in `content_strategy` table
- ❌ No site context in content generation
- ❌ No site filtering in queries

**Required Changes:**
1. Add `site_id` to `content_strategy` table
2. Update edge function to handle site context
3. Update frontend to filter and pass `site_id`
4. Ensure articles are created with correct `site_id`

**Result:**
- Multi-site content strategy management
- Site-aware content generation
- Proper data relationships
- Scalable architecture

