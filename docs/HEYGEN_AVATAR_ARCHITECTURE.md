# HeyGen Avatar Architecture

## Relationship Design

### Architecture Decision: Articles → Sites → Avatars

**Chosen Approach**: Indirect relationship through sites table

```
articles.site_id → sites.id → heygen_avatar_config.site_id
```

### Why This Architecture?

#### ✅ Advantages

1. **Single Source of Truth**
   - One avatar per brand (enforced by `UNIQUE(site_id)`)
   - Change avatar once, all articles automatically use it
   - No risk of multiple avatars per brand

2. **Maintains Brand Consistency**
   - All articles for a brand use the same avatar
   - Aligns with "single avatar persona per brand" requirement
   - Easy to enforce brand identity

3. **Clean Separation of Concerns**
   - Sites = Brands/Platforms
   - Avatars = Brand Personas
   - Articles = Content
   - Clear hierarchy and responsibility

4. **Simple Queries**
   - Easy to get avatar for any article
   - Can query all articles using a specific avatar
   - Can change avatar for entire brand with one update

5. **Scalability**
   - Adding new sites/brands is straightforward
   - Each brand gets one avatar config
   - No complex many-to-many relationships

#### ❌ Alternative (Rejected): Direct Article → Avatar

**Why Not Direct?**
- Would allow multiple avatars per brand (violates requirement)
- Harder to maintain consistency
- More complex queries
- Would need additional constraints to enforce "one per brand"

## Database Schema

### Tables

```sql
sites
├── id (PK) VARCHAR(50)  -- 'seniorsimple', 'mortgagesimple', etc.
├── name
├── domain
└── config (JSONB)

articles
├── id (PK) UUID
├── site_id (FK) → sites.id
├── title
└── content

heygen_avatar_config
├── id (PK) UUID
├── site_id (FK, UNIQUE) → sites.id  -- ONE per site
├── avatar_id
├── voice_id
└── training_status
```

### Relationship Chain

```
Article → Site → Avatar Config
```

## Query Patterns

### Get Avatar for Article

```sql
-- Method 1: Direct JOIN
SELECT 
  a.id AS article_id,
  a.title,
  hac.avatar_id,
  hac.voice_id
FROM articles a
JOIN sites s ON a.site_id = s.id
JOIN heygen_avatar_config hac ON s.id = hac.site_id
WHERE a.id = 'article-uuid'
  AND hac.is_active = true;

-- Method 2: Using Helper View
SELECT * FROM article_avatar_lookup
WHERE article_id = 'article-uuid';
```

### Get All Articles Using Specific Avatar

```sql
SELECT a.*
FROM articles a
JOIN sites s ON a.site_id = s.id
JOIN heygen_avatar_config hac ON s.id = hac.site_id
WHERE hac.avatar_id = 'heygen-avatar-id';
```

### Change Avatar for Entire Brand

```sql
-- Update avatar for all articles in a brand
UPDATE heygen_avatar_config
SET 
  avatar_id = 'new-avatar-id',
  updated_at = NOW()
WHERE site_id = 'seniorsimple';
-- All articles for seniorsimple now use new avatar
```

### List All Brands with Avatars

```sql
SELECT 
  s.id AS site_id,
  s.name AS site_name,
  hac.avatar_id,
  hac.avatar_name,
  hac.training_status
FROM sites s
LEFT JOIN heygen_avatar_config hac ON s.id = hac.site_id
ORDER BY s.name;
```

## Edge Function Usage

### In Video Generator Function

```typescript
// Get article
const { data: article } = await supabase
  .from('articles')
  .select('id, title, site_id, content')
  .eq('id', article_id)
  .single();

// Get avatar config for article's site
const { data: avatarConfig } = await supabase
  .from('heygen_avatar_config')
  .select('avatar_id, voice_id, voice_provider')
  .eq('site_id', article.site_id)
  .eq('is_active', true)
  .single();

// Use avatar_id and voice_id for HeyGen API call
const videoResponse = await fetch('https://api.heygen.com/v2/video/generate', {
  headers: {
    'X-Api-Key': heygenApiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    avatar_id: avatarConfig.avatar_id,
    voice_id: avatarConfig.voice_id,
    script: generatedScript
  })
});
```

## Migration Path

### Step 1: Create Table
```sql
-- Run migration: 20250115000000_create_heygen_avatar_config.sql
```

### Step 2: Assign Avatars
```sql
-- For each brand, insert avatar config
INSERT INTO heygen_avatar_config (site_id, avatar_id, avatar_name, voice_id)
VALUES 
  ('seniorsimple', 'heygen-avatar-id-1', 'SeniorSimple Avatar', 'heygen-voice-id-1'),
  ('mortgagesimple', 'heygen-avatar-id-2', 'MortgageSimple Avatar', 'heygen-voice-id-2');
  -- ... etc for all 8 brands
```

### Step 3: Verify
```sql
-- Check all sites have avatars
SELECT s.id, s.name, hac.avatar_id, hac.avatar_name
FROM sites s
LEFT JOIN heygen_avatar_config hac ON s.id = hac.site_id
WHERE s.is_active = true;
```

## Benefits Summary

| Aspect | Articles → Sites → Avatars |
|--------|---------------------------|
| **Consistency** | ✅ One avatar per brand (enforced) |
| **Maintenance** | ✅ Change once, applies to all articles |
| **Queries** | ✅ Simple JOINs, helper view available |
| **Scalability** | ✅ Easy to add new brands |
| **Flexibility** | ✅ Can change avatar without touching articles |
| **Data Integrity** | ✅ Foreign keys ensure referential integrity |

## Conclusion

The **Articles → Sites → Avatars** architecture is the optimal choice because:

1. ✅ Enforces "single avatar per brand" requirement
2. ✅ Maintains clean separation of concerns
3. ✅ Simplifies queries and maintenance
4. ✅ Scales well as you add more brands
5. ✅ Aligns with existing site-based architecture

No direct article-to-avatar relationship needed. The site acts as the intermediary, ensuring brand consistency.


