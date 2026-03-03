# HeyGen API Integration Analysis

## Executive Summary

Based on the [HeyGen API documentation](https://docs.heygen.com/reference/authentication), HeyGen fits well into your architecture with a **single avatar persona per brand** model. However, several modifications are needed to make the workflow congruent.

## Current Architecture Analysis

### Existing Structure

1. **Sites Table**: Contains `id`, `name`, `domain`, `config` (JSONB)
2. **Brand Configuration**: Currently hardcoded in Creatomate function
   - Brand colors
   - Domain names
   - Logo URLs
3. **Video Generation**: Creatomate-based with unified templates
4. **Personas Table**: Exists but appears to be for content personas, not video avatars

### HeyGen API Requirements

From the [HeyGen authentication docs](https://docs.heygen.com/reference/authentication):

1. **Authentication**: `X-Api-Key` header with API token
2. **Avatar Management**: 
   - List available avatars via API
   - Photo Avatar generation (requires training)
   - Video Avatar generation
3. **Video Creation**: Create Avatar Video (V2) endpoint
4. **Voice Management**: List voices, brand voices available

## Required Modifications

### 1. Database Schema Updates

**Add HeyGen Configuration to Sites Table**

The `sites.config` JSONB field should be extended to include:

```sql
-- Migration: Add HeyGen avatar configuration to sites table
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS heygen_config JSONB DEFAULT '{}';

-- Example structure for heygen_config:
{
  "avatar_id": "string",           // HeyGen avatar ID
  "avatar_type": "photo" | "video", // Type of avatar
  "voice_id": "string",             // ElevenLabs or HeyGen voice ID
  "avatar_name": "string",          // Display name
  "avatar_training_status": "pending" | "completed" | "failed",
  "avatar_training_job_id": "string", // If training photo avatar
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**OR Create Dedicated Table** (Recommended for better querying):

```sql
-- Create HeyGen avatar configuration table
CREATE TABLE IF NOT EXISTS heygen_avatar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id VARCHAR(50) REFERENCES sites(id) ON DELETE CASCADE,
  avatar_id VARCHAR(255) NOT NULL, -- HeyGen avatar ID
  avatar_type VARCHAR(20) NOT NULL, -- 'photo' or 'video'
  avatar_name VARCHAR(255),
  voice_id VARCHAR(255), -- HeyGen voice ID or ElevenLabs voice ID
  voice_name VARCHAR(255),
  training_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'training', 'completed', 'failed'
  training_job_id VARCHAR(255), -- For photo avatar training
  preview_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id)
);

CREATE INDEX idx_heygen_avatar_config_site_id ON heygen_avatar_config(site_id);
CREATE INDEX idx_heygen_avatar_config_active ON heygen_avatar_config(is_active) WHERE is_active = true;
```

### 2. Avatar Selection Strategy

**Option A: Use Existing HeyGen Avatars** (Quick Start)
- List available avatars via API: `GET /v2/avatars`
- Manually assign one avatar per brand
- Store `avatar_id` in database
- **Pros**: Immediate implementation, no training required
- **Cons**: Less brand-specific, may not match brand persona

**Option B: Train Photo Avatars** (Brand-Specific)
- Upload brand representative photos
- Train Photo Avatar via API: `POST /v1/photo-avatars`
- Wait for training completion
- Use trained avatar for all brand videos
- **Pros**: Brand-specific persona, consistent identity
- **Cons**: Requires training time, additional API calls

**Recommendation**: Start with Option A, migrate to Option B for key brands

### 3. Voice Integration

HeyGen supports:
- **HeyGen Voices**: Built-in voices via Voice Management API
- **ElevenLabs Integration**: Can use ElevenLabs voices (you already have this)

**Decision Point**: 
- Use HeyGen's built-in voices (simpler, one API)
- OR continue using ElevenLabs (more control, existing integration)

**Recommendation**: Use HeyGen voices for simplicity, but keep ElevenLabs as fallback

### 4. Video Generation Function

Create `heygen-video-generator` edge function similar to `creatomate-video-generator`:

**Key Differences**:
- Uses `X-Api-Key` header instead of `Authorization: Bearer`
- Different API endpoint structure
- Avatar-based instead of template-based
- Supports script-to-video directly

**Function Structure**:
```typescript
interface HeyGenVideoRequest {
  article_id: string;
  video_type?: 'youtube-short' | 'long-form';
  use_voice?: boolean;
}

// Fetch avatar config from database
const avatarConfig = await supabase
  .from('heygen_avatar_config')
  .select('avatar_id, voice_id, avatar_type')
  .eq('site_id', article.site_id)
  .eq('is_active', true)
  .single();

