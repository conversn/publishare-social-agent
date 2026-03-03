# Agentic Content Gen - Workflow Audit

## Issues Found

### 1. ❌ Canonical URL Generation - Hardcoded Domains

**Location**: `agentic-content-gen/index.ts` lines 307-313

**Problem**: 
- Hardcoded domain logic defaults to `https://example.com` for unknown sites
- Does not fetch domain from `sites` table
- ParentSimple (`parentsimple`) not in hardcoded list

**Current Code**:
```typescript
const siteDomain = params.site_id === 'rateroots' 
  ? 'https://rateroots.com'
  : params.site_id === 'seniorsimple'
  ? 'https://seniorsimple.org'
  : params.site_id === 'mortgagesimple'
  ? 'https://mortgagesimple.org'
  : 'https://example.com';
```

**Fix Required**: Query `sites` table to get domain dynamically

---

### 2. ❌ Internal Linking - Incorrect Parameter

**Location**: `agentic-content-gen/index.ts` line 932

**Problem**:
- Uses `params.site_id` but `params` is not in scope
- Should use `body.site_id` or `article.site_id`

**Current Code**:
```typescript
body: JSON.stringify({
  content: generatedContent.content.substring(0, 2000),
  article_id: article.id,
  site_id: params.site_id, // ❌ params not defined here
  max_suggestions: 5
})
```

**Fix Required**: Change to `body.site_id` or `article.site_id`

---

### 3. ⚠️ Image Generation - Silent Failures

**Location**: `agentic-content-gen/index.ts` lines 854-911

**Problem**:
- Errors are caught and logged but not surfaced
- No verification that image was actually generated
- May fail silently if API key is missing or function errors

**Current Code**:
```typescript
} catch (error) {
  console.log('⚠️  Image generation failed (non-critical)');
}
```

**Fix Required**: 
- Add better error logging
- Verify image URL is returned
- Check if OPENAI_API_KEY is set

---

### 4. ⚠️ Link Generation - Silent Failures

**Location**: `agentic-content-gen/index.ts` lines 916-975

**Problem**:
- Similar to image generation, errors are caught silently
- No verification that links were actually inserted
- May fail if `ai-link-suggestions` or `insert-links` functions error

**Fix Required**:
- Add better error logging
- Verify links were actually inserted
- Check response status codes

---

### 5. ⚠️ HTML Conversion - May Not Be Called

**Location**: `agentic-content-gen/index.ts` lines 980-1010

**Problem**:
- HTML conversion happens but may not update article if it fails
- No verification that `html_body` was saved

**Fix Required**:
- Verify `html_body` is saved after conversion
- Add error handling

---

## Workflow Steps (Current)

1. ✅ Generate Content (AI)
2. ✅ Create Article in Database
3. ✅ Assign UX Category
4. ✅ AEO Processing
5. ⚠️ Generate Image (may fail silently)
6. ⚠️ Generate Links (may fail silently, wrong parameter)
7. ⚠️ Convert to HTML (may not save)
8. ⚠️ Social Media Posts (optional)

---

## Required Fixes

### Fix 1: Dynamic Domain Lookup

```typescript
async function getSiteDomain(supabase: any, siteId?: string): Promise<string> {
  if (!siteId) return 'https://example.com';
  
  const { data: site } = await supabase
    .from('sites')
    .select('domain')
    .eq('id', siteId)
    .single();
  
  if (site?.domain) {
    return site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
  }
  
  return 'https://example.com';
}
```

### Fix 2: Correct site_id Parameter

```typescript
body: JSON.stringify({
  content: generatedContent.content.substring(0, 2000),
  article_id: article.id,
  site_id: body.site_id || article.site_id, // ✅ Fixed
  max_suggestions: 5
})
```

### Fix 3: Better Error Handling

```typescript
if (imageResponse.ok) {
  const imageData = await imageResponse.json();
  const imageUrl = imageData.imageUrl || imageData.image_url;
  
  if (!imageUrl) {
    console.error('❌ Image generation returned no URL');
    throw new Error('Image generation failed: No URL returned');
  }
  // ... rest of code
} else {
  const errorText = await imageResponse.text();
  console.error(`❌ Image generation failed: ${imageResponse.status} - ${errorText}`);
  throw new Error(`Image generation failed: ${errorText}`);
}
```

---

## Testing Checklist

- [ ] Canonical URLs use correct domain from sites table
- [ ] Internal linking receives correct site_id
- [ ] Images are generated and saved
- [ ] Links are generated and inserted
- [ ] HTML conversion saves html_body
- [ ] All errors are properly logged
- [ ] Workflow completes end-to-end

---

**Status**: ✅ **Fixes Applied - Ready for Testing**

**Priority**: **HIGH** - Affects all generated articles

---

## Fixes Applied

### ✅ Fix 1: Dynamic Domain Lookup
- Added `getSiteDomain()` function to fetch domain from `sites` table
- Updated `generateMetadata()` to be async and use dynamic domain lookup
- All canonical URLs now use correct domain from database

### ✅ Fix 2: Correct site_id Parameter
- Fixed line 932: Changed `params.site_id` to `body.site_id || article.site_id`
- Internal linking now receives correct site_id

### ✅ Fix 3: Better Error Handling
- Added detailed error logging for image generation
- Added verification that image URL is returned
- Added error logging for link generation
- Added error logging for HTML conversion
- All errors now properly logged with stack traces

### ✅ Fix 4: HTML Conversion
- Now fetches latest article content (after link insertion) before converting
- Verifies html_body is saved
- Better error handling

---

## Script Created

**`scripts/fix-parentsimple-articles.js`** - Fixes existing articles:
- Updates canonical URLs
- Generates missing featured images
- Adds internal links
- Converts markdown to HTML

**Usage**:
```bash
# Fix all articles
node scripts/fix-parentsimple-articles.js

# Fix specific number
node scripts/fix-parentsimple-articles.js --limit 10

# Fix specific article
node scripts/fix-parentsimple-articles.js --article-id <id>
```

---

## Next Steps

1. ✅ Deploy updated `agentic-content-gen` function
2. ⏳ Run fix script on existing ParentSimple articles
3. ⏳ Test new article generation to verify fixes
4. ⏳ Monitor logs for any remaining issues

