/**
 * Supabase Edge Function: Senior Resource Crawler
 * 
 * Crawls senior living directory sites (Caring.com, A Place for Mom) to discover
 * and catalog senior living resources (assisted living, memory care, etc.)
 * 
 * Request Body:
 * {
 *   source: "caring.com" | "aplaceformom.com" | "both" (optional, default: "both")
 *   resource_type: "assisted-living" | "memory-care" | "independent-living" | "all" (optional, default: "all")
 *   state: "CA" | null (optional) - State filter
 *   max_resources: number (optional, default: 50)
 *   update_existing: boolean (optional, default: true)
 *   dry_run: boolean (optional, default: false)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   crawled: number
 *   stored: number
 *   updated: number
 *   errors: number
 *   results: Array<{
 *     resource_name: string
 *     resource_type: string
 *     location?: string
 *     status: 'success' | 'error' | 'skipped' | 'duplicate'
 *     error?: string
 *   }>
 *   timestamp: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlerRequest {
  source?: 'caring.com' | 'aplaceformom.com' | 'perplexity' | 'both' | 'all';
  resource_type?: 'assisted-living' | 'memory-care' | 'independent-living' | 'nursing-home' | 'in-home-care' | 'hospice' | 'all';
  state?: string;
  max_resources?: number;
  update_existing?: boolean;
  dry_run?: boolean;
  use_ai_extraction?: boolean; // Use AI to extract from directory pages
  use_ai_discovery?: boolean; // Use AI to discover additional resources
  use_ai_enrichment?: boolean; // Use AI to enrich resource data
}

interface CrawlerResponse {
  success: boolean;
  crawled: number;
  stored: number;
  updated: number;
  errors: number;
  results: Array<{
    resource_name: string;
    resource_type: string;
    location?: string;
    status: 'success' | 'error' | 'skipped' | 'duplicate';
    error?: string;
  }>;
  timestamp: string;
  error?: string;
}

// Senior care keywords to identify resource types
const RESOURCE_TYPE_KEYWORDS: Record<string, string[]> = {
  'assisted-living': ['assisted living', 'assisted care', 'residential care'],
  'memory-care': ['memory care', 'dementia care', 'alzheimer', 'memory support'],
  'independent-living': ['independent living', 'senior apartments', 'retirement community'],
  'nursing-home': ['nursing home', 'skilled nursing', 'long-term care facility'],
  'in-home-care': ['in-home care', 'home care', 'home health', 'homecare'],
  'hospice': ['hospice', 'end-of-life care', 'palliative care'],
};

// Extract resource type from content
function detectResourceType(content: string, title: string): string {
  const combined = `${title} ${content}`.toLowerCase();
  
  // Check each resource type
  for (const [type, keywords] of Object.entries(RESOURCE_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        return type;
      }
    }
  }
  
  return 'assisted-living'; // Default
}

// Normalize URL
function normalizeUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

// Fetch and parse directory page
async function fetchDirectoryPage(url: string): Promise<{ content: string; title: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SeniorSimpleBot/1.0; +https://seniorsimple.org/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { content: '', title: '', error: `HTTP ${response.status}` };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return { content: '', title: '', error: 'No response body' };
    }
    
    const decoder = new TextDecoder();
    let html = '';
    let totalSize = 0;
    const MAX_SIZE = 200000; // 200KB limit
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      totalSize += chunk.length;
      
      if (totalSize > MAX_SIZE) {
        const remaining = MAX_SIZE - (totalSize - chunk.length);
        html += chunk.substring(0, remaining);
        break;
      }
      
      html += chunk;
    }
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Extract text content
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    content = content.substring(0, 50000); // Limit to 50k chars
    html = ''; // Free memory
    
    return { content, title };
  } catch (error) {
    return { 
      content: '', 
      title: '', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Extract senior living resources from directory page using Perplexity AI
 */
