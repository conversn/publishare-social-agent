# Content Agent Prompt Integration Plan

## Analysis

The Content Agent Prompt defines how scripts, captions, titles, and educational content must be generated across all Simple Media Network verticals. This needs to be integrated into the agentic content generation workflow.

## Current State

### Existing Components

1. **`agentic-content-gen`** - Generates article content
2. **`creatomate-video-generator`** - Generates videos from articles
3. **`heygen_avatar_config`** - Stores avatar + persona profiles
4. **`sites` table** - Brand configuration

### Missing Integration

- Content Agent Prompt not stored in database
- Not injected into AI generation prompts
- Script generation doesn't follow Content Agent structure
- No vertical-specific tone enforcement

## Recommended Database Updates

### Option 1: Store in `sites.config` JSONB (Recommended)

**Pros:**
- Already exists, no new table
- Site-specific configuration
- Easy to update per brand
- Can version/update without migration

**Cons:**
- Less queryable than dedicated table
- Mixed with other config data

**Implementation:**
```sql
-- Add content_agent_config to sites.config JSONB
-- Structure:
{
  "content_agent": {
    "vertical_theme": "Retirement, long-term care, annuities...",
    "tone_guidelines": "Educational storytelling, clear, friendly...",
    "script_structure": "short_form" | "long_form",
    "overlay_rules": {
      "max_words": 8,
      "no_punctuation": true,
      "readable_in_seconds": 1
    },
    "safety_rules": [...],
    "storytelling_guidelines": [...]
  }
}
```

### Option 2: Create `content_agent_config` Table

**Pros:**
- Dedicated table, clean separation
- Easy to query and manage
- Can have version history
- Can link to multiple sites if needed

**Cons:**
- New table to maintain
- More complex queries

**Implementation:**
```sql
CREATE TABLE content_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) REFERENCES sites(id) ON DELETE CASCADE,
  vertical_theme TEXT NOT NULL,
  tone_guidelines TEXT NOT NULL,
  script_structure JSONB DEFAULT '{}',
  overlay_rules JSONB DEFAULT '{}',
  safety_rules JSONB DEFAULT '[]',
  storytelling_guidelines JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id)
);
```

### Option 3: Extend `heygen_avatar_config` (Not Recommended)

**Why Not:**
- Avatar config is for video technical config
- Content Agent rules are broader (content generation, not just video)
- Mixing concerns

## Recommendation: Option 1 (sites.config)

**Rationale:**
- Sites table already has `config` JSONB field
- Content Agent rules are site/brand-specific
- No additional tables needed
- Easy to update via admin UI
- Can be versioned in config

## Implementation Plan

### Step 1: Update Sites Config

Add Content Agent configuration to each site's `config` JSONB:

```sql
-- Example for SeniorSimple
UPDATE sites
SET config = jsonb_set(
  config,
  '{content_agent}',
  '{
    "vertical_theme": "Retirement, long-term care, annuities, Medicare, longevity, safety, peace of mind",
    "tone_guidelines": "Educational storytelling, clear, friendly, expert tone. Context, history, pragmatism. No hype, no overclaiming, no fearmongering.",
    "script_structure": {
      "short_form": {
        "hook_max_words": 10,
        "beats_count": 3,
        "cta_format": "Learn more at {domain}"
      },
      "long_form": {
        "hook_max_words": 12,
        "sections_count": 5,
        "tips_count": 5
      }
    },
    "overlay_rules": {
      "max_words": 8,
      "no_punctuation": true,
      "readable_in_seconds": 1,
      "one_idea_max": true
    },
    "safety_rules": [
      "No financial guarantees",
      "No market predictions",
      "No personalized advice",
      "No fear-driven language"
    ],
    "storytelling_guidelines": {
      "use": ["history", "law", "behavior", "psychology", "economics", "metaphors"],
      "avoid": ["fictional testimonials", "exaggeration", "cringe styles"]
    }
  }'::jsonb
)
WHERE id = 'seniorsimple';
```

### Step 2: Create Script Generator Function

Create new edge function: `script-generator`

**Purpose:**
- Takes article content
- Applies Content Agent Prompt rules
- Generates structured script (short or long form)
- Returns JSON matching Content Agent format

**Input:**
```typescript
{
  article_id: string,
  script_type: 'short-form' | 'long-form',
  site_id?: string // Auto-detect from article if not provided
}
```

