# Publishare Agent Instructions: Featured Image Management

## Overview
This document provides instructions for the Publishare agent to implement featured image functionality in the CMS, based on the diagnosis in `FEATURED_IMAGE_DIAGNOSIS.md`.

## Current State

### What Works ✅
- **Database Schema**: `articles` table has `featured_image_url` and `featured_image_alt` columns
- **Rendering**: Article pages correctly render featured images when `featured_image_url` is populated
- **AI Image Generator**: Edge function `ai-image-generator` can create featured images
- **Media Library**: `media_library` table exists with proper schema for storing images

### What's Missing ⚠️
- **CMS Form Fields**: No UI in `app/cms/new/page.tsx` or `app/cms/edit/[id]/page.tsx` for featured images
- **Media Library Integration**: No connection between CMS forms and `media_library` table
- **Image Upload/Selection**: No way for users to upload or select featured images in CMS

## Required Implementation

### Phase 1: Add Featured Image Fields to CMS Forms

#### File: `app/cms/new/page.tsx`
**Location**: Add after line 48 (after `linkedin_image` field)

```typescript
// Add to formData state (around line 28-49):
featured_image_url: '',
featured_image_alt: '',

// Add form fields in JSX (in the form section):
<div className="space-y-2">
  <Label htmlFor="featured_image_url">Featured Image URL</Label>
  <Input
    id="featured_image_url"
    value={formData.featured_image_url}
    onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
    placeholder="https://example.com/image.jpg or /images/path/to/image.jpg"
  />
  <p className="text-sm text-gray-500">
    Enter a full URL or a path relative to /public (e.g., /images/hero/image.webp)
  </p>
</div>

<div className="space-y-2">
  <Label htmlFor="featured_image_alt">Featured Image Alt Text</Label>
  <Input
    id="featured_image_alt"
    value={formData.featured_image_alt}
    onChange={(e) => setFormData(prev => ({ ...prev, featured_image_alt: e.target.value }))}
    placeholder="Descriptive alt text for accessibility"
  />
</div>
```

**Update the insert statement** (around line 200-250) to include:
```typescript
featured_image_url: formData.featured_image_url || null,
featured_image_alt: formData.featured_image_alt || null,
```

#### File: `app/cms/edit/[id]/page.tsx`
**Similar changes needed:**
1. Add `featured_image_url` and `featured_image_alt` to form state
2. Load existing values from article data
3. Add form fields in JSX
4. Include in update statement

### Phase 2: Integrate Media Library (Optional but Recommended)

#### Option A: Simple URL Input (Quick Implementation)
- Use text input fields as shown above
- Users manually enter URLs or paths
- **Pros**: Fast to implement, works immediately
- **Cons**: No validation, no image preview, error-prone

#### Option B: Media Library Integration (Recommended)
1. **Create Media Library Component**
   - File: `components/cms/MediaLibrarySelector.tsx`
   - Functionality:
     - Browse `media_library` table
     - Search/filter images
     - Show image previews
     - Select image to populate `featured_image_url`
     - Upload new images via Supabase Storage

2. **Integrate into CMS Forms**
   - Add "Select from Media Library" button
   - Open modal/dialog with `MediaLibrarySelector`
   - On selection, populate `featured_image_url` and `featured_image_alt`

3. **Image Upload Functionality**
   - Use existing `ImageUploader.tsx` component or create new one
   - Upload to Supabase Storage bucket (e.g., `media` or `images`)
   - Create entry in `media_library` table
   - Return URL for use in `featured_image_url`

### Phase 3: AI Image Generation Integration (Optional)

#### Connect AI Image Generator to CMS
1. **Add "Generate Featured Image" Button**
   - In CMS form, add button next to featured image field
   - On click, call `ai-image-generator` edge function
   - Pass article title/excerpt as prompt
   - Set `imageType: 'featured'` and `article_id`

2. **Handle Response**
   - Receive `imageUrl` from edge function
   - Populate `featured_image_url` field
   - Optionally create `article_images` entry via `link-image-to-article` function

3. **Implementation Example**
```typescript
const generateFeaturedImage = async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-image-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      title: formData.title,
      content: formData.excerpt || formData.content.substring(0, 500),
      style: 'professional',
      aspect_ratio: '16:9',
      imageType: 'featured',
      article_id: articleId, // Only if editing existing article
      auto_approve: true
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    setFormData(prev => ({
      ...prev,
      featured_image_url: data.imageUrl,
      featured_image_alt: `${formData.title} - Featured Image`
    }));
  }
};
```

## Validation & Error Handling

### URL Validation
```typescript
const validateImageUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  
  // Check if it's a valid URL or path
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url);
      return true;
    }
    if (url.startsWith('/')) {
      return true; // Local path
    }
    return false;
  } catch {
    return false;
  }
};
```

### Image Preview
- Show preview of selected image URL
- Display error if image fails to load
- Provide fallback placeholder

## Database Schema Reference

### `articles` Table
```sql
featured_image_url TEXT,
featured_image_alt TEXT,
```

### `media_library` Table
```sql
id UUID PRIMARY KEY,
file_url TEXT NOT NULL,
filename TEXT,
file_type TEXT,
image_type TEXT, -- 'featured', 'inline', 'og_image', etc.
article_id UUID REFERENCES articles(id),
user_id UUID,
is_featured BOOLEAN,
is_public BOOLEAN,
-- ... other fields
```

### `article_images` Table (for linking)
```sql
id UUID PRIMARY KEY,
article_id UUID REFERENCES articles(id),
media_id UUID REFERENCES media_library(id),
image_type TEXT, -- 'featured', 'inline', etc.
position INTEGER,
is_active BOOLEAN,
```

## Testing Checklist

After implementation, verify:
- [ ] Featured image field appears in "New Article" form
- [ ] Featured image field appears in "Edit Article" form
- [ ] Existing featured images load correctly when editing
- [ ] New featured images save correctly
- [ ] Featured images render on article pages
- [ ] External URLs (Unsplash, etc.) work correctly
- [ ] Local paths (e.g., `/images/hero/image.webp`) work correctly
- [ ] Alt text saves and displays correctly
- [ ] Empty featured image doesn't break rendering
- [ ] Invalid URLs show appropriate error messages

## Priority Order

1. **High Priority**: Add basic URL input fields to CMS forms (Phase 1)
2. **Medium Priority**: Add image preview and validation
3. **Low Priority**: Media library integration (Phase 2)
4. **Nice to Have**: AI image generation integration (Phase 3)

## Related Files

- `FEATURED_IMAGE_DIAGNOSIS.md` - Complete diagnosis and analysis
- `app/cms/new/page.tsx` - New article form
- `app/cms/edit/[id]/page.tsx` - Edit article form
- `components/cms/ImageUploader.tsx` - Existing image upload component
- `components/cms/EnhancedMediaManager.tsx` - Media manager component
- `supabase/functions/ai-image-generator/index.ts` - AI image generation
- `supabase/functions/link-image-to-article/index.ts` - Link images to articles

## Notes

- The Next.js config already allows `images.unsplash.com` for external images
- Local images should be placed in `public/images/` directory
- Supabase Storage URLs should be in format: `https://vpysqshhafthuxvokwqj.supabase.co/storage/v1/object/public/...`
- Consider adding image optimization/validation before saving to database