async function extractResourcesWithPerplexity(
  url: string,
  resourceType: string,
  state?: string
): Promise<Array<Record<string, any>>> {
  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.log('Perplexity API key not configured, skipping AI extraction');
      return [];
    }
    
    const query = state
      ? `Extract all ${resourceType} facilities from ${url} in ${state}. Include name, address, city, state, zip code, phone number, website URL, description, amenities, care levels, pricing range, and whether they accept Medicare/Medicaid.`
      : `Extract all ${resourceType} facilities from ${url}. Include name, address, city, state, zip code, phone number, website URL, description, amenities, care levels, pricing range, and whether they accept Medicare/Medicaid.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a senior living research assistant. Extract senior living facility information from directory pages. Return structured JSON data in this format: [{"name": "Facility Name", "address": "123 Main St", "city": "City", "state": "CA", "zip_code": "12345", "phone": "+1-800-123-4567", "website_url": "https://...", "description": "...", "amenities": ["dining", "transportation"], "care_levels": ["minimal", "moderate"], "pricing_range": {"min": 2000, "max": 5000, "currency": "USD", "period": "monthly"}, "accepts_medicare": true, "accepts_medicaid": false}]. Only return valid JSON array, no other text.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      let errorText = '';
      let errorData: any = {};
      try {
        errorText = await response.text();
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { raw: errorText.substring(0, 500) };
          }
        }
      } catch (e) {
        errorText = `Failed to read error response: ${e}`;
      }
      const errorInfo = {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        body: errorText.substring(0, 500)
      };
      console.error('Perplexity API error (extraction):', errorInfo);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.warn('Perplexity returned empty content');
      return [];
    }
    
    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\[.*?\])\s*```/s);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find JSON array directly
      const arrayMatch = content.match(/\[.*?\]/s);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }
    
    try {
      const resources = JSON.parse(jsonStr);
      if (!Array.isArray(resources)) {
        console.warn('Perplexity response is not an array:', typeof resources);
        return [];
      }
      
      return resources.map((r: any) => ({
        name: r.name || 'Unknown Facility',
        resource_type: resourceType,
        address: r.address,
        city: r.city,
        state: r.state || state,
        zip_code: r.zip_code,
        phone: r.phone,
        website_url: r.website_url || r.website,
        email: r.email,
        description: r.description,
        amenities: r.amenities || [],
        care_levels: r.care_levels || [],
        pricing_range: r.pricing_range || null,
        accepts_medicare: r.accepts_medicare || null,
        accepts_medicaid: r.accepts_medicaid || null,
        accepts_insurance: r.accepts_insurance || null,
        research_source: 'perplexity',
        source_url: url,
      }));
    } catch (parseError) {
      console.error('Error parsing Perplexity extraction response:', parseError);
      console.error('Raw content that failed to parse:', content?.substring(0, 1000));
      // For extraction, we don't have DeepSeek/Google fallbacks since they're for discovery
      // Just return empty array and let the caller fall back to manual parsing
      console.log('⚠️  Perplexity extraction parsing failed, returning empty for manual parsing fallback');
      return [];
    }
  } catch (error) {
    console.error('Error extracting with Perplexity:', error);
    // For extraction, we don't have DeepSeek/Google fallbacks since they're for discovery
    // Just return empty array and let the caller fall back to manual parsing
    console.log('⚠️  Perplexity extraction failed, returning empty for manual parsing fallback');
    return [];
  }
}

/**
 * Discover senior living resources via DeepSeek AI (fallback)
 */
