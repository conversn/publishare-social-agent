# Senior Living Resource Crawler - AI Integration

## Overview

The senior resource crawler now uses **Perplexity AI** to extract, discover, and enrich senior living resource data, matching the capabilities of the lender research functions.

---

## AI-Powered Features

### 1. AI Extraction (`extractResourcesWithPerplexity`)

**Purpose:** Extract structured data from directory pages (Caring.com, A Place for Mom)

**How It Works:**
- Sends directory page URL to Perplexity AI
- AI analyzes the page and extracts facility information
- Returns structured JSON with all resource data

**Extracted Data:**
- Name, address, city, state, zip code
- Phone number, website URL, email
- Description, amenities, care levels
- Pricing range, Medicare/Medicaid acceptance

**Example:**
```typescript
const resources = await extractResourcesWithPerplexity(
  'https://www.caring.com/senior-living/assisted-living/california',
  'assisted-living',
  'CA'
);
```

### 2. AI Discovery (`discoverResourcesWithPerplexity`)

**Purpose:** Discover senior living resources via web search

**How It Works:**
- Sends search query to Perplexity AI
- AI searches the web for facilities
- Returns structured JSON with discovered resources

**Query Examples:**
- "What are the best assisted living facilities in California?"
- "What are the best memory care facilities?"

**Example:**
```typescript
const resources = await discoverResourcesWithPerplexity(
  'assisted-living',
  'CA'
);
```

### 3. AI Enrichment (`enrichResourceWithPerplexity`)

**Purpose:** Enrich resource data from facility websites

**How It Works:**
- Sends facility website URL to Perplexity AI
- AI analyzes the website and extracts detailed information
- Merges enriched data with existing resource data

**Enriched Data:**
- Detailed amenities list
- Care levels offered
- Pricing information
- Medicare/Medicaid/insurance acceptance
- Services offered
- Highlights and descriptions

**Example:**
```typescript
const enriched = await enrichResourceWithPerplexity({
  name: 'Sunset Senior Living',
  website_url: 'https://sunset-senior-living.com',
  // ... other fields
});
```

---

## Request Options

### AI Control Flags

```json
{
  "use_ai_extraction": true,   // Use AI to extract from directory pages (default: true)
  "use_ai_discovery": true,    // Use AI to discover resources via web search (default: true)
  "use_ai_enrichment": true    // Use AI to enrich resource data from websites (default: true)
}
```

### Source Options

```json
{
  "source": "perplexity"        // AI discovery only
  "source": "caring.com"         // Directory with AI extraction
  "source": "aplaceformom.com"  // Directory with AI extraction
  "source": "both"              // Both directories with AI extraction
  "source": "all"               // All sources (directories + AI discovery)
}
```

---

## Usage Examples

### Example 1: AI Discovery Only

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-crawler' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "perplexity",
    "resource_type": "assisted-living",
    "state": "CA",
    "max_resources": 20,
    "use_ai_discovery": true
  }'
```

### Example 2: Directory Extraction with AI

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-crawler' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "caring.com",
    "resource_type": "memory-care",
    "state": "CA",
    "max_resources": 50,
    "use_ai_extraction": true,
    "use_ai_enrichment": true
  }'
```

### Example 3: All Sources with Full AI

```bash
curl -X POST 'https://vpysqshhafthuxvokwqj.supabase.co/functions/v1/senior-resource-crawler' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "all",
    "resource_type": "all",
    "max_resources": 100,
    "use_ai_extraction": true,
    "use_ai_discovery": true,
    "use_ai_enrichment": true
  }'
```

---

## Configuration

### Environment Variables

Set in Supabase Edge Function secrets:

```bash
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### Perplexity Model

The crawler uses:
- **Model:** `llama-3.1-sonar-large-128k-online`
- **Temperature:** `0.1` (for consistent, structured output)
- **Max Tokens:** `2000-4000` (depending on function)

---

## Response Format

```json
{
  "success": true,
  "crawled": 25,
  "stored": 23,
  "updated": 2,
  "errors": 0,
  "results": [
    {
      "resource_name": "Sunset Senior Living",
      "resource_type": "assisted-living",
      "location": "Los Angeles, CA",
      "status": "success"
    }
  ],
  "timestamp": "2025-12-10T12:00:00.000Z"
}
```

---

## Benefits of AI Integration

### 1. **No Manual HTML Parsing**
- AI handles complex page structures automatically
- Works even when page structure changes
- No need to maintain regex patterns

### 2. **Better Data Quality**
- AI extracts structured data consistently
- Handles edge cases and variations
- Validates and normalizes data

### 3. **Discovery Beyond Directories**
- Finds resources not listed in directories
- Discovers new facilities via web search
- Expands coverage beyond known sources

### 4. **Rich Data Extraction**
- Extracts amenities, pricing, care levels
- Understands context and relationships
- Provides detailed descriptions

### 5. **Automatic Enrichment**
- Enriches basic listings with detailed data
- Extracts information from facility websites
- Fills in missing fields automatically

---

## Rate Limiting

The crawler includes rate limiting to respect API limits:

- **AI Discovery:** 1 second delay between requests
- **AI Extraction:** 500ms delay between requests
- **AI Enrichment:** 1 second delay between requests

---

## Error Handling

- If Perplexity API key is not configured, functions gracefully fall back to manual parsing
- If AI extraction fails, falls back to regex-based extraction
- All errors are logged and included in response

---

## Comparison with Lender Functions

| Feature | Lender Functions | Senior Resource Functions |
|---------|------------------|--------------------------|
| AI Discovery | ✅ Perplexity | ✅ Perplexity |
| AI Extraction | ✅ Perplexity | ✅ Perplexity |
| AI Enrichment | ✅ Website crawling | ✅ Perplexity |
| Structured Output | ✅ JSON | ✅ JSON |
| Rate Limiting | ✅ Yes | ✅ Yes |
| Error Handling | ✅ Yes | ✅ Yes |

**Status:** ✅ **Fully AI-Powered** - Matches lender function capabilities

---

## Next Steps

1. ✅ AI integration complete
2. Deploy function to Supabase
3. Set `PERPLEXITY_API_KEY` in Edge Function secrets
4. Test with sample requests
5. Monitor API usage and costs





