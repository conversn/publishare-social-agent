# Remote Trigger Guide: Batch Strategy Processor

Multiple ways to trigger `batch-strategy-processor` remotely for HomeSimple.org.

---

## Method 1: Supabase CLI (Recommended - No Keys Needed)

If you're logged into Supabase CLI and have the project linked:

```bash
cd scripts
./trigger-batch-supabase-cli.sh homesimple 3 High
```

Or manually:

```bash
echo '{"site_id": "homesimple", "limit": 3, "priority_level": "High"}' | \
  supabase functions invoke batch-strategy-processor \
    --project-ref vpysqshhafthuxvokwqj \
    --payload -
```

**Advantages:**
- ✅ No need to manage service keys
- ✅ Uses your Supabase CLI authentication
- ✅ Clean output formatting

---

## Method 2: curl with Service Role Key

### Using Helper Script

```bash
cd scripts
./trigger-batch-remote.sh YOUR_SERVICE_ROLE_KEY homesimple 3 High
```

### Direct curl Command

```bash
curl -X POST \
  'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'apikey: YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "site_id": "homesimple",
    "limit": 3,
    "priority_level": "High"
  }'
```

**Get Service Role Key:**
- Supabase Dashboard → Settings → API → `service_role` key (keep secret!)

---

## Method 3: Supabase Dashboard (Easiest - No CLI/Keys)

1. Go to: https://supabase.com/dashboard/project/vpysqshhafthuxvokwqj/functions
2. Click on **batch-strategy-processor**
3. Click **"Invoke Function"** button
4. Paste this payload:
```json
{
  "site_id": "homesimple",
  "limit": 3,
  "priority_level": "High"
}
```
5. Click **"Invoke"**

**Advantages:**
- ✅ No command line needed
- ✅ Visual interface
- ✅ See logs immediately
- ✅ No keys to manage

---

## Method 4: JavaScript/Node.js

```javascript
const SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co';
const SERVICE_KEY = 'your_service_role_key';

async function triggerBatch() {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/batch-strategy-processor`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        site_id: 'homesimple',
        limit: 3,
        priority_level: 'High'
      })
    }
  );
  
  const result = await response.json();
  console.log(result);
}

triggerBatch();
```

---

## Method 5: Python

```python
import requests
import json

SUPABASE_URL = 'https://vpysqshhafthuxvokwqj.supabase.co'
SERVICE_KEY = 'your_service_role_key'

response = requests.post(
    f'{SUPABASE_URL}/functions/v1/batch-strategy-processor',
    headers={
        'Authorization': f'Bearer {SERVICE_KEY}',
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
    },
    json={
        'site_id': 'homesimple',
        'limit': 3,
        'priority_level': 'High'
    }
)

print(json.dumps(response.json(), indent=2))
```

---

## Method 6: Postman/Insomnia

**Request:**
- **Method**: POST
- **URL**: `https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/batch-strategy-processor`
- **Headers**:
  - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
  - `apikey`: `YOUR_SERVICE_ROLE_KEY`
  - `Content-Type`: `application/json`
- **Body** (JSON):
```json
{
  "site_id": "homesimple",
  "limit": 3,
  "priority_level": "High"
}
```

---

## Response Format

Successful response:

```json
{
  "success": true,
  "processed": 3,
  "succeeded": 3,
  "failed": 0,
  "results": [
    {
      "strategy_id": "uuid",
      "strategy_title": "AC Not Cooling in Tampa?",
      "status": "success",
      "article_id": "uuid"
    },
    ...
  ],
  "timestamp": "2026-01-03T17:30:00.000Z"
}
```

Error response:

```json
{
  "success": false,
  "processed": 0,
  "succeeded": 0,
  "failed": 0,
  "results": [],
  "error": "Error message here",
  "timestamp": "2026-01-03T17:30:00.000Z"
}
```

---

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `site_id` | string | No | - | Filter by site (e.g., "homesimple") |
| `limit` | number | No | 5 | Max strategies to process (max: 10) |
| `priority_level` | string | No | - | Filter by priority: "Critical", "High", "Medium", "Low" |
| `dry_run` | boolean | No | false | If true, only logs what would be processed |

---

## Monitoring

### Check Function Logs

**Via Dashboard:**
1. Supabase Dashboard → Edge Functions → batch-strategy-processor
2. Click **"Logs"** tab
3. See real-time processing logs

**Via CLI:**
```bash
supabase functions logs batch-strategy-processor \
  --project-ref vpysqshhafthuxvokwqj \
  --follow
```

### Check Strategy Status

```sql
SELECT 
  status,
  COUNT(*) as count,
  MAX(last_generation_attempt) as last_attempt
FROM content_strategy
WHERE site_id = 'homesimple'
GROUP BY status;
```

### Check Generated Articles

```sql
SELECT 
  id, title, city, state, vertical, status, created_at
FROM articles
WHERE site_id = 'homesimple'
  AND page_type = 'local_page'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### "Invalid API key" Error

- Verify service role key is correct
- Check key hasn't been rotated
- Ensure you're using `service_role` key, not `anon` key

### "No strategies found"

- Verify strategies exist with status "Planned"
- Check `site_id` matches
- Verify `priority_level` filter if used

### Function Timeout

- Process in smaller batches (limit: 3-5)
- Check function logs for specific errors
- Verify local facts are populated (prevents long AI calls)

### Strategies Stuck in "In Progress"

```sql
-- Reset stuck strategies
UPDATE content_strategy
SET status = 'Planned'
WHERE status = 'In Progress'
  AND last_generation_attempt < NOW() - INTERVAL '1 hour';
```

---

## Quick Reference

**Fastest Method**: Supabase Dashboard → Edge Functions → Invoke

**Most Automated**: Supabase CLI script

**Most Flexible**: curl with service key

**Best for Development**: JavaScript/Node.js integration

