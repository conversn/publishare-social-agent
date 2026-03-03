/**
 * Supabase Edge Function: Lender Website Crawler
 * 
 * Smart agent that crawls lender websites to find and update information.
 * Specifically looks for business lending information and other public data.
 * 
 * Request Body:
 * {
 *   lender_id?: string (optional) - UUID of specific lender to crawl
 *   site_id?: string (optional, default: 'rateroots') - Site ID filter
 *   crawl_all?: boolean (optional, default: false) - Crawl all lenders
 *   max_lenders?: number (optional, default: 10) - Max lenders to crawl per run
 *   focus_business_lending?: boolean (optional, default: true) - Focus on business lending info
 *   update_existing?: boolean (optional, default: true) - Update existing data
 *   dry_run?: boolean (optional, default: false) - Test without updating database
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   crawled: number - Number of lenders crawled
 *   updated: number - Number of lenders updated
 *   found_business_lending: number - Number with business lending info found
 *   errors: number - Number of errors
 *   results: Array<{
 *     lender_id: string
 *     lender_name: string
 *     website_url?: string
 *     found_data: {
 *       business_lending?: boolean
 *       business_loan_types?: string[]
 *       public_info?: object
 *       updated_fields?: string[]
 *     }
 *     status: 'success' | 'error' | 'no_website' | 'blocked'
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
  lender_id?: string;
  site_id?: string;
  crawl_all?: boolean;
  max_lenders?: number;
  focus_business_lending?: boolean;
  update_existing?: boolean;
  dry_run?: boolean;
  auto_correct_urls?: boolean; // Search Google for invalid URLs
}

interface CrawlerResponse {
  success: boolean;
  crawled: number;
  updated: number;
  found_business_lending: number;
  errors: number;
  url_corrected: number; // Number of URLs corrected via Google search
  results: Array<{
    lender_id: string;
    lender_name: string;
    website_url?: string;
    found_data: {
      business_lending?: boolean;
      business_loan_types?: string[];
      public_info?: Record<string, any>;
      updated_fields?: string[];
    };
    status: 'success' | 'error' | 'no_website' | 'blocked' | 'skipped';
    error?: string;
    url_corrected?: boolean; // Whether URL was corrected via Google search
    original_url?: string; // Original invalid URL
  }>;
  timestamp: string;
  error?: string;
  report?: string; // Human-readable report
}

// Business lending keywords to search for
const BUSINESS_LENDING_KEYWORDS = [
  'business loan',
  'commercial loan',
  'SBA loan',
  'small business',
  'business financing',
  'commercial mortgage',
  'business credit',
  'equipment financing',
  'working capital',
  'business line of credit',
  'invoice factoring',
  'merchant cash advance',
  'business term loan',
];

// Extract website URL from lender data
function extractWebsiteUrl(lender: any): string | null {
  // Check website_url column first
  if (lender.website_url) return lender.website_url;
  
  // Check internal_notes JSONB
  if (lender.internal_notes) {
    try {
      const notes = typeof lender.internal_notes === 'string' 
        ? JSON.parse(lender.internal_notes) 
        : lender.internal_notes;
      if (notes?.website_url) return notes.website_url;
      if (notes?.website) return notes.website;
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  // Try to construct from lender name (clean first)
  if (lender.name) {
    // Clean name - remove bracket notation and parenthetical info
    const cleanName = lender.name
      .replace(/\[[^\]]+\]/g, '') // Remove bracket notation
      .replace(/\([^)]*\)/g, '') // Remove parenthetical info
      .trim();
    
    // Common patterns: "Lender Name" -> "lendername.com" or "lender-name.com"
    const domain = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/inc|llc|corp|mortgage|lending|funding|financial|group/gi, '')
      .trim();
    
    // Try common TLDs
    const commonTlds = ['.com', '.net', '.org'];
    for (const tld of commonTlds) {
      const potentialUrl = `https://www.${domain}${tld}`;
      // We'll try to fetch and see if it exists
      return potentialUrl;
    }
  }
  
  return null;
}

// Normalize URL
function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Fetch and parse website content
async function fetchWebsiteContent(url: string): Promise<{ content: string; title: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RateRootsBot/1.0; +https://rateroots.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { content: '', title: '', error: `HTTP ${response.status}` };
    }

    // Stream response to limit memory usage
    const reader = response.body?.getReader();
    if (!reader) {
      return { content: '', title: '', error: 'No response body' };
    }
    
    const decoder = new TextDecoder();
    let html = '';
    let totalSize = 0;
    const MAX_SIZE = 150000; // Limit to 150KB to prevent memory issues
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      totalSize += chunk.length;
      
      if (totalSize > MAX_SIZE) {
        // Truncate if too large
        const remaining = MAX_SIZE - (totalSize - chunk.length);
        html += chunk.substring(0, remaining);
        break;
      }
      
      html += chunk;
    }
    
    // Extract title first (before processing full HTML)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract text content (simple extraction, remove scripts and styles)
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Limit content size to reduce memory
    content = content.substring(0, 25000); // Limit to 25k chars
    
    // Clear HTML to free memory immediately
    html = '';

    return { content, title };
  } catch (error) {
    return { 
      content: '', 
      title: '', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Check if content mentions business lending
function detectBusinessLending(content: string, title: string): {
  hasBusinessLending: boolean;
  loanTypes: string[];
  confidence: number;
} {
  const fullText = `${title} ${content}`.toLowerCase();
  const foundLoanTypes: string[] = [];
  let matches = 0;

  for (const keyword of BUSINESS_LENDING_KEYWORDS) {
    if (fullText.includes(keyword.toLowerCase())) {
      matches++;
      // Extract loan type
      const loanType = keyword
        .replace(/loan|financing|credit|mortgage/gi, '')
        .trim();
      if (loanType && !foundLoanTypes.includes(loanType)) {
        foundLoanTypes.push(loanType);
      }
    }
  }

  // Calculate confidence based on number of matches
  const confidence = Math.min(matches / BUSINESS_LENDING_KEYWORDS.length, 1);

  return {
    hasBusinessLending: matches > 0,
    loanTypes: foundLoanTypes,
    confidence,
  };
}

// Extract public information from website
function extractPublicInfo(content: string, title: string, url: string): Record<string, any> {
  const info: Record<string, any> = {
    website_title: title,
    website_url: url,
    last_crawled: new Date().toISOString(),
  };

  // Extract phone numbers
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = content.match(phoneRegex);
  if (phones && phones.length > 0) {
    info.phone_numbers = [...new Set(phones)].slice(0, 3); // Max 3 unique
  }

  // Extract email addresses
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
  const emails = content.match(emailRegex);
  if (emails && emails.length > 0) {
    info.email_addresses = [...new Set(emails)].slice(0, 3); // Max 3 unique
  }

  // Extract states mentioned
  const stateRegex = /\b([A-Z]{2})\b/g;
  const states = content.match(stateRegex);
  if (states) {
    const stateCodes = [...new Set(states)].filter(s => 
      ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'].includes(s)
    );
    if (stateCodes.length > 0) {
      info.states_mentioned = stateCodes.slice(0, 10); // Max 10
    }
  }

  // Extract key phrases about services
  const servicePhrases = [
    'residential mortgage',
    'refinance',
    'home purchase',
    'FHA',
    'VA',
    'USDA',
    'conventional',
    'jumbo',
    'non-QM',
    'DSCR',
    'investment property',
  ];

  const foundServices: string[] = [];
  for (const phrase of servicePhrases) {
    if (content.toLowerCase().includes(phrase.toLowerCase())) {
      foundServices.push(phrase);
    }
  }
  if (foundServices.length > 0) {
    info.services_mentioned = foundServices;
  }

  return info;
}

// Crawl a single lender website
async function crawlLenderWebsite(
  lender: any,
  focusBusinessLending: boolean,
  updateExisting: boolean,
  dryRun: boolean,
  supabase: any,
  autoCorrectUrls: boolean = false
): Promise<{
  lender_id: string;
  lender_name: string;
  website_url?: string;
  found_data: any;
  status: 'success' | 'error' | 'no_website' | 'blocked' | 'skipped';
  error?: string;
  url_corrected?: boolean;
  original_url?: string;
}> {
  const result: any = {
    lender_id: lender.id,
    lender_name: lender.name,
    found_data: {},
    status: 'skipped' as const,
  };

  try {
    // Extract website URL
    const websiteUrl = extractWebsiteUrl(lender);
    if (!websiteUrl) {
      result.status = 'no_website';
      return result;
    }

    const normalizedUrl = normalizeUrl(websiteUrl);
    result.website_url = normalizedUrl;
    result.original_url = normalizedUrl;

    // Fetch website content
    const { content, title, error: fetchError } = await fetchWebsiteContent(normalizedUrl);
    
    // If fetch failed and auto-correct is enabled, try to find correct URL via Google
    if (fetchError && autoCorrectUrls) {
      // Check if error is DNS-related or connection-related (likely invalid URL)
      const isUrlError = fetchError.includes('dns error') || 
                        fetchError.includes('failed to lookup') ||
                        fetchError.includes('invalid peer certificate') ||
                        fetchError.includes('Connection') ||
                        fetchError.includes('Name or service not known');
      
      if (isUrlError) {
        console.log(`🔍 Attempting to correct invalid URL for ${lender.name}`);
        const correction = await correctLenderUrl(lender, supabase);
        
        if (correction.corrected && correction.newUrl) {
          result.url_corrected = true;
          result.website_url = correction.newUrl;
          
          // Retry with corrected URL
          const retryResult = await fetchWebsiteContent(correction.newUrl);
          
          if (retryResult.error) {
            result.status = 'error';
            result.error = `URL corrected but still failed: ${retryResult.error}`;
            return result;
          }
          
          // Continue with corrected URL
          const { content: newContent, title: newTitle } = retryResult;
          if (!newContent || newContent.length < 100) {
            result.status = 'error';
            result.error = 'URL corrected but no content retrieved';
            return result;
          }
          
          // Use corrected content
          const publicInfo = extractPublicInfo(newContent, newTitle, correction.newUrl);
          
          // Check for business lending
          const businessLending = focusBusinessLending 
            ? detectBusinessLending(newContent, newTitle)
            : { hasBusinessLending: false, loanTypes: [], confidence: 0 };

          // Build update data
          const updateData: Record<string, any> = {};
          const updatedFields: string[] = [];

          // Update special_features with website info
          const currentFeatures = lender.special_features || {};
          const updatedFeatures = {
            ...currentFeatures,
            website_info: {
              url: correction.newUrl,
              title: publicInfo.website_title,
              last_crawled: publicInfo.last_crawled,
              url_corrected: true,
              original_url: normalizedUrl,
            },
          };
          updateData.special_features = updatedFeatures;
          updatedFields.push('special_features');

          // Add business lending info if found
          if (businessLending.hasBusinessLending) {
            updatedFeatures.business_lending = {
              available: true,
              loan_types: businessLending.loanTypes,
              confidence: businessLending.confidence,
              detected_at: new Date().toISOString(),
              details: {},
              requirements: {},
              source: 'website_crawl',
              last_verified: new Date().toISOString(),
            };
            updatedFields.push('business_lending');
          }

          // Update internal_notes with public contact info
          if (publicInfo.phone_numbers || publicInfo.email_addresses) {
            const currentNotes = typeof lender.internal_notes === 'string'
              ? JSON.parse(lender.internal_notes || '{}')
              : (lender.internal_notes || {});
            
            const updatedNotes = {
              ...currentNotes,
              public_contact_info: {
                phones: publicInfo.phone_numbers || [],
                emails: publicInfo.email_addresses || [],
                source: 'website_crawl',
                crawled_at: new Date().toISOString(),
              },
            };
            updateData.internal_notes = JSON.stringify(updatedNotes);
            updatedFields.push('internal_notes');
          }

          // Update states if found
          if (publicInfo.states_mentioned && (!lender.states_available || lender.states_available.length === 0)) {
            updateData.states_available = publicInfo.states_mentioned;
            updatedFields.push('states_available');
          }

          result.found_data = {
            business_lending: businessLending.hasBusinessLending,
            business_loan_types: businessLending.loanTypes,
            public_info: {
              website_title: publicInfo.website_title,
              services_mentioned: publicInfo.services_mentioned,
              states_mentioned: publicInfo.states_mentioned,
            },
            updated_fields: updatedFields,
          };

          // Update database if not dry run
          if (!dryRun && updateExisting && updatedFields.length > 0) {
            const { error: updateError } = await supabase
              .from('lenders')
              .update(updateData)
              .eq('id', lender.id);

            if (updateError) {
              result.status = 'error';
              result.error = updateError.message;
              return result;
            }
          }

          result.status = 'success';
          return result;
        } else {
          // URL correction failed
          result.status = 'error';
          result.error = `Original error: ${fetchError}. Correction attempt: ${correction.error || 'No URL found'}`;
          return result;
        }
      }
    }
    
    if (fetchError) {
      result.status = 'error';
      result.error = fetchError;
      return result;
    }

    if (!content || content.length < 100) {
      result.status = 'error';
      result.error = 'No content retrieved';
      return result;
    }

    // Extract information
    const publicInfo = extractPublicInfo(content, title, normalizedUrl);
    
    // Check for business lending
    const businessLending = focusBusinessLending 
      ? detectBusinessLending(content, title)
      : { hasBusinessLending: false, loanTypes: [], confidence: 0 };

    // Build update data
    const updateData: Record<string, any> = {};
    const updatedFields: string[] = [];

    // Update special_features with website info
    const currentFeatures = lender.special_features || {};
    const updatedFeatures = {
      ...currentFeatures,
      website_info: {
        url: normalizedUrl,
        title: publicInfo.website_title,
        last_crawled: publicInfo.last_crawled,
      },
    };
    updateData.special_features = updatedFeatures;
    updatedFields.push('special_features');

    // Add business lending info if found (structured JSONB format)
    if (businessLending.hasBusinessLending) {
      updatedFeatures.business_lending = {
        available: true,
        loan_types: businessLending.loanTypes,
        confidence: businessLending.confidence,
        detected_at: new Date().toISOString(),
        details: {}, // Will be populated as more details are discovered
        requirements: {}, // Will be populated as requirements are discovered
        source: 'website_crawl',
        last_verified: new Date().toISOString(),
      };
      updatedFields.push('business_lending');
    }

    // Update internal_notes with public contact info (gated)
    if (publicInfo.phone_numbers || publicInfo.email_addresses) {
      const currentNotes = typeof lender.internal_notes === 'string'
        ? JSON.parse(lender.internal_notes || '{}')
        : (lender.internal_notes || {});
      
      const updatedNotes = {
        ...currentNotes,
        public_contact_info: {
          phones: publicInfo.phone_numbers || [],
          emails: publicInfo.email_addresses || [],
          source: 'website_crawl',
          crawled_at: new Date().toISOString(),
        },
      };
      updateData.internal_notes = JSON.stringify(updatedNotes);
      updatedFields.push('internal_notes');
    }

    // Update states if found and not already set
    if (publicInfo.states_mentioned && (!lender.states_available || lender.states_available.length === 0)) {
      updateData.states_available = publicInfo.states_mentioned;
      updatedFields.push('states_available');
    }

    result.found_data = {
      business_lending: businessLending.hasBusinessLending,
      business_loan_types: businessLending.loanTypes,
      public_info: {
        website_title: publicInfo.website_title,
        services_mentioned: publicInfo.services_mentioned,
        states_mentioned: publicInfo.states_mentioned,
      },
      updated_fields: updatedFields,
    };

    // Update database if not dry run
    if (!dryRun && updateExisting && updatedFields.length > 0) {
      const { error: updateError } = await supabase
        .from('lenders')
        .update(updateData)
        .eq('id', lender.id);

      if (updateError) {
        result.status = 'error';
        result.error = updateError.message;
        return result;
      }
    }

    result.status = 'success';
    return result;
  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

// ========================================
// GOOGLE SEARCH FOR URL CORRECTION
// ========================================

/**
 * Generate JWT token for service account authentication
 */