async function discoverResourcesWithDeepSeek(
  resourceType: string,
  state?: string
): Promise<Array<Record<string, any>>> {
  try {
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('DEEP_SEEK_API_KEY');
    if (!apiKey) {
      console.log('DeepSeek API key not configured, skipping DeepSeek discovery');
      return [];
    }
    
    const query = state
      ? `What are the best ${resourceType} facilities in ${state}? Include their names, addresses, cities, states, zip codes, phone numbers, website URLs, descriptions, amenities, care levels, pricing ranges, and whether they accept Medicare/Medicaid.`
      : `What are the best ${resourceType} facilities? Include their names, addresses, cities, states, zip codes, phone numbers, website URLs, descriptions, amenities, care levels, pricing ranges, and whether they accept Medicare/Medicaid.`;
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior living research assistant. Find and extract senior living facility information from web search results. Return structured JSON data in this format: [{"name": "Facility Name", "address": "123 Main St", "city": "City", "state": "CA", "zip_code": "12345", "phone": "+1-800-123-4567", "website_url": "https://...", "description": "...", "amenities": ["dining", "transportation"], "care_levels": ["minimal", "moderate"], "pricing_range": {"min": 2000, "max": 5000, "currency": "USD", "period": "monthly"}, "accepts_medicare": true, "accepts_medicaid": false}]. Only return valid JSON array, no other text. Include at least 10 facilities.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      let errorText = '';
      let errorData: any = {};
      try {
        errorText = await response.text();
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { raw: errorText.substring(0, 500) };
          }
        }
      } catch (e) {
        errorText = `Failed to read error response: ${e}`;
      }
      console.error('DeepSeek API error (discovery):', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        body: errorText.substring(0, 500)
      });
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.warn('DeepSeek returned empty content for discovery');
      return [];
    }
    
    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\[.*?\])\s*```/s);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const arrayMatch = content.match(/\[.*?\]/s);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }
    
    try {
      const resources = JSON.parse(jsonStr);
      if (!Array.isArray(resources)) {
        console.warn('DeepSeek discovery response is not an array:', typeof resources);
        return [];
      }
      
      return resources.map((r: any) => ({
        name: r.name || 'Unknown Facility',
        resource_type: resourceType,
        address: r.address,
        city: r.city,
        state: r.state || state,
        zip_code: r.zip_code,
        phone: r.phone,
        website_url: r.website_url || r.website,
        email: r.email,
        description: r.description,
        amenities: r.amenities || [],
        care_levels: r.care_levels || [],
        pricing_range: r.pricing_range || null,
        accepts_medicare: r.accepts_medicare || null,
        accepts_medicaid: r.accepts_medicaid || null,
        accepts_insurance: r.accepts_insurance || null,
        research_source: 'deepseek',
      }));
    } catch (parseError) {
      console.error('Error parsing DeepSeek discovery response:', parseError);
      console.error('Raw content that failed to parse:', content?.substring(0, 1000));
      throw new Error(`Failed to parse DeepSeek response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
  } catch (error) {
    console.error('Error discovering with DeepSeek:', error);
    throw error;
  }
}

/**
 * Discover senior living resources via Google Custom Search API (fallback)
 */