// Generate video via HeyGen API
const response = await fetch('https://api.heygen.com/v2/video/generate', {
  method: 'POST',
  headers: {
    'X-Api-Key': heygenApiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    avatar_id: avatarConfig.avatar_id,
    voice_id: avatarConfig.voice_id,
    script: generatedScript,
    // ... other parameters
  })
});
```

### 5. Provider-Agnostic Video Generator

Create a unified `video-generator` function that:
- Accepts `provider: 'creatomate' | 'heygen'`
- Routes to appropriate function
- Maintains consistent response format
- Allows A/B testing between providers

## Workflow Congruence Analysis

### Current Workflow (Creatomate)
1. Article created → `agentic-content-gen`
2. Video generation → `creatomate-video-generator`
3. Uses templates + brand colors/logos
4. Returns video URL

### Proposed Workflow (HeyGen)
1. Article created → `agentic-content-gen`
2. Video generation → `heygen-video-generator`
3. Uses avatar + voice + script
4. Returns video URL

### Unified Workflow (Recommended)
1. Article created → `agentic-content-gen`
2. Video generation → `video-generator` (provider-agnostic)
3. Routes to Creatomate OR HeyGen based on:
   - Site configuration
   - Content type
   - A/B testing
4. Returns consistent video URL format

## Required Changes Summary

### Immediate (Phase 1)
1. ✅ **Database Migration**: Add `heygen_avatar_config` table
2. ✅ **Avatar Assignment**: Manually assign HeyGen avatars to each brand
3. ✅ **HeyGen Function**: Create `heygen-video-generator` edge function
4. ✅ **API Key Storage**: Add `HEYGEN_API_KEY` to Supabase secrets

### Short-Term (Phase 2)
5. ⏳ **Provider Router**: Create unified `video-generator` function
6. ⏳ **Avatar Management UI**: Admin interface to assign/change avatars
7. ⏳ **Voice Selection**: UI to select HeyGen voices per brand

### Long-Term (Phase 3)
8. ⏳ **Photo Avatar Training**: Implement training workflow for brand-specific avatars
9. ⏳ **A/B Testing**: Compare Creatomate vs HeyGen quality/cost
10. ⏳ **Auto-Selection**: AI-based provider selection based on content type

## API Endpoint Mapping

### HeyGen Endpoints Needed

| Endpoint | Purpose | When Used |
|----------|---------|-----------|
| `GET /v2/avatars` | List available avatars | Initial setup, avatar selection |
| `POST /v1/photo-avatars` | Train photo avatar | Brand-specific avatar creation |
| `GET /v1/photo-avatars/{id}/status` | Check training status | Monitor training progress |
| `POST /v2/video/generate` | Create avatar video | Video generation |
| `GET /v2/video/{id}` | Get video status | Poll for completion |
| `GET /v2/voices` | List available voices | Voice selection |

### Authentication
- **Header**: `X-Api-Key: {your_api_key}`
- **Storage**: Supabase Edge Function secrets
- **Security**: Never expose in client code

## Cost Considerations

### HeyGen Pricing (from API docs)
- **Free Trial**: Limited usage
- **Pro**: Increased limits
- **Scale**: Higher volume
- **Enterprise**: Custom pricing

### Comparison: Creatomate vs HeyGen

| Factor | Creatomate | HeyGen |
|--------|------------|--------|
| **Cost per Short** | $0.10-0.30 | $0.50-1.00 (estimated) |
| **Cost per Long-Form** | $0.50-1.50 | $2-5 (estimated) |
| **Avatar Training** | N/A | Required for photo avatars |
| **Voice Options** | External (ElevenLabs) | Built-in + External |
| **Template System** | Yes (4 templates) | No (avatar-based) |
| **Brand Customization** | Colors/logos | Avatar persona |

## Recommendations

### 1. Start with Existing Avatars
- Don't train photo avatars initially
- Use HeyGen's pre-built avatars
- Assign one per brand manually
- Test quality and cost

### 2. Maintain Dual Provider Support
- Keep Creatomate as primary (lower cost, templates)
- Use HeyGen for specific use cases:
  - When avatar persona is critical
  - For long-form educational content
  - When brand voice consistency is paramount

### 3. Database Design
- Use dedicated `heygen_avatar_config` table (not JSONB in sites)
- Enables better querying and management
- Supports future multi-avatar scenarios

### 4. Voice Strategy
- Use HeyGen built-in voices initially
- Keep ElevenLabs integration for Creatomate
- Consider migrating all to HeyGen voices if quality is better

## Implementation Checklist

- [ ] Create `heygen_avatar_config` table migration
- [ ] Add `HEYGEN_API_KEY` to Supabase secrets
- [ ] Create `heygen-video-generator` edge function
- [ ] List available HeyGen avatars via API
- [ ] Manually assign avatars to each brand (8 brands)
- [ ] Test video generation with sample article
- [ ] Compare output quality with Creatomate
- [ ] Create unified `video-generator` router function
- [ ] Update `agentic-content-gen` to support provider selection
- [ ] Add avatar management UI (optional)

## Next Steps

1. **Review this analysis** and confirm approach
2. **Create database migration** for avatar config
3. **Implement HeyGen function** following Creatomate pattern
4. **Test with one brand** before full rollout
5. **Compare results** and decide on primary provider