async function generateServiceAccountToken(serviceAccountJson: any): Promise<string | null> {
  try {
    // Import crypto for JWT signing
    const encoder = new TextEncoder();
    
    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };
    
    // Create JWT claim set
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceAccountJson.client_email,
      scope: 'https://www.googleapis.com/auth/cse',
      aud: serviceAccountJson.token_uri,
      exp: now + 3600, // 1 hour
      iat: now,
    };
    
    // For Deno, we'll use a simpler approach: fetch with service account
    // Note: Full JWT signing requires crypto libraries that may not be available in Deno
    // For now, we'll use the service account email to identify, but API key is still needed
    
    return null; // Service account JWT generation requires additional libraries
  } catch (error) {
    console.error('Error generating service account token:', error);
    return null;
  }
}

/**
 * Generate name variations for better search results
 */
function generateNameVariations(lenderName: string): string[] {
  const variations: string[] = [];
  const cleaned = lenderName
    .replace(/\[[^\]]+\]/g, '') // Remove bracket notation
    .replace(/\([^)]*\)/g, '') // Remove parenthetical info
    .replace(/\s+/g, ' ')
    .trim();
  
  // Original cleaned name
  variations.push(cleaned);
  
  // Remove common suffixes
  const withoutSuffixes = cleaned
    .replace(/\s+(Mortgage|Lending|Financial|Bank|Credit|Union|FCU|CU)$/i, '')
    .trim();
  if (withoutSuffixes !== cleaned && withoutSuffixes.length > 0) {
    variations.push(withoutSuffixes);
  }
  
  // Add "Mortgage" if not present
  if (!cleaned.toLowerCase().includes('mortgage')) {
    variations.push(`${cleaned} Mortgage`);
    if (withoutSuffixes !== cleaned) {
      variations.push(`${withoutSuffixes} Mortgage`);
    }
  }
  
  // Add "Lending" if not present
  if (!cleaned.toLowerCase().includes('lending')) {
    variations.push(`${cleaned} Lending`);
    if (withoutSuffixes !== cleaned) {
      variations.push(`${withoutSuffixes} Lending`);
    }
  }
  
  // Extract first significant word (for acronyms/abbreviations)
  const words = cleaned.split(/\s+/);
  if (words.length > 1) {
    const firstWord = words[0];
    if (firstWord.length <= 5 && /^[A-Z]+$/.test(firstWord)) {
      // Likely an acronym
      variations.push(firstWord);
    }
  }
  
  // Remove common prefixes
  const withoutPrefixes = cleaned
    .replace(/^(The|A|An)\s+/i, '')
    .trim();
  if (withoutPrefixes !== cleaned && withoutPrefixes.length > 0) {
    variations.push(withoutPrefixes);
  }
  
  // Return unique variations
  return [...new Set(variations)].filter(v => v.length > 0);
}