async function discoverResourcesWithGoogle(
  resourceType: string,
  state?: string
): Promise<Array<Record<string, any>>> {
  try {
    const apiKey = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API_KEY');
    const searchEngineId = Deno.env.get('GOOGLE_CUSTOM_SEARCH_ENGINE_ID');
    
    if (!apiKey || !searchEngineId) {
      console.log('Google Custom Search API not configured, skipping Google discovery');
      return [];
    }
    
    const query = state
      ? `${resourceType} facilities ${state} senior living`
      : `${resourceType} facilities senior living`;
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=10`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      let errorText = '';
      let errorData: any = {};
      try {
        errorText = await response.text();
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { raw: errorText.substring(0, 500) };
          }
        }
      } catch (e) {
        errorText = `Failed to read error response: ${e}`;
      }
      console.error('Google Custom Search API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        body: errorText.substring(0, 500)
      });
      throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn('Google Custom Search returned no results');
      return [];
    }
    
    // Convert Google search results to resource format
    // Note: Google results don't have structured data, so we extract what we can
    return data.items.map((item: any) => {
      // Try to extract location from snippet or title
      const locationMatch = item.snippet?.match(/([A-Z][a-z]+),\s*([A-Z]{2})/) || 
                           item.title?.match(/([A-Z][a-z]+),\s*([A-Z]{2})/);
      const city = locationMatch ? locationMatch[1] : undefined;
      const stateCode = locationMatch ? locationMatch[2] : state;
      
      return {
        name: item.title?.replace(/\s*-\s*.*$/, '') || 'Unknown Facility', // Remove trailing site name
        resource_type: resourceType,
        address: undefined, // Google results don't provide addresses
        city: city,
        state: stateCode,
        zip_code: undefined,
        phone: undefined,
        website_url: item.link,
        email: undefined,
        description: item.snippet,
        amenities: [],
        care_levels: [],
        pricing_range: null,
        accepts_medicare: null,
        accepts_medicaid: null,
        accepts_insurance: null,
        research_source: 'google',
      };
    });
  } catch (error) {
    console.error('Error discovering with Google:', error);
    throw error;
  }
}

/**
 * Discover senior living resources via Perplexity AI web search (with fallbacks)
 */
async function discoverResourcesWithPerplexity(
  resourceType: string,
  state?: string
): Promise<Array<Record<string, any>>> {
  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.log('Perplexity API key not configured, trying fallbacks...');
      // Try DeepSeek fallback
      try {
        return await discoverResourcesWithDeepSeek(resourceType, state);
      } catch (deepseekError) {
        console.log('DeepSeek fallback failed, trying Google...');
        // Try Google fallback
        return await discoverResourcesWithGoogle(resourceType, state);
      }
    }
    
    const query = state
      ? `What are the best ${resourceType} facilities in ${state}? Include their names, addresses, cities, states, zip codes, phone numbers, website URLs, descriptions, amenities, care levels, pricing ranges, and whether they accept Medicare/Medicaid.`
      : `What are the best ${resourceType} facilities? Include their names, addresses, cities, states, zip codes, phone numbers, website URLs, descriptions, amenities, care levels, pricing ranges, and whether they accept Medicare/Medicaid.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a senior living research assistant. Find and extract senior living facility information from web search results. Return structured JSON data in this format: [{"name": "Facility Name", "address": "123 Main St", "city": "City", "state": "CA", "zip_code": "12345", "phone": "+1-800-123-4567", "website_url": "https://...", "description": "...", "amenities": ["dining", "transportation"], "care_levels": ["minimal", "moderate"], "pricing_range": {"min": 2000, "max": 5000, "currency": "USD", "period": "monthly"}, "accepts_medicare": true, "accepts_medicaid": false}]. Only return valid JSON array, no other text. Include at least 10 facilities.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      let errorText = '';
      let errorData: any = {};
      try {
        errorText = await response.text();
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { raw: errorText.substring(0, 500) };
          }
        }
      } catch (e) {
        errorText = `Failed to read error response: ${e}`;
      }
      console.error('Perplexity API error (discovery):', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        body: errorText.substring(0, 500)
      });
      // Try fallback to DeepSeek
      console.log('⚠️  Perplexity API failed, trying DeepSeek fallback...');
      try {
        return await discoverResourcesWithDeepSeek(resourceType, state);
      } catch (deepseekError) {
        console.log('⚠️  DeepSeek fallback failed, trying Google...');
        // Try Google fallback
        return await discoverResourcesWithGoogle(resourceType, state);
      }
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      console.warn('Perplexity returned empty content, trying fallbacks...');
      // Try fallback to DeepSeek
      try {
        return await discoverResourcesWithDeepSeek(resourceType, state);
      } catch (deepseekError) {
        console.log('⚠️  DeepSeek fallback failed, trying Google...');
        // Try Google fallback
        return await discoverResourcesWithGoogle(resourceType, state);
      }
    }
    
    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\[.*?\])\s*```/s);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const arrayMatch = content.match(/\[.*?\]/s);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }
    
    try {
      const resources = JSON.parse(jsonStr);
      if (!Array.isArray(resources)) {
        console.warn('Perplexity discovery response is not an array, trying fallbacks...');
        // Try fallback to DeepSeek
        try {
          return await discoverResourcesWithDeepSeek(resourceType, state);
        } catch (deepseekError) {
          console.log('⚠️  DeepSeek fallback failed, trying Google...');
          // Try Google fallback
          return await discoverResourcesWithGoogle(resourceType, state);
        }
      }
      
      return resources.map((r: any) => ({
        name: r.name || 'Unknown Facility',
        resource_type: resourceType,
        address: r.address,
        city: r.city,
        state: r.state || state,
        zip_code: r.zip_code,
        phone: r.phone,
        website_url: r.website_url || r.website,
        email: r.email,
        description: r.description,
        amenities: r.amenities || [],
        care_levels: r.care_levels || [],
        pricing_range: r.pricing_range || null,
        accepts_medicare: r.accepts_medicare || null,
        accepts_medicaid: r.accepts_medicaid || null,
        accepts_insurance: r.accepts_insurance || null,
        research_source: 'perplexity',
      }));
    } catch (parseError) {
      console.error('Error parsing Perplexity discovery response:', parseError);
      console.error('Raw content that failed to parse:', content?.substring(0, 1000));
      // Try fallback to DeepSeek
      console.log('⚠️  Perplexity parsing failed, trying DeepSeek fallback...');
      try {
        return await discoverResourcesWithDeepSeek(resourceType, state);
      } catch (deepseekError) {
        console.log('⚠️  DeepSeek fallback failed, trying Google...');
        // Try Google fallback
        return await discoverResourcesWithGoogle(resourceType, state);
      }
    }
  } catch (error) {
    console.error('Error discovering with Perplexity:', error);
    // Try fallback to DeepSeek
    console.log('⚠️  Perplexity failed, trying DeepSeek fallback...');
    try {
      return await discoverResourcesWithDeepSeek(resourceType, state);
    } catch (deepseekError) {
      console.log('⚠️  DeepSeek fallback failed, trying Google...');
      // Try Google fallback
      try {
        return await discoverResourcesWithGoogle(resourceType, state);
      } catch (googleError) {
        // All fallbacks failed, re-throw original error
        throw error;
      }
    }
  }
}

/**
 * Enrich resource data from facility website using Perplexity AI
 */
async function enrichResourceWithPerplexity(
  resource: Record<string, any>
): Promise<Record<string, any>> {
  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey || !resource.website_url) {
      return resource;
    }
    
    const query = `Extract detailed information about the senior living facility at ${resource.website_url}. Include amenities, care levels, pricing information, whether they accept Medicare/Medicaid/insurance, services offered, and any other relevant details.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a senior living research assistant. Extract detailed facility information from websites. Return structured JSON data: {"amenities": ["dining", "transportation"], "care_levels": ["minimal", "moderate"], "pricing_range": {"min": 2000, "max": 5000, "currency": "USD", "period": "monthly"}, "accepts_medicare": true, "accepts_medicaid": false, "description": "...", "highlights": ["..."], "services": ["..."]}. Only return valid JSON, no other text.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      return resource;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      return resource;
    }
    
    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const objectMatch = content.match(/\{.*?\}/s);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }
    
    try {
      const enriched = JSON.parse(jsonStr);
      
      // Merge enriched data with existing resource
      return {
        ...resource,
        amenities: enriched.amenities || resource.amenities || [],
        care_levels: enriched.care_levels || resource.care_levels || [],
        pricing_range: enriched.pricing_range || resource.pricing_range,
        accepts_medicare: enriched.accepts_medicare ?? resource.accepts_medicare,
        accepts_medicaid: enriched.accepts_medicaid ?? resource.accepts_medicaid,
        accepts_insurance: enriched.accepts_insurance ?? resource.accepts_insurance,
        description: enriched.description || resource.description,
        highlights: enriched.highlights || resource.highlights || [],
      };
    } catch (parseError) {
      console.error('Error parsing Perplexity enrichment response:', parseError);
      return resource;
    }
  } catch (error) {
    console.error('Error enriching with Perplexity:', error);
    return resource;
  }
}

