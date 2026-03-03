# Persona Storage Analysis: Expert Guru Creator Integration

## Current State Analysis

### Existing Tables

1. **`personas` Table** (Content Personas)
   - Purpose: Target audience personas for content strategy
   - Scope: User-specific (`user_id` field)
   - Fields: `tone_voice`, `target_audience`, `content_style`, `ai_prompt`
   - Usage: Content generation targeting, campaign building
   - **NOT for brand expert personas**

2. **`heygen_avatar_config` Table** (NEW - Just Deployed)
   - Purpose: HeyGen avatar technical configuration
   - Scope: Brand-specific (`site_id` field, UNIQUE)
   - Fields: `avatar_id`, `voice_id`, `training_status`
   - Usage: Video generation technical config
   - **Missing**: Persona profile data

### Expert Guru Creator Data

The Expert Guru Creator generates **brand expert personas** - the fictional expert writer/speaker that represents each brand. This is different from:
- **Content Personas** (`personas` table): Who you're writing FOR (target audience)
- **Expert Personas** (needed): Who is writing/speaking (brand voice)

## Recommendation: Store in `heygen_avatar_config`

### Why Store Persona Profile in Avatar Config?

1. **Brand-Specific**: One expert persona per brand (matches `UNIQUE(site_id)`)
2. **Dual Purpose**: Used for both:
   - **Content Generation**: Write articles in the persona's voice
   - **Video Generation**: Avatar speaks in the persona's voice
3. **Single Source of Truth**: All brand identity in one place
4. **Logical Relationship**: Avatar IS the persona (visual representation)

### Architecture

```
Site → Avatar Config → Persona Profile
  ↓         ↓              ↓
Brand    Technical      Character
         (avatar_id)    (voice, style, backstory)
```

## Database Schema Addition

### Add Persona Profile Field

```sql
-- Migration: Add persona_profile to heygen_avatar_config
ALTER TABLE heygen_avatar_config
ADD COLUMN IF NOT EXISTS persona_profile JSONB DEFAULT '{}';

COMMENT ON COLUMN heygen_avatar_config.persona_profile IS 'Expert Guru Creator persona profile - complete character biography, voice, writing style, backstory. Used for content generation and video persona.';
```

### Persona Profile JSON Structure

Based on Expert Guru Creator template:

```json
{
  "name": "Dr. Sarah Chen",
  "age": 42,
  "physical": {
    "height": "5'6\"",
    "weight": "140 lbs",
    "hair_color": "Dark brown with silver streaks",
    "eye_color": "Hazel",
    "distinguishing_traits": "Warm smile, confident posture, professional but approachable"
  },
  "background": {
    "birth_date": "1982-03-15",
    "birthplace": "San Francisco, CA",
    "education": "PhD in Financial Planning, MBA from Stanford",
    "upbringing": "Middle-class family, first-generation college student",
    "work_experience": "20 years in financial services, former VP at major bank"
  },
  "personality": {
    "strongest_traits": ["Empathetic", "Analytical", "Patient", "Direct"],
    "weakest_traits": ["Perfectionist", "Overthinks", "Struggles with work-life balance"],
    "sees_self_as": "A trusted guide helping people navigate complex financial decisions",
    "seen_by_others_as": "Knowledgeable expert who makes complex topics accessible",
    "sense_of_humor": "Dry wit, appreciates self-deprecating humor",
    "basic_nature": "Optimistic realist - hopeful but grounded in facts"
  },
  "voice": {
    "writing_style": "Clear, conversational, uses analogies and real-world examples",
    "speech_patterns": "Speaks in complete thoughts, pauses for emphasis, uses 'you know' sparingly",
    "dialog_tags": ["Uses 'think about it this way'", "Often says 'here's the thing'"],
    "tone": "Warm but authoritative, never condescending",
    "worldview": "Financial security is achievable for everyone with the right guidance",
    "philosophy": "Education empowers people to make better decisions"
  },
  "content_approach": {
    "expertise_areas": ["Retirement planning", "Estate planning", "Tax strategies"],
    "writing_angle": "Practical advice grounded in real experience",
    "emotional_hooks": "Relates to common fears and aspirations",
    "storytelling_style": "Uses client stories (anonymized) to illustrate points"
  },
  "relationships": {
    "marital_status": "Married, 15 years",
    "best_friend": "College roommate, now a therapist",
    "mentors": "Former professor who became a lifelong advisor"
  },
  "motivations": {
    "present_problem": "Helping parents navigate their own retirement while planning for children's future",
    "greatest_fear": "People making financial decisions out of fear rather than knowledge",
    "ambitions": "Build a platform that makes expert financial advice accessible to middle-class families"
  },
  "brand_alignment": {
    "one_line_characterization": "The trusted financial advisor you wish you had - knowledgeable, approachable, and genuinely cares about your success",
    "most_important_trait": "Ability to translate complex financial concepts into actionable, relatable advice"
  }
}
```