/**
 * Search Google for lender website URL with name variations
 * Uses Google Custom Search API if available, otherwise falls back to scraping
 * Supports both API key and service account authentication
 */
async function searchGoogleForLenderUrl(
  lenderName: string,
  useCustomSearch: boolean = false,
  tryVariations: boolean = true
): Promise<string | null> {
  try {
    // Generate name variations if enabled
    const searchNames = tryVariations ? generateNameVariations(lenderName) : [lenderName];
    
    // Try Google Custom Search API first if configured
    if (useCustomSearch) {
      // Method 1: API Key (simplest, recommended)
      const apiKey = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API_KEY');
      const searchEngineId = Deno.env.get('GOOGLE_CUSTOM_SEARCH_ENGINE_ID');
      
      if (apiKey && searchEngineId) {
        // Try each name variation
        for (const name of searchNames) {
          const queries = [
            `${name} mortgage website`,
            `${name} official website`,
            `${name} home page`,
            `site:${name.toLowerCase().replace(/\s+/g, '')}.com`,
          ];
          
          for (const queryText of queries) {
            const query = encodeURIComponent(queryText);
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${query}&num=5`;
            
            try {
              const response = await fetch(url);
              if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                  // Filter results
                  for (const item of data.items) {
                    const foundUrl = item.link;
                    // Reject PDFs and documents
                    if (foundUrl.match(/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz)$/i)) continue;
                    if (foundUrl.includes('/downloads/') || foundUrl.includes('/files/') || foundUrl.includes('/uploads/')) continue;
                    // Reject social media
                    if (foundUrl.includes('facebook.com') || foundUrl.includes('linkedin.com') || foundUrl.includes('twitter.com')) continue;
                    // Accept if looks like a website
                    if (foundUrl.includes('.com') || foundUrl.includes('.net') || foundUrl.includes('.org')) {
                      console.log(`✅ Found URL with variation "${name}" and query "${queryText}"`);
                      return foundUrl;
                    }
                  }
                }
              } else {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.error?.code !== 429) { // Don't log rate limit errors for each attempt
                  console.error('Custom Search API error:', errorData);
                }
              }
            } catch (error) {
              console.error(`Error searching with "${queryText}":`, error);
            }
            
            // Small delay between queries
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      // Method 2: Service Account (if API key not available)
      // Note: Custom Search API typically requires API key, but we can try service account
      // if the service account has been granted access
      const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
      if (!apiKey && serviceAccountJson && searchEngineId) {
        try {
          const serviceAccount = JSON.parse(serviceAccountJson);
          
          // For Custom Search API, we still need an API key, but we can use
          // the service account's project to get one, or use the service account
          // email as identifier if the API supports it
          
          // Alternative: Use the service account to access other Google APIs
          // that might help find the website (like Places API, etc.)
          
          console.log('Service account detected, but Custom Search API requires API key');
          // Fall through to scraping method
        } catch (e) {
          console.error('Error parsing service account JSON:', e);
        }
      }
    }
    
    // Fallback: Simple Google search scraping with variations
    // Note: This is a basic approach and may be rate-limited by Google
    for (const name of searchNames.slice(0, 3)) { // Limit to first 3 variations for scraping
      const query = encodeURIComponent(`${name} mortgage website`);
      const googleUrl = `https://www.google.com/search?q=${query}&num=5`;
    
    // Use a user agent to avoid being blocked
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    // Stream and limit HTML size
    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }
    
    const decoder = new TextDecoder();
    let html = '';
    let totalSize = 0;
    const MAX_SIZE = 100000; // Limit to 100KB
    
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
    
    // Parse HTML to extract search result URLs (using regex, not DOM)
    const urlPattern = /<a[^>]+href="\/url\?q=([^"&]+)/g;
    const matches: string[] = [];
    let match;
    
    while ((match = urlPattern.exec(html)) !== null && matches.length < 5) {
      const foundUrl = decodeURIComponent(match[1]);
      // Filter out Google's own pages, social media, and document files
      if (
        !foundUrl.includes('google.com') &&
        !foundUrl.includes('youtube.com') &&
        !foundUrl.includes('facebook.com') &&
        !foundUrl.includes('linkedin.com') &&
        !foundUrl.includes('twitter.com') &&
        !foundUrl.match(/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz)$/i) && // Reject document files
        !foundUrl.includes('/downloads/') &&
        !foundUrl.includes('/files/') &&
        !foundUrl.includes('/uploads/') &&
        (foundUrl.includes('mortgage') || 
         foundUrl.includes('lending') || 
         foundUrl.includes('financial') ||
         foundUrl.includes('bank') ||
         foundUrl.includes('credit') ||
         foundUrl.includes('.com') ||
         foundUrl.includes('.net') ||
         foundUrl.includes('.org'))
      ) {
        matches.push(foundUrl);
      }
    }
    
    // Clear HTML to free memory
    html = '';
    
      // Return the first valid URL
      if (matches.length > 0) {
        console.log(`✅ Found URL via scraping with variation "${name}"`);
        return matches[0];
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching Google for ${lenderName}:`, error);
    return null;
  }
}

/**
 * Generate potential domain names from lender name/slug
 */
function generateDomainVariations(lenderName: string, slug?: string): string[] {
  const variations: string[] = [];
  
  // Clean name
  const cleaned = lenderName
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
  
  // Remove common suffixes
  const withoutSuffix = cleaned
    .replace(/(mortgage|lending|financial|bank|credit|union|fcu|cu)$/i, '')
    .trim();
  
  // Generate variations
  variations.push(`${cleaned}.com`);
  variations.push(`${cleaned}.net`);
  variations.push(`${cleaned}.org`);
  
  if (withoutSuffix !== cleaned && withoutSuffix.length > 0) {
    variations.push(`${withoutSuffix}.com`);
    variations.push(`${withoutSuffix}.net`);
    variations.push(`${withoutSuffix}.org`);
    variations.push(`${withoutSuffix}mortgage.com`);
    variations.push(`${withoutSuffix}lending.com`);
    variations.push(`${withoutSuffix}financial.com`);
  }
  
  // Use slug if available
  if (slug) {
    const slugDomain = slug.replace(/-/g, '');
    variations.push(`${slugDomain}.com`);
    variations.push(`${slugDomain}.net`);
    variations.push(`${slugDomain}.org`);
  }
  
  // Add "www." prefix
  const withWww = variations.map(v => `www.${v}`);
  variations.push(...withWww);
  
  // Add "https://" prefix
  const withHttps = variations.map(v => `https://${v}`);
  variations.push(...withHttps);
  
  return [...new Set(variations)];
}

/**
 * Try domain variations - test if they're accessible
 */
async function tryDomainVariations(lenderName: string, slug?: string): Promise<string | null> {
  const variations = generateDomainVariations(lenderName, slug);
  
  // Test first 10 variations (most likely)
  for (const domain of variations.slice(0, 10)) {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        // Check content type
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/pdf') && 
            !contentType.includes('application/msword')) {
          console.log(`✅ Found accessible domain: ${url}`);
          return url;
        }
      }
    } catch (error) {
      // Continue to next variation
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return null;
}

/**
 * Extract email domain from JSONB data
 */
function extractEmailDomainFromData(data: any): string | null {
  if (!data) return null;
  
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  const emailPattern = /[\w.-]+@([\w.-]+\.\w+)/gi;
  const matches = jsonString.match(emailPattern);
  
  if (matches && matches.length > 0) {
    const email = matches[0];
    const domainMatch = email.match(/@([^\s<>"']+)/i);
    if (domainMatch) {
      const domain = domainMatch[1].toLowerCase();
      // Skip common email providers
      if (!['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'].includes(domain)) {
        return `https://www.${domain}`;
      }
    }
  }
  
  return null;
}

/**
 * Search Perplexity AI for lender website URL with enhanced context
 * Uses Perplexity API as a fallback when Google doesn't find results
 */
async function searchPerplexityForLenderUrl(
  lenderName: string,
  additionalContext?: {
    slug?: string;
    description?: string;
    states?: string[];
  }
): Promise<string | null> {
  try {
    const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!apiKey) {
      console.log('Perplexity API key not configured, skipping Perplexity search');
      return null;
    }
    
    // Build enhanced query with context
    let query = `What is the official website URL for the mortgage lender "${lenderName}"?`;
    
    if (additionalContext?.description) {
      query += ` They are described as: ${additionalContext.description.substring(0, 100)}.`;
    }
    
    if (additionalContext?.states && additionalContext.states.length > 0) {
      query += ` They operate in: ${additionalContext.states.join(', ')}.`;
    }
    
    query += ` Please provide only the official website URL, nothing else.`;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that finds official website URLs for mortgage lenders. Return only the URL, nothing else. Do not return PDFs or document files.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Perplexity API error:', errorData);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      return null;
    }
    
    // Extract URL from response
    const urlMatch = content.match(/https?:\/\/[^\s<>"']+/i);
    if (urlMatch) {
      const foundUrl = urlMatch[0];
      // Validate it's not a PDF or document
      if (foundUrl.match(/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz)$/i)) {
        return null;
      }
      if (foundUrl.includes('/downloads/') || foundUrl.includes('/files/') || foundUrl.includes('/uploads/')) {
        return null;
      }
      console.log(`✅ Found URL via Perplexity: ${foundUrl}`);
      return foundUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching Perplexity:', error);
    return null;
  }
}

/**
 * Attempt to find and correct invalid lender URL via Google search with variations, then Perplexity
 */
async function correctLenderUrl(
  lender: any,
  supabase: any
): Promise<{ corrected: boolean; newUrl: string | null; error?: string }> {
  try {
    // Clean lender name for search - remove bracket notation and parenthetical info
    const lenderName = lender.name
      .replace(/\[[^\]]+\]/g, '') // Remove bracket notation like [0.35 missing ndc margin...]
      .replace(/\([^)]*\)/g, '') // Remove parenthetical info
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`🔍 Searching for correct URL: ${lenderName}`);
    
    // Try with Custom Search API first (with name variations)
    let foundUrl = await searchGoogleForLenderUrl(lenderName, true, true);
    
    if (!foundUrl) {
      // Fallback to scraping (with name variations)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
      foundUrl = await searchGoogleForLenderUrl(lenderName, false, true);
    }
    
    // Strategy 3: Try domain variations
    if (!foundUrl) {
      console.log(`🔍 Trying domain variations for: ${lenderName}`);
      foundUrl = await tryDomainVariations(lenderName, lender.slug);
      if (foundUrl) {
        console.log(`✅ Found URL via domain generation: ${foundUrl}`);
      }
    }
    
    // Strategy 4: Extract from email domain in detailed_program_data
    if (!foundUrl && lender.detailed_program_data) {
      const emailUrl = extractEmailDomainFromData(lender.detailed_program_data);
      if (emailUrl) {
        console.log(`🔍 Found email domain, testing: ${emailUrl}`);
        try {
          const testResponse = await fetch(emailUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          if (testResponse.ok) {
            foundUrl = emailUrl;
            console.log(`✅ Found URL via email domain: ${foundUrl}`);
          }
        } catch (error) {
          // Continue to next strategy
        }
      }
    }
    
    // Strategy 5: Extract from email domain in special_features
    if (!foundUrl && lender.special_features) {
      const emailUrl = extractEmailDomainFromData(lender.special_features);
      if (emailUrl) {
        console.log(`🔍 Found email domain in special_features, testing: ${emailUrl}`);
        try {
          const testResponse = await fetch(emailUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          if (testResponse.ok) {
            foundUrl = emailUrl;
            console.log(`✅ Found URL via email domain: ${foundUrl}`);
          }
        } catch (error) {
          // Continue to next strategy
        }
      }
    }
    
    // Strategy 6: Try Perplexity AI with enhanced context
    if (!foundUrl) {
      console.log(`🔍 Google search and domain generation failed, trying Perplexity AI for: ${lenderName}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      
      const context = {
        slug: lender.slug,
        description: lender.description || undefined,
        states: lender.states_available || undefined
      };
      
      foundUrl = await searchPerplexityForLenderUrl(lenderName, context);
      
      if (!foundUrl) {
        return { corrected: false, newUrl: null, error: 'No URL found via any strategy (Google, domain generation, email domain, or Perplexity AI)' };
      }
    }
    
    // Validate the found URL - reject PDFs and non-website files
    if (foundUrl.match(/\.(pdf|doc|docx|xls|xlsx|zip|tar|gz)$/i)) {
      return { corrected: false, newUrl: foundUrl, error: 'Found URL is a document file, not a website' };
    }
    
    // Reject URLs that look like file paths
    if (foundUrl.includes('/downloads/') || foundUrl.includes('/files/') || foundUrl.includes('/uploads/')) {
      return { corrected: false, newUrl: foundUrl, error: 'Found URL appears to be a file path, not a website' };
    }
    
    try {
      const testResponse = await fetch(foundUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (testResponse.ok) {
        // Check content type - reject PDFs and documents
        const contentType = testResponse.headers.get('content-type') || '';
        if (contentType.includes('application/pdf') || 
            contentType.includes('application/msword') ||
            contentType.includes('application/vnd.')) {
          return { corrected: false, newUrl: foundUrl, error: 'Found URL returns a document, not a website' };
        }
        
        // Update database with corrected URL
        const { error: updateError } = await supabase
          .from('lenders')
          .update({ website_url: foundUrl })
          .eq('id', lender.id);
        
        if (updateError) {
          return { corrected: false, newUrl: foundUrl, error: updateError.message };
        }
        
        console.log(`✅ Corrected URL for ${lenderName}: ${foundUrl}`);
        return { corrected: true, newUrl: foundUrl };
      }
    } catch (e) {
      return { corrected: false, newUrl: foundUrl, error: 'Found URL is not accessible' };
    }
    
    return { corrected: false, newUrl: null, error: 'URL validation failed' };
  } catch (error) {
    return { 
      corrected: false, 
      newUrl: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ========================================
// REPORT GENERATION
// ========================================

/**
 * Generate human-readable report from crawl results
 */
function generateHumanReadableReport(
  response: CrawlerResponse,
  startTime: Date
): string {
  const duration = Math.round((new Date().getTime() - startTime.getTime()) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  let report = '\n';
  report += '='.repeat(80) + '\n';
  report += 'LENDER WEBSITE CRAWL REPORT\n';
  report += '='.repeat(80) + '\n';
  report += `Completed: ${new Date().toLocaleString()}\n`;
  report += `Duration: ${minutes}m ${seconds}s\n`;
  report += '\n';
  
  // Summary
  report += '📊 SUMMARY\n';
  report += '-'.repeat(80) + '\n';
  report += `✅ Crawled:        ${response.crawled} lender(s)\n`;
  report += `✅ Updated:         ${response.updated} lender(s)\n`;
  report += `💼 Business Loans: ${response.found_business_lending} lender(s) found\n`;
  report += `🔧 URLs Corrected:  ${response.url_corrected || 0} lender(s)\n`;
  report += `❌ Errors:          ${response.errors} lender(s)\n`;
  report += `⏭️  Skipped:        ${response.results.filter(r => r.status === 'no_website' || r.status === 'skipped').length} lender(s)\n`;
  report += '\n';
  
  // Business Lending Results
  const businessLendingLenders = response.results.filter(
    r => r.found_data.business_lending === true
  );
  
  if (businessLendingLenders.length > 0) {
    report += '💼 BUSINESS LENDING DISCOVERED\n';
    report += '-'.repeat(80) + '\n';
    businessLendingLenders.forEach((result, index) => {
      report += `\n${index + 1}. ${result.lender_name}\n`;
      if (result.website_url) {
        report += `   Website: ${result.website_url}\n`;
      }
      if (result.found_data.business_loan_types && result.found_data.business_loan_types.length > 0) {
        report += `   Loan Types: ${result.found_data.business_loan_types.join(', ')}\n`;
      }
      if (result.found_data.public_info?.services_mentioned) {
        report += `   Services: ${result.found_data.public_info.services_mentioned.join(', ')}\n`;
      }
    });
    report += '\n';
  }
  
  // URLs Corrected
  const correctedLenders = response.results.filter(r => r.url_corrected === true);
  
  if (correctedLenders.length > 0) {
    report += '🔧 URLs CORRECTED VIA GOOGLE SEARCH\n';
    report += '-'.repeat(80) + '\n';
    correctedLenders.forEach((result, index) => {
      report += `\n${index + 1}. ${result.lender_name}\n`;
      if (result.original_url) {
        report += `   Original: ${result.original_url}\n`;
      }
      if (result.website_url) {
        report += `   Corrected: ${result.website_url}\n`;
      }
    });
    report += '\n';
  }
  
  // Successfully Updated
  const updatedLenders = response.results.filter(
    r => r.status === 'success' && r.found_data.updated_fields && r.found_data.updated_fields.length > 0
  );
  
  if (updatedLenders.length > 0) {
    report += '✅ SUCCESSFULLY UPDATED\n';
    report += '-'.repeat(80) + '\n';
    updatedLenders.forEach((result, index) => {
      report += `\n${index + 1}. ${result.lender_name}\n`;
      if (result.website_url) {
        report += `   Website: ${result.website_url}\n`;
      }
      if (result.found_data.updated_fields) {
        report += `   Updated Fields: ${result.found_data.updated_fields.join(', ')}\n`;
      }
      if (result.found_data.public_info?.website_title) {
        report += `   Website Title: ${result.found_data.public_info.website_title}\n`;
      }
    });
    report += '\n';
  }
  
  // Errors
  const errorLenders = response.results.filter(r => r.status === 'error');
  
  if (errorLenders.length > 0) {
    report += '❌ ERRORS\n';
    report += '-'.repeat(80) + '\n';
    errorLenders.forEach((result, index) => {
      report += `\n${index + 1}. ${result.lender_name}\n`;
      if (result.website_url) {
        report += `   Website: ${result.website_url}\n`;
      }
      if (result.error) {
        report += `   Error: ${result.error}\n`;
      }
    });
    report += '\n';
  }
  
  // No Website
  const noWebsiteLenders = response.results.filter(r => r.status === 'no_website');
  
  if (noWebsiteLenders.length > 0) {
    report += '⏭️  NO WEBSITE URL FOUND\n';
    report += '-'.repeat(80) + '\n';
    noWebsiteLenders.forEach((result, index) => {
      report += `${index + 1}. ${result.lender_name}\n`;
    });
    report += '\n';
  }
  
  // Statistics
  report += '📈 STATISTICS\n';
  report += '-'.repeat(80) + '\n';
  const successRate = response.crawled > 0 
    ? Math.round((response.updated / response.crawled) * 100) 
    : 0;
  const businessLendingRate = response.crawled > 0
    ? Math.round((response.found_business_lending / response.crawled) * 100)
    : 0;
  
  report += `Success Rate:        ${successRate}% (${response.updated}/${response.crawled})\n`;
  report += `Business Lending:    ${businessLendingRate}% (${response.found_business_lending}/${response.crawled})\n`;
  report += `Error Rate:          ${response.crawled > 0 ? Math.round((response.errors / response.crawled) * 100) : 0}% (${response.errors}/${response.crawled})\n`;
  report += '\n';
  
  // Next Steps
  report += '🎯 NEXT STEPS\n';
  report += '-'.repeat(80) + '\n';
  if (response.found_business_lending > 0) {
    report += `✅ ${response.found_business_lending} lender(s) with business lending - ready for broker portal\n`;
  }
  if (response.updated > 0) {
    report += `✅ ${response.updated} lender(s) updated with new data\n`;
  }
  if (noWebsiteLenders.length > 0) {
    report += `⚠️  ${noWebsiteLenders.length} lender(s) need website URLs added manually\n`;
  }
  if (errorLenders.length > 0) {
    report += `⚠️  ${errorLenders.length} lender(s) had errors - review and retry\n`;
  }
  report += '\n';
  
  report += '='.repeat(80) + '\n';
  report += 'Report generated by Lender Website Crawler\n';
  report += '='.repeat(80) + '\n';
  
  return report;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date();

  try {
    const requestData: CrawlerRequest = await req.json();
    const {
      lender_id,
      site_id = 'rateroots',
      crawl_all = false,
      max_lenders = 10,
      focus_business_lending = true,
      update_existing = true,
      dry_run = false,
      auto_correct_urls = false, // Default to false to avoid rate limiting
    } = requestData;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch lenders to crawl (exclude those marked to skip)
    let lendersQuery = supabase
      .from('lenders')
      .select('id, name, slug, website_url, special_features, internal_notes, states_available, description')
      .eq('site_id', site_id)
      .eq('skip_crawling', false); // Skip invalid/category lenders

    if (lender_id) {
      lendersQuery = lendersQuery.eq('id', lender_id);
    } else if (!crawl_all) {
      // Only crawl lenders without website_url
      // This catches lenders that need initial crawling or re-crawling
      lendersQuery = lendersQuery.is('website_url', null);
    }

    const { data: lenders, error: fetchError } = await lendersQuery.limit(max_lenders);

    if (fetchError) {
      throw new Error(`Failed to fetch lenders: ${fetchError.message}`);
    }

    if (!lenders || lenders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          crawled: 0,
          updated: 0,
          found_business_lending: 0,
          errors: 0,
          url_corrected: 0,
          results: [],
          timestamp: new Date().toISOString(),
          message: 'No lenders found to crawl',
        } as CrawlerResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Crawl each lender
    const results: CrawlerResponse['results'] = [];
    let updated = 0;
    let foundBusinessLending = 0;
    let errors = 0;
    let urlCorrected = 0;

    for (const lender of lenders) {
      // Add delay between requests to be respectful
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

      const result = await crawlLenderWebsite(
        lender,
        focus_business_lending,
        update_existing,
        dry_run,
        supabase,
        auto_correct_urls
      );

      results.push(result);

      if (result.status === 'success') {
        if (result.found_data.updated_fields && result.found_data.updated_fields.length > 0) {
          updated++;
        }
        if (result.found_data.business_lending) {
          foundBusinessLending++;
        }
        if (result.url_corrected) {
          urlCorrected++;
        }
      } else if (result.status === 'error') {
        errors++;
      }
    }

    const response: CrawlerResponse = {
      success: true,
      crawled: results.length,
      updated,
      found_business_lending: foundBusinessLending,
      errors,
      url_corrected: urlCorrected,
      results,
      timestamp: new Date().toISOString(),
    };

    // Generate human-readable report
    response.report = generateHumanReadableReport(response, startTime);

    return new Response(
      JSON.stringify(response, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const errorResponse: CrawlerResponse = {
      success: false,
      crawled: 0,
      updated: 0,
      found_business_lending: 0,
      errors: 1,
      url_corrected: 0,
      results: [],
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});

