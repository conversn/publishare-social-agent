# Article Revalidation Instructions for All Sites

## Problem
When articles are published in Publishare CMS, they return 404 errors because Next.js hasn't regenerated the route. This happens because Next.js may cache routes statically.

## Solution
Add `force-dynamic` export to article pages to fetch from database on every request. **No rebuild needed after publishing articles.**

---

## Instructions by Site

### ✅ Site 1: ParentSimple
**Status**: Already updated

**Files Updated**:
- ✅ `02-Expansion-Operations-Planning/Publisher-Platforms/04-ParentSimple/src/app/articles/[slug]/page.tsx`

**What Was Done**:
```typescript
// Added these lines after imports, before the component:
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

**Action Required**: None - Already complete ✅

---

### 🔧 Site 2: SeniorSimple
**Status**: Needs update

**File to Update**:
- `02-Expansion-Operations-Planning/Publisher-Platforms/02-SeniorSimple-Platform/03-SeniorSimple 2/src/app/articles/[slug]/page.tsx`

**Instructions**:
1. Open the file: `02-Expansion-Operations-Planning/Publisher-Platforms/02-SeniorSimple-Platform/03-SeniorSimple 2/src/app/articles/[slug]/page.tsx`
2. Find the line with `interface ArticlePageProps` (around line 6)
3. Add these two lines **after the interface and before the component**:
   ```typescript
   // Force dynamic rendering - fetch from database on every request
   export const dynamic = 'force-dynamic'
   export const revalidate = 0
   ```
4. The file should look like this:
   ```typescript
   interface ArticlePageProps {
     params: Promise<{ slug: string }>
   }

   // Force dynamic rendering - fetch from database on every request
   export const dynamic = 'force-dynamic'
   export const revalidate = 0

   export default async function ArticlePage({ params }: ArticlePageProps) {
     // ... rest of component
   }
   ```
5. Save and deploy

**Also Check** (if exists):
- `02-Expansion-Operations-Planning/Publisher-Platforms/02-SeniorSimple-Platform/03-SeniorSimple 2/src/app/content/[slug]/page.tsx`
  - Apply same changes if this file exists

---

### 🔧 Site 3: RateRoots
**Status**: Needs update

**File to Update**:
- `05-Web-Applications/01-RateRoots-Platform/rateroots-platform-homepage/app/library/[slug]/page.tsx`

**Instructions**:
1. Open the file: `05-Web-Applications/01-RateRoots-Platform/rateroots-platform-homepage/app/library/[slug]/page.tsx`
2. Find the line with `type ArticlePageParams` (around line 30)
3. Add these two lines **after the type definition and before the component**:
   ```typescript
   // Force dynamic rendering - fetch from database on every request
   export const dynamic = 'force-dynamic'
   export const revalidate = 0
   ```
4. The file should look like this:
   ```typescript
   type ArticlePageParams = Promise<{ slug: string }>

   // Force dynamic rendering - fetch from database on every request
   export const dynamic = 'force-dynamic'
   export const revalidate = 0

   export async function generateMetadata({ params }: { params: ArticlePageParams }) {
     // ... rest of component
   }
   ```
5. Save and deploy

---

### 🔧 Site 4: ParentSimple Content Route (if used)
**Status**: Needs update

**File to Update**:
- `02-Expansion-Operations-Planning/Publisher-Platforms/04-ParentSimple/src/app/content/[slug]/page.tsx`

**Instructions**:
1. Open the file: `02-Expansion-Operations-Planning/Publisher-Platforms/04-ParentSimple/src/app/content/[slug]/page.tsx`
2. Find the line with `// Dynamic route - no generateStaticParams needed` (around line 91)
3. Add these two lines **right after that comment**:
   ```typescript
   // Force dynamic rendering - fetch from database on every request
   export const dynamic = 'force-dynamic'
   export const revalidate = 0
   ```
4. Save and deploy

---

## Verification Steps

After updating each site:

1. **Deploy the changes** to your hosting platform (Vercel, etc.)

2. **Test by publishing a new article** in Publishare CMS

3. **Visit the article URL immediately** - it should work without rebuild

4. **Check the article page** - should load without 404

---

## What This Does

- **`export const dynamic = 'force-dynamic'`**: Forces Next.js to render the page dynamically on every request (fetches from database)
- **`export const revalidate = 0`**: Disables caching, ensuring fresh data

**Result**: Articles work immediately after publishing, no rebuild needed!

---

## Optional: On-Demand Revalidation (Advanced)

If you want static caching with on-demand revalidation for better performance, see:
- `02-Expansion-Operations-Planning/Publisher-Platforms/04-ParentSimple/docs/ARTICLE_REVALIDATION_SETUP.md`

This requires:
- API routes (`/api/revalidate`)
- Webhook setup in CMS
- More complex but better performance

**Recommendation**: Use `force-dynamic` (simple solution) unless you need static caching.

---

## Summary Checklist

- [x] ParentSimple `/articles/[slug]` - ✅ Already updated
- [ ] ParentSimple `/content/[slug]` - ⏳ Needs update
- [ ] SeniorSimple `/articles/[slug]` - ⏳ Needs update
- [ ] SeniorSimple `/content/[slug]` - ⏳ Check if exists
- [ ] RateRoots `/library/[slug]` - ⏳ Needs update

---

**Questions?** See `ARTICLE_REVALIDATION_SETUP.md` for more details.


