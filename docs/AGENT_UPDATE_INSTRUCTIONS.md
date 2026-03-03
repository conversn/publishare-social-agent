# Agent Update Instructions - Article Revalidation Fix

## Overview

All sites using Publishare CMS need to update their article pages to use dynamic rendering. This ensures articles work immediately after publishing without requiring a rebuild.

---

## ✅ Site 1: ParentSimple Agent

**Status**: ✅ **COMPLETE** - All files updated

**Files Updated**:
1. ✅ `src/app/articles/[slug]/page.tsx`
2. ✅ `src/app/content/[slug]/page.tsx`

**Action Required**: 
- **Deploy** the changes
- **Test** by publishing a new article

**Instructions File**: `02-Expansion-Operations-Planning/Publisher-Platforms/04-ParentSimple/UPDATE_INSTRUCTIONS.md`

---

## ✅ Site 2: SeniorSimple Agent

**Status**: ✅ **COMPLETE** - File updated

**File Updated**:
1. ✅ `src/app/articles/[slug]/page.tsx`

**Action Required**: 
- **Deploy** the changes
- **Test** by publishing a new article

**Instructions File**: `02-Expansion-Operations-Planning/Publisher-Platforms/02-SeniorSimple-Platform/03-SeniorSimple 2/UPDATE_INSTRUCTIONS.md`

---

## ✅ Site 3: RateRoots Agent

**Status**: ✅ **COMPLETE** - File updated

**File Updated**:
1. ✅ `app/library/[slug]/page.tsx`

**Action Required**: 
- **Deploy** the changes
- **Test** by publishing a new article

**Instructions File**: `05-Web-Applications/01-RateRoots-Platform/rateroots-platform-homepage/UPDATE_INSTRUCTIONS.md`

---

## What Was Changed

All article pages now include:
```typescript
// Force dynamic rendering - fetch from database on every request
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

## Benefits

- ✅ **No rebuild needed** - Articles work immediately after publishing
- ✅ **Always up-to-date** - Fetches latest content from database
- ✅ **Simple solution** - No webhook setup required
- ✅ **Works for all sites** - Consistent behavior across platforms

## Testing

After deployment:
1. Publish a new article in Publishare CMS
2. Visit the article URL immediately
3. Should work without rebuild ✅

---

**Update Date**: 2025-12-02  
**All Sites**: ✅ Complete - Ready to deploy


