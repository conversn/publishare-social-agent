# Persona Integration Summary

## ✅ Migration Deployed

1. **`heygen_avatar_config` table** - Created ✅
2. **`persona_profile` field** - Added ✅

## Architecture Decision

### ✅ Store Persona in `heygen_avatar_config.persona_profile`

**Rationale:**
- One persona per brand (matches `UNIQUE(site_id)`)
- Used for both content generation AND video generation
- Single source of truth for brand voice
- Logical: Avatar IS the persona (visual representation)

### ✅ No Additional Relationships Needed

**Current Flow:**
```
Articles → Sites → Avatar Config → Persona Profile
```

**Why This Works:**
- Articles inherit persona through `site_id`
- All articles for a brand use the same persona
- Maintains brand consistency
- Simple queries, no complexity

## Persona Profile Structure

Based on Expert Guru Creator template, store as JSONB:

```json
{
  "name": "Character Name",
  "physical": { ... },
  "background": { ... },
  "personality": { ... },
  "voice": {
    "writing_style": "...",
    "speech_patterns": "...",
    "dialog_tags": [...],
    "tone": "...",
    "worldview": "..."
  },
  "content_approach": { ... },
  "relationships": { ... },
  "motivations": { ... },
  "brand_alignment": { ... }
}
```

## Usage in Workflows

### 1. Content Generation (`agentic-content-gen`)

```typescript
// Fetch persona profile for article's brand
const { data: avatarConfig } = await supabase
  .from('heygen_avatar_config')
  .select('persona_profile')
  .eq('site_id', article.site_id)
  .single();

const persona = avatarConfig.persona_profile;

// Inject into AI prompt
const systemPrompt = `You are ${persona.name}, ${persona.background.education}.
Writing style: ${persona.voice.writing_style}
Tone: ${persona.voice.tone}
Worldview: ${persona.voice.worldview}
Philosophy: ${persona.voice.philosophy}

Write in ${persona.name}'s voice, using their speech patterns: ${persona.voice.speech_patterns}`;
```

### 2. Video Generation (`heygen-video-generator`)

```typescript
// Get persona for avatar characterization
const { data: avatarConfig } = await supabase
  .from('heygen_avatar_config')
  .select('persona_profile, avatar_id, voice_id')
  .eq('site_id', article.site_id)
  .single();

const persona = avatarConfig.persona_profile;

// Generate script in persona's voice
const script = generateScriptInPersonaVoice(article.content, persona);

// Use avatar_id and voice_id for HeyGen API
```

### 3. Social Media (`ghl-social-poster`)

```typescript
// Use persona voice for social posts
const persona = await getPersonaForSite(site_id);
// Generate posts in persona's voice and tone
```

## Next Steps

1. ✅ **Database Ready** - Migrations deployed
2. ⏳ **Create Personas** - Use Expert Guru Creator for each of 8 brands
3. ⏳ **Store Personas** - Insert persona profiles into `heygen_avatar_config`
4. ⏳ **Integrate Functions** - Update edge functions to use persona profiles
5. ⏳ **Test** - Verify content and video generation use persona voice

## Query Examples

### Get Persona for Article
```sql
SELECT 
  a.id AS article_id,
  a.title,
  hac.persona_profile
FROM articles a
JOIN heygen_avatar_config hac ON a.site_id = hac.site_id
WHERE a.id = 'article-uuid';
```

### Get All Brand Personas
```sql
SELECT 
  s.id AS site_id,
  s.name AS site_name,
  hac.persona_profile->>'name' AS persona_name,
  hac.persona_profile->'voice'->>'writing_style' AS writing_style
FROM sites s
JOIN heygen_avatar_config hac ON s.id = hac.site_id
WHERE hac.is_active = true;
```

## Benefits

1. **Brand Consistency**: One persona per brand, used everywhere
2. **Rich Voice**: Full backstory enables authentic, consistent voice
3. **Dual Purpose**: Same persona for writing AND video
4. **Easy Updates**: Change persona once, applies to all content
5. **No Complexity**: Current architecture is sufficient

## Conclusion

**✅ Store persona in `heygen_avatar_config.persona_profile`**

**✅ No additional relationships needed** - Articles inherit through site relationship.

Ready to create personas using Expert Guru Creator!


