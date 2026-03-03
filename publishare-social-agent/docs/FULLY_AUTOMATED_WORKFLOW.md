# Fully Automated Article Workflow

## Overview

The `agentic-content-gen` function now supports a **fully automated workflow** that can take an article from topic to published and shared on social media, all in one call.

## Complete Workflow Steps

### ✅ Currently Implemented

1. **Content Generation** - Generates article content using OpenAI GPT-4
2. **Article Creation** - Creates article record in database
3. **AEO Processing** - Applies Answer Engine Optimization (content type detection, answer-first validation, schema generation, etc.)
4. **Featured Image Generation** - Generates and links featured image
5. **Link Insertion** - Generates and inserts internal/external links
6. **HTML Conversion** - Converts markdown to HTML
7. **Publishing** - Sets article status to 'published' (optional)
8. **Social Post Generation** - Generates platform-specific social media posts (optional)
9. **Featured Image URL Update** - Automatically updates article with generated image URL

### ✅ Fully Implemented

- **Social Media Sharing** - Posts to social platforms via GoHighLevel (GHL) API

## Usage Example

### Fully Automated (Publish + Social)

```typescript
const response = await fetch('/functions/v1/agentic-content-gen', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    topic: 'how to fund a construction business',
    title: 'How to Fund a Construction Business',
    site_id: 'smallbizsimple',
    target_audience: 'Small business owners',
    content_type: 'how-to',
    content_length: 2000,
    tone: 'professional',
    
    // AEO Settings
    aeo_optimized: true,
    aeo_content_type: 'how-to',
    generate_schema: true,
    answer_first: true,
    
    // Workflow Options
    generate_image: true,
    generate_links: true,
    convert_to_html: true,
    auto_publish: true, // ← Publishes immediately
    generate_social_posts: true, // ← Generates social posts
    share_to_social: false, // ← Set to true when APIs are ready
    social_platforms: ['facebook', 'twitter', 'linkedin']
  })
});
```

### Draft Mode (Review Before Publishing)

```typescript
{
  // ... same as above but ...
  auto_publish: false, // Keep as draft
  generate_social_posts: false // Don't generate posts yet
}
```

## ✅ Complete! GHL Integration Added

The system now posts to social media via **GoHighLevel (GHL)**, which handles all platform APIs. You just need to:

### 1. Add GHL Configuration

Add your GHL credentials to the `ghl_social_config` table:

```sql
INSERT INTO ghl_social_config (
  site_id,
  profile_name,
  ghl_api_key,
  ghl_location_id,
  platforms,
  default_schedule_hours,
  auto_post
) VALUES (
  'smallbizsimple',
  'Keenan Shaw',
  'your_ghl_jwt_token',
  'your_ghl_location_id',
  '["facebook", "linkedin", "instagram"]'::jsonb,
  1,
  true
);
```

**GHL handles all platform APIs** - You don't need individual platform credentials!

### 2. How GHL Integration Works

GHL acts as a **unified social media API** that:
- ✅ Handles all platform OAuth connections
- ✅ Manages posting to Facebook, LinkedIn, Twitter, Instagram
- ✅ Schedules posts automatically
- ✅ Tracks post status and engagement
- ✅ No need for individual platform API keys

**You only need:**
- GHL JWT token (one per profile)
- GHL Location ID (one per profile)
- Connected social accounts in GHL dashboard

### 3. Social Posts Storage (Optional)

To track generated posts, you can create a `social_posts` table:

```sql
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'twitter', 'linkedin', etc.
  post_content TEXT NOT NULL,
  post_url VARCHAR(500), -- URL after posting
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_posts_article ON social_posts(article_id);
CREATE INDEX idx_social_posts_status ON social_posts(status);
```

### 4. Edge Function: `ghl-social-poster` ✅

The `ghl-social-poster` function:

1. ✅ Fetches GHL config from database
2. ✅ Strips markdown from content
3. ✅ Uploads images to GHL media library
4. ✅ Posts to GHL API (which handles all platforms)
5. ✅ Returns results per platform
6. ✅ Handles errors gracefully

## Current Capabilities

### ✅ What Works Now

- **Complete article generation** with AEO optimization
- **Image generation and linking** to article
- **Link insertion** for SEO
- **HTML conversion** for fast rendering
- **Automatic publishing** (when `auto_publish: true`)
- **Social post generation** (content created, ready for posting)

### ✅ What's Complete

- **Actual social media posting** - Posts via GHL to all platforms ✅
- **Post scheduling** - GHL handles scheduling ✅
- **Image attachment** - Featured images automatically included ✅
- **Multi-platform** - Post to multiple platforms in one call ✅

## Implementation Priority

### Phase 1: Social Post Generation ✅ (Done)
- Generate posts for multiple platforms
- Platform-specific formatting
- Hashtag generation
- Call-to-action inclusion

### Phase 2: Social API Integration ✅ (Complete!)
1. ✅ Created `ghl-social-poster` edge function
2. ✅ Added GHL config table in database
3. ✅ Integrated with `agentic-content-gen`
4. ✅ Error handling and retry logic implemented
5. ⚠️ Optional: Store post results in database (future enhancement)

### Phase 3: Scheduling & Analytics (Future)
1. Add scheduling service (Cron jobs or Supabase Edge Functions scheduler)
2. Implement analytics tracking
3. Add engagement metrics dashboard
4. A/B testing for post variations

## Testing the Workflow

### Test Full Automation

```bash
node scripts/create-construction-funding-article.js
```

Update the script to include:
```javascript
{
  auto_publish: true,
  generate_social_posts: true,
  social_platforms: ['facebook', 'twitter', 'linkedin']
}
```

### Expected Output

1. ✅ Article created with content
2. ✅ AEO metadata applied
3. ✅ Featured image generated and linked
4. ✅ Links inserted
5. ✅ HTML converted
6. ✅ Article published
7. ✅ Social posts generated (ready for API integration)

## Summary

**✅ FULLY AUTOMATED WORKFLOW COMPLETE!**

The system now:

- ✅ Generates complete articles
- ✅ Creates all assets (images, links, HTML)
- ✅ Publishes articles
- ✅ Generates social media posts
- ✅ **Posts to social platforms via GHL** 🎉

**To use it**, you only need to:
1. Add GHL credentials to `ghl_social_config` table
2. Set `share_to_social: true` in your article generation request
3. Watch articles automatically post to social media!

**The automation is complete!** 🚀

See `GHL_SOCIAL_INTEGRATION.md` for detailed setup instructions.