// Extract resource information from directory listing (fallback regex method)
function extractResourceInfo(html: string, source: string): Array<{
  name: string;
  resource_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  website_url?: string;
  description?: string;
  amenities?: string[];
}> {
  const resources: any[] = [];
  
  // Basic regex extraction as fallback
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const addressPattern = /(\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Circle|Cir)[^,]*,\s*([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5}))/gi;
  
  // This is a fallback - AI extraction is preferred
  return resources;
}

// Parse Caring.com directory page
async function parseCaringComDirectory(
  resourceType: string,
  state?: string,
  useAI: boolean = true
): Promise<Array<Record<string, any>>> {
  const resources: Record<string, any>[] = [];
  
  // Caring.com URL patterns
  const baseUrls: Record<string, string> = {
    'assisted-living': 'https://www.caring.com/senior-living/assisted-living',
    'memory-care': 'https://www.caring.com/senior-living/memory-care',
    'independent-living': 'https://www.caring.com/senior-living/independent-living',
    'nursing-home': 'https://www.caring.com/senior-living/nursing-homes',
    'in-home-care': 'https://www.caring.com/senior-care/in-home-care',
  };
  
  const url = state 
    ? `${baseUrls[resourceType]}/${state.toLowerCase()}`
    : baseUrls[resourceType] || baseUrls['assisted-living'];
  
  console.log(`📥 Fetching Caring.com directory: ${url}`);
  
  // Use AI extraction if enabled
  if (useAI) {
    console.log('🤖 Using Perplexity AI to extract resources...');
    try {
      const aiResources = await extractResourcesWithPerplexity(url, resourceType, state);
      if (aiResources.length > 0) {
        console.log(`✅ AI extracted ${aiResources.length} resources from Caring.com`);
        return aiResources;
      }
      console.log('⚠️  AI extraction returned no results, falling back to manual parsing');
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
      console.log('⚠️  Falling back to manual parsing');
    }
  }
  
  // Fallback to manual HTML parsing
  const { content, title, error } = await fetchDirectoryPage(url);
  
  if (error) {
    console.error(`❌ Error fetching Caring.com: ${error}`);
    return resources;
  }
  
  // Manual extraction (basic regex)
  const extracted = extractResourceInfo(content, 'caring.com');
  return extracted;
}

