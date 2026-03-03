# Quick Start: Test 3 Tampa Articles

## 🚀 Fastest Way to Test

### Step 1: Create Strategies (2 minutes)

**In Supabase Dashboard → SQL Editor**, run:

```sql
-- Create 3 test strategies for Tampa
INSERT INTO content_strategy (
  site_id, content_title, primary_keyword, content_type, category,
  status, priority_level, word_count, metadata
) VALUES 
  (
    'homesimple', 'AC Not Cooling in Tampa? Here''s What to Do',
    'AC not cooling Tampa', 'local_page', 'hvac', 'Planned', 'High', 2000,
    '{"city": "Tampa", "state": "FL", "vertical": "hvac", "page_type": "local_page"}'::jsonb
  ),
  (
    'homesimple', 'Emergency Plumbing Services in Tampa',
    'emergency plumber Tampa', 'local_page', 'plumbing', 'Planned', 'High', 2000,
    '{"city": "Tampa", "state": "FL", "vertical": "plumbing", "page_type": "local_page"}'::jsonb
  ),
  (
    'homesimple', 'Pest Control Services in Tampa: Complete Guide',
    'pest control Tampa', 'local_page', 'pest', 'Planned', 'High', 2000,
    '{"city": "Tampa", "state": "FL", "vertical": "pest", "page_type": "local_page"}'::jsonb
  );
```

### Step 2: Trigger Processing (1 minute)

**In Supabase Dashboard → Edge Functions → batch-strategy-processor**:

1. Click **"Invoke Function"**
2. Paste this payload:
```json
{
  "site_id": "homesimple",
  "limit": 3,
  "priority_level": "High"
}
```
3. Click **"Invoke"**

### Step 3: Check Results (1 minute)

**In Supabase Dashboard → SQL Editor**, run:

```sql
SELECT 
  id, title, slug, city, state, vertical, status, created_at
FROM articles
WHERE site_id = 'homesimple' AND city = 'Tampa'
ORDER BY created_at DESC
LIMIT 3;
```

---

## ✅ What You Should See

- **3 strategies** with status "Completed"
- **3 articles** in `articles` table with:
  - `page_type` = 'local_page'
  - `city` = 'Tampa'
  - `state` = 'FL'
  - `vertical` = 'hvac', 'plumbing', or 'pest'
  - Local facts integrated
  - AEO optimized (answer-first format)

---

## 📋 Full Instructions

See `docs/TAMPA_TEST_ARTICLES_INSTRUCTIONS.md` for complete guide with troubleshooting.