## Relationship Analysis

### Current Relationship Chain

```
Articles → Sites → Avatar Config
  ↓         ↓          ↓
Content   Brand    Technical Config
```

### With Persona Profile

```
Articles → Sites → Avatar Config → Persona Profile
  ↓         ↓          ↓              ↓
Content   Brand    Avatar ID      Character Voice
                    Voice ID      Writing Style
                                  Backstory
```

### Do Articles Need Direct Link to Persona?

**Answer: NO** - Current relationship is sufficient.

**Why:**
1. Articles inherit persona through `site_id` → `heygen_avatar_config`
2. All articles for a brand use the same persona (by design)
3. Direct link would:
   - Allow multiple personas per brand (violates requirement)
   - Add unnecessary complexity
   - Break brand consistency

**Usage Pattern:**
```typescript
// In agentic-content-gen or heygen-video-generator
const { data: article } = await supabase
  .from('articles')
  .select('site_id, title, content')
  .eq('id', article_id)
  .single();

// Get persona profile for article's brand
const { data: avatarConfig } = await supabase
  .from('heygen_avatar_config')
  .select('persona_profile, avatar_id, voice_id')
  .eq('site_id', article.site_id)
  .eq('is_active', true)
  .single();

// Use persona_profile for content generation
const persona = avatarConfig.persona_profile;
// Generate content in persona's voice
// Create video with persona's characteristics
```

## Implementation Plan

### Step 1: Add Persona Profile Field
- Add `persona_profile JSONB` column to `heygen_avatar_config`
- Update migration file

### Step 2: Create Persona Profiles
- Use Expert Guru Creator for each of 8 brands
- Store complete persona data in `persona_profile` field
- One persona per brand

### Step 3: Integrate into Workflows
- **Content Generation**: Use `persona_profile` in `agentic-content-gen` prompts
- **Video Generation**: Use `persona_profile` for avatar characterization
- **Social Media**: Use `persona_profile` for brand voice consistency

### Step 4: Update Edge Functions
- `agentic-content-gen`: Read `persona_profile`, inject into AI prompts
- `heygen-video-generator`: Use `persona_profile` for script generation
- `ghl-social-poster`: Use `persona_profile` for social voice

## Benefits

1. **Brand Consistency**: One persona per brand, used everywhere
2. **Rich Characterization**: Full backstory enables authentic voice
3. **Dual Usage**: Same persona for writing AND video
4. **Easy Updates**: Change persona once, applies to all content
5. **No Additional Relationships**: Current architecture is sufficient

## Conclusion

**Store persona profile in `heygen_avatar_config.persona_profile` (JSONB)**

**No additional relationships needed** - Articles inherit persona through:
- `articles.site_id` → `sites.id` → `heygen_avatar_config.site_id` → `persona_profile`

This maintains:
- ✅ Single avatar persona per brand
- ✅ Brand consistency across all content
- ✅ Simple query patterns
- ✅ No unnecessary complexity