// Parse A Place for Mom directory page
async function parseAPlaceForMomDirectory(
  resourceType: string,
  state?: string,
  useAI: boolean = true
): Promise<Array<Record<string, any>>> {
  const resources: Record<string, any>[] = [];
  
  // A Place for Mom URL patterns
  const baseUrls: Record<string, string> = {
    'assisted-living': 'https://www.aplaceformom.com/assisted-living',
    'memory-care': 'https://www.aplaceformom.com/memory-care',
    'independent-living': 'https://www.aplaceformom.com/independent-living',
    'nursing-home': 'https://www.aplaceformom.com/nursing-homes',
    'in-home-care': 'https://www.aplaceformom.com/home-care',
  };
  
  const url = state
    ? `${baseUrls[resourceType]}/${state.toLowerCase()}`
    : baseUrls[resourceType] || baseUrls['assisted-living'];
  
  console.log(`📥 Fetching A Place for Mom directory: ${url}`);
  
  // Use AI extraction if enabled
  if (useAI) {
    console.log('🤖 Using Perplexity AI to extract resources...');
    try {
      const aiResources = await extractResourcesWithPerplexity(url, resourceType, state);
      if (aiResources.length > 0) {
        console.log(`✅ AI extracted ${aiResources.length} resources from A Place for Mom`);
        return aiResources;
      }
      console.log('⚠️  AI extraction returned no results, falling back to manual parsing');
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
      console.log('⚠️  Falling back to manual parsing');
    }
  }
  
  // Fallback to manual HTML parsing
  const { content, title, error } = await fetchDirectoryPage(url);
  
  if (error) {
    console.error(`❌ Error fetching A Place for Mom: ${error}`);
    return resources;
  }
  
  // Manual extraction (basic regex)
  const extracted = extractResourceInfo(content, 'aplaceformom.com');
  return extracted;
}