**Output:**
```typescript
{
  script: {
    hook: string,
    context?: string,
    beats?: string[],
    sections?: Array<{title: string, content: string}>,
    surprise?: string,
    story?: string,
    tips?: string[],
    summary?: string,
    cta: string
  },
  overlay_text: string,
  broll_suggestions: string[]
}
```

### Step 3: Integrate into Existing Functions

**Update `agentic-content-gen`:**
- Fetch site's `content_agent` config
- Inject Content Agent Prompt into AI system prompt
- Ensure generated content follows Content Agent rules

**Update `creatomate-video-generator`:**
- Call `script-generator` function first
- Use generated script structure
- Apply Content Agent overlay rules

**Update `heygen-video-generator` (to be created):**
- Same as Creatomate - use script generator
- Apply persona voice + Content Agent rules

### Step 4: Create Helper Functions

**`getContentAgentConfig(site_id)`:**
```typescript
async function getContentAgentConfig(siteId: string) {
  const { data: site } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .single();
  
  return site?.config?.content_agent || getDefaultContentAgentConfig();
}
```

**`buildContentAgentPrompt(site_id, persona_profile)`:**
```typescript
function buildContentAgentPrompt(
  contentAgentConfig: any,
  personaProfile: any,
  scriptType: 'short-form' | 'long-form'
): string {
  // Combine Content Agent rules + Persona voice
  // Return full system prompt for AI
}
```

## Database Migration

### Add Content Agent Config to Sites

```sql
-- Migration: Add Content Agent configuration to sites
-- This adds default content_agent config to each site's config JSONB

UPDATE sites
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{content_agent}',
  CASE 
    WHEN id = 'seniorsimple' THEN '{"vertical_theme": "Retirement, long-term care, annuities, Medicare, longevity, safety, peace of mind"}'::jsonb
    WHEN id = 'mortgagesimple' THEN '{"vertical_theme": "Loans, rates, first-time buyers, VA, FHA, HELOCs, underwriting basics"}'::jsonb
    WHEN id = 'lendingsimple' THEN '{"vertical_theme": "Business loans, credit lines, term loans, SBA, factoring, fintech"}'::jsonb
    WHEN id = 'creditrepairsimple' THEN '{"vertical_theme": "Repair, utilization, timing, bureaus, FICO logic, disputing myths"}'::jsonb
    WHEN id = 'parentsimple' THEN '{"vertical_theme": "College planning, parent finances, scholarships, FAFSA, mentorship"}'::jsonb
    WHEN id = 'smallbizsimple' THEN '{"vertical_theme": "Taxes, bookkeeping, payroll, credits, growth strategy, cost savings"}'::jsonb
    WHEN id = 'scalingsimple' THEN '{"vertical_theme": "Systems, operations, delegating, automation, hiring, capital stack"}'::jsonb
    WHEN id = 'rateroots' THEN '{"vertical_theme": "Mortgage rates, rate comparison, loan types, refinancing"}'::jsonb
    ELSE '{"vertical_theme": "Financial education and guidance"}'::jsonb
  END
)
WHERE config->'content_agent' IS NULL;
```

## Integration Points

### 1. Content Generation (`agentic-content-gen`)

**Current:** Generates article content with AEO optimization

**Enhanced:** 
- Fetch `content_agent` config from site
- Fetch `persona_profile` from avatar config
- Combine into comprehensive system prompt
- Generate content following Content Agent rules

### 2. Script Generation (New Function)

**Create:** `script-generator` edge function

**Purpose:**
- Convert article content to video script
- Apply Content Agent structure
- Generate overlay text, b-roll suggestions
- Return structured JSON

### 3. Video Generation

**Current:** `creatomate-video-generator` extracts content directly

**Enhanced:**
- Call `script-generator` first
- Use structured script output
- Apply Content Agent overlay rules
- Ensure safe zone compliance

## Benefits

1. **Consistent Brand Voice**: Content Agent rules + Persona profile = complete brand identity
2. **AEO Compliance**: Built-in AEO optimization rules
3. **Vertical Alignment**: Each site has specific tone and themes
4. **Structured Output**: Predictable script format for video generation
5. **Safety**: Content safety rules enforced automatically

## Next Steps

1. ✅ **Store Prompt** - Document stored in `/docs/agents/CONTENT_AGENT_PROMPT.md`
2. ⏳ **Create Migration** - Add Content Agent config to sites.config
3. ⏳ **Create Script Generator** - New edge function for script generation
4. ⏳ **Update agentic-content-gen** - Integrate Content Agent prompt
5. ⏳ **Update Video Generators** - Use script generator output