// Store resource in database
async function storeResource(
  supabase: any,
  resource: Record<string, any>,
  updateExisting: boolean,
  dryRun: boolean
): Promise<{ status: 'success' | 'error' | 'duplicate' | 'skipped'; error?: string }> {
  try {
    if (dryRun) {
      return { status: 'skipped' };
    }
    
    const slug = generateSlug(resource.name);
    
    // Check if exists
    const { data: existing } = await supabase
      .from('senior_resources')
      .select('id')
      .eq('site_id', 'seniorsimple')
      .eq('slug', slug)
      .single();
    
    if (existing && !updateExisting) {
      return { status: 'duplicate' };
    }
    
    const resourceData = {
      site_id: 'seniorsimple',
      name: resource.name,
      slug: slug,
      resource_type: resource.resource_type || 'assisted-living',
      description: resource.description,
      highlights: resource.highlights || [],
      address: resource.address,
      city: resource.city,
      state: resource.state,
      zip_code: resource.zip_code,
      phone: resource.phone,
      website_url: resource.website_url ? normalizeUrl(resource.website_url) : null,
      email: resource.email,
      care_levels: resource.care_levels || [],
      amenities: resource.amenities || [],
      pricing_range: resource.pricing_range || null,
      accepts_medicare: resource.accepts_medicare || null,
      accepts_medicaid: resource.accepts_medicaid || null,
      accepts_insurance: resource.accepts_insurance || null,
      research_source: resource.research_source || 'manual',
      source_url: resource.source_url,
      last_researched: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    if (existing && updateExisting) {
      const { error: updateError } = await supabase
        .from('senior_resources')
        .update(resourceData)
        .eq('id', existing.id);
      
      if (updateError) {
        return { status: 'error', error: updateError.message };
      }
      return { status: 'success' };
    } else {
      const { error: insertError } = await supabase
        .from('senior_resources')
        .insert([{
          ...resourceData,
          created_at: new Date().toISOString(),
        }]);
      
      if (insertError) {
        return { status: 'error', error: insertError.message };
      }
      return { status: 'success' };
    }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: CrawlerRequest = await req.json();
    
    const source = body.source || 'both';
    const resourceType = body.resource_type || 'all';
    const state = body.state || undefined;
    const maxResources = body.max_resources || 50;
    const updateExisting = body.update_existing !== false;
    const dryRun = body.dry_run || false;
    const useAIExtraction = body.use_ai_extraction !== false; // Default: true
    const useAIDiscovery = body.use_ai_discovery !== false; // Default: true
    const useAIEnrichment = body.use_ai_enrichment !== false; // Default: true
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const response: CrawlerResponse = {
      success: true,
      crawled: 0,
      stored: 0,
      updated: 0,
      errors: 0,
      results: [],
      timestamp: new Date().toISOString(),
    };
    
    // Determine resource types to crawl
    const resourceTypes = resourceType === 'all'
      ? ['assisted-living', 'memory-care', 'independent-living', 'nursing-home', 'in-home-care']
      : [resourceType];
    
    // Crawl each source
    for (const type of resourceTypes) {
      // Perplexity AI Discovery
      if ((source === 'perplexity' || source === 'both' || source === 'all') && useAIDiscovery) {
        console.log(`🤖 Discovering ${type} resources via Perplexity AI...`);
        let aiResources: Array<Record<string, any>> = [];
        try {
          aiResources = await discoverResourcesWithPerplexity(type, state);
          console.log(`✅ Discovered ${aiResources.length} ${type} resources via Perplexity`);
        } catch (error) {
          console.error(`❌ Error discovering ${type} resources:`, error);
          response.results.push({
            resource_name: `Error discovering ${type}`,
            resource_type: type,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          response.errors++;
        }
        response.crawled += aiResources.length;
        
        for (const resource of aiResources.slice(0, maxResources)) {
          // Enrich with AI if enabled
          const enrichedResource = useAIEnrichment && resource.website_url
            ? await enrichResourceWithPerplexity(resource)
            : resource;
          
          const result = await storeResource(supabase, enrichedResource, updateExisting, dryRun);
          
          response.results.push({
            resource_name: enrichedResource.name,
            resource_type: type,
            location: enrichedResource.city ? `${enrichedResource.city}, ${enrichedResource.state}` : undefined,
            status: result.status,
            error: result.error,
          });
          
          if (result.status === 'success') {
            response.stored++;
          } else if (result.status === 'error') {
            response.errors++;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Caring.com
      if (source === 'caring.com' || source === 'both' || source === 'all') {
        let resources: Array<Record<string, any>> = [];
        try {
          resources = await parseCaringComDirectory(type, state, useAIExtraction);
          console.log(`✅ Parsed ${resources.length} ${type} resources from Caring.com`);
        } catch (error) {
          console.error(`❌ Error parsing Caring.com for ${type}:`, error);
          response.results.push({
            resource_name: `Error parsing Caring.com ${type}`,
            resource_type: type,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          response.errors++;
        }
        response.crawled += resources.length;
        
        for (const resource of resources.slice(0, maxResources)) {
          resource.resource_type = type;
          resource.research_source = 'caring.com';
          
          // Enrich with AI if enabled
          const enrichedResource = useAIEnrichment && resource.website_url
            ? await enrichResourceWithPerplexity(resource)
            : resource;
          
          const result = await storeResource(supabase, enrichedResource, updateExisting, dryRun);
          
          response.results.push({
            resource_name: enrichedResource.name,
            resource_type: type,
            location: enrichedResource.city ? `${enrichedResource.city}, ${enrichedResource.state}` : undefined,
            status: result.status,
            error: result.error,
          });
          
          if (result.status === 'success') {
            response.stored++;
          } else if (result.status === 'error') {
            response.errors++;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // A Place for Mom
      if (source === 'aplaceformom.com' || source === 'both' || source === 'all') {
        let resources: Array<Record<string, any>> = [];
        try {
          resources = await parseAPlaceForMomDirectory(type, state, useAIExtraction);
          console.log(`✅ Parsed ${resources.length} ${type} resources from A Place for Mom`);
        } catch (error) {
          console.error(`❌ Error parsing A Place for Mom for ${type}:`, error);
          response.results.push({
            resource_name: `Error parsing A Place for Mom ${type}`,
            resource_type: type,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          response.errors++;
        }
        response.crawled += resources.length;
        
        for (const resource of resources.slice(0, maxResources)) {
          resource.resource_type = type;
          resource.research_source = 'aplaceformom.com';
          
          // Enrich with AI if enabled
          const enrichedResource = useAIEnrichment && resource.website_url
            ? await enrichResourceWithPerplexity(resource)
            : resource;
          
          const result = await storeResource(supabase, enrichedResource, updateExisting, dryRun);
          
          response.results.push({
            resource_name: enrichedResource.name,
            resource_type: type,
            location: enrichedResource.city ? `${enrichedResource.city}, ${enrichedResource.state}` : undefined,
            status: result.status,
            error: result.error,
          });
          
          if (result.status === 'success') {
            response.stored++;
          } else if (result.status === 'error') {
            response.errors++;
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

