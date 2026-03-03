// =====================================================
// SEO Diagnose URL Edge Function
// Purpose: Run diagnostics + LLM classification on URLs
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import type {
  DiagnoseRequest,
  ApiResponse,
  DiagnoseResponse,
  FetchResult,
  PageSignals,
  CanonicalTarget,
  RobotsCheck,
  SitemapCheck,
  InternalSignals,
  Classification,
  LLMPromptPayload,
} from '../seo-shared/types.ts';
import { SYSTEM_PROMPT, buildUserPrompt, extractJSON } from '../seo-shared/prompts.ts';
import { validateClassification } from '../seo-shared/schemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: DiagnoseRequest = await req.json();
    const batchSize = payload.batch_size || 10;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch URLs to diagnose
    let query = supabase
      .from('seo_affected_urls')
      .select('*')
      .eq('status', 'pending')
      .limit(batchSize);

    if (payload.url_ids && payload.url_ids.length > 0) {
      query = query.in('id', payload.url_ids);
    } else if (payload.alert_id) {
      query = query.eq('alert_id', payload.alert_id);
    }

    const { data: urls, error } = await query;

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }

    if (!urls || urls.length === 0) {
      return jsonResponse<DiagnoseResponse>({
        success: true,
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          diagnostics: [],
          errors: [],
        },
      });
    }

    console.log(`🔍 Diagnosing ${urls.length} URLs...`);

    const diagnostics = [];
    const errors = [];
    let successful = 0;
    let failed = 0;

    // Process each URL
    for (const urlRecord of urls) {
      try {
        // Update status to processing
        await supabase
          .from('seo_affected_urls')
          .update({ status: 'processing' })
          .eq('id', urlRecord.id);

        console.log(`📊 Processing: ${urlRecord.url}`);

        // Run diagnostics
        const diagnostic = await runDiagnostics(urlRecord.url, urlRecord.alert_id, supabase);

        // Store diagnostic
        const { error: insertError } = await supabase
          .from('seo_url_diagnostics')
          .insert({
            url_id: urlRecord.id,
            fetch: diagnostic.fetch,
            signals: diagnostic.signals,
            canonical_target: diagnostic.canonical_target,
            robots: diagnostic.robots,
            sitemap: diagnostic.sitemap,
            internal: diagnostic.internal,
            classification: diagnostic.classification,
          });

        if (insertError) {
          throw new Error(`Failed to store diagnostic: ${insertError.message}`);
        }

        // Update URL status
        await supabase
          .from('seo_affected_urls')
          .update({
            status: diagnostic.classification.root_cause === 'UNKNOWN_NEEDS_HUMAN_REVIEW'
              ? 'needs_review'
              : 'complete',
          })
          .eq('id', urlRecord.id);

        diagnostics.push(diagnostic);
        successful++;
        console.log(`✅ Completed: ${urlRecord.url}`);
      } catch (err) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Failed: ${urlRecord.url}`, errorMsg);

        errors.push({
          url_id: urlRecord.id,
          error: errorMsg,
        });

        // Update URL with error
        await supabase
          .from('seo_affected_urls')
          .update({
            status: 'error',
            last_error: errorMsg,
            retry_count: urlRecord.retry_count + 1,
          })
          .eq('id', urlRecord.id);
      }
    }

    const response: DiagnoseResponse = {
      processed: urls.length,
      successful,
      failed,
      diagnostics,
      errors,
    };

    return jsonResponse<DiagnoseResponse>({ success: true, data: response });
  } catch (error) {
    console.error('❌ Diagnose error:', error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =====================================================
// Core Diagnostics Function
// =====================================================

async function runDiagnostics(url: string, alertId: string, supabase: any) {
  const startTime = Date.now();

  // Step 1: Fetch the URL
  const fetch = await fetchUrl(url);

  // Step 2: Extract page signals
  const signals = await extractSignals(fetch);

  // Step 3: Analyze canonical target (if canonical exists)
  const canonical_target = signals.canonical
    ? await analyzeCanonicalTarget(signals.canonical)
    : undefined;

  // Step 4: Check robots.txt
  const robots = await checkRobotsTxt(url);

  // Step 5: Check sitemap
  const sitemap = await checkSitemap(url, signals.canonical, supabase);

  // Step 6: Get internal signals
  const internal = await getInternalSignals(url, supabase);

  // Step 7: Classify with LLM
  const classification = await classifyWithLLM({
    issue_type: 'alternate_with_proper_canonical', // Get from alert
    url,
    signals,
    canonical_target,
    robots,
    sitemap,
    internal,
  });

  const totalTime = Date.now() - startTime;
  console.log(`⏱️ Diagnostics completed in ${totalTime}ms`);

  return {
    url_id: '', // Set by caller
    fetch,
    signals,
    canonical_target,
    robots,
    sitemap,
    internal,
    classification,
  };
}

// =====================================================
// Diagnostic Helpers
// =====================================================

async function fetchUrl(url: string): Promise<FetchResult> {
  const startTime = Date.now();
  const redirects: string[] = [];

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Publishare-SEO-Bot/1.0 (Indexability Triage Agent)',
      },
    });

    const headers_subset: Record<string, string> = {};
    ['content-type', 'x-robots-tag', 'location'].forEach((key) => {
      const value = response.headers.get(key);
      if (value) headers_subset[key] = value;
    });

    return {
      status_code: response.status,
      final_url: response.url,
      headers_subset,
      fetch_ms: Date.now() - startTime,
      redirects,
    };
  } catch (error) {
    return {
      status_code: 0,
      final_url: url,
      headers_subset: {},
      fetch_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Fetch failed',
    };
  }
}

async function extractSignals(fetch: FetchResult): Promise<PageSignals> {
  if (fetch.status_code !== 200 || fetch.error) {
    return {
      has_noindex: false,
      has_nofollow: false,
    };
  }

  try {
    const response = await globalThis.fetch(fetch.final_url);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (!doc) throw new Error('Failed to parse HTML');

    // Extract canonical
    const canonicalEl = doc.querySelector('link[rel="canonical"]');
    const canonical = canonicalEl?.getAttribute('href') || undefined;

    // Extract meta robots
    const metaRobotsEl = doc.querySelector('meta[name="robots"]');
    const metaRobots = metaRobotsEl?.getAttribute('content') || undefined;

    const hasNoindex = metaRobots?.toLowerCase().includes('noindex') || false;
    const hasNofollow = metaRobots?.toLowerCase().includes('nofollow') || false;

    // Extract x-robots-tag from headers
    const xRobotsTag = fetch.headers_subset['x-robots-tag'];

    // Extract title
    const titleEl = doc.querySelector('title');
    const title = titleEl?.textContent || undefined;

    // Extract h1
    const h1El = doc.querySelector('h1');
    const h1 = h1El?.textContent || undefined;

    // Count hreflang
    const hreflangEls = doc.querySelectorAll('link[rel="alternate"][hreflang]');
    const hreflangCount = hreflangEls.length;

    // Word count (rough estimate)
    const bodyText = doc.querySelector('body')?.textContent || '';
    const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

    // Content hash (simple hash of body text)
    const contentHash = simpleHash(bodyText.slice(0, 5000));

    return {
      canonical,
      meta_robots: metaRobots,
      x_robots_tag: xRobotsTag,
      hreflang_count: hreflangCount,
      title,
      h1,
      word_count: wordCount,
      content_hash: contentHash,
      has_noindex: hasNoindex || xRobotsTag?.toLowerCase().includes('noindex') || false,
      has_nofollow: hasNofollow || xRobotsTag?.toLowerCase().includes('nofollow') || false,
    };
  } catch (error) {
    console.error('Signal extraction error:', error);
    return {
      has_noindex: false,
      has_nofollow: false,
    };
  }
}

async function analyzeCanonicalTarget(canonicalUrl: string): Promise<CanonicalTarget> {
  try {
    const response = await fetch(canonicalUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Publishare-SEO-Bot/1.0',
      },
    });

    if (response.status !== 200) {
      return {
        url: canonicalUrl,
        status_code: response.status,
        self_canonical_ok: false,
        indexable_bool: false,
        error: `Non-200 status: ${response.status}`,
      };
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (!doc) {
      return {
        url: canonicalUrl,
        status_code: response.status,
        self_canonical_ok: false,
        indexable_bool: false,
        error: 'Failed to parse HTML',
      };
    }

    const targetCanonicalEl = doc.querySelector('link[rel="canonical"]');
    const targetCanonical = targetCanonicalEl?.getAttribute('href');
    const selfCanonicalOk = targetCanonical === canonicalUrl;

    const metaRobotsEl = doc.querySelector('meta[name="robots"]');
    const metaRobots = metaRobotsEl?.getAttribute('content') || '';
    const hasNoindex = metaRobots.toLowerCase().includes('noindex');

    return {
      url: canonicalUrl,
      status_code: response.status,
      self_canonical_ok: selfCanonicalOk,
      indexable_bool: !hasNoindex,
      meta_robots,
    };
  } catch (error) {
    return {
      url: canonicalUrl,
      status_code: 0,
      self_canonical_ok: false,
      indexable_bool: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRobotsTxt(url: string): Promise<RobotsCheck> {
  try {
    const urlObj = new URL(url);
    const robotsTxtUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

    const response = await fetch(robotsTxtUrl);

    if (!response.ok) {
      return {
        blocked_bool: false,
        robots_txt_url: robotsTxtUrl,
        fetch_error: `Failed to fetch robots.txt: ${response.status}`,
      };
    }

    const robotsTxt = await response.text();

    // Simple robots.txt parser (just check for Disallow rules)
    // Production would use a proper robots.txt parser
    const lines = robotsTxt.split('\n');
    let currentUserAgent = '*';
    let blocked = false;
    let matchedRule = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        currentUserAgent = trimmed.split(':')[1].trim();
      }

      if (
        (currentUserAgent === '*' || currentUserAgent.toLowerCase() === 'googlebot') &&
        trimmed.toLowerCase().startsWith('disallow:')
      ) {
        const path = trimmed.split(':')[1].trim();
        if (path && urlObj.pathname.startsWith(path)) {
          blocked = true;
          matchedRule = trimmed;
          break;
        }
      }
    }

    return {
      blocked_bool: blocked,
      matched_rule: matchedRule || undefined,
      robots_txt_url: robotsTxtUrl,
    };
  } catch (error) {
    return {
      blocked_bool: false,
      robots_txt_url: '',
      fetch_error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkSitemap(
  url: string,
  canonical: string | undefined,
  supabase: any
): Promise<SitemapCheck> {
  try {
    const urlObj = new URL(url);
    const siteId = urlObj.hostname;

    // Check cache first
    const { data: cached } = await supabase
      .from('seo_sitemap_cache')
      .select('*')
      .eq('site_id', siteId)
      .order('last_fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (cached && new Date(cached.last_fetched_at) > new Date(Date.now() - 3600000)) {
      // Cache valid for 1 hour
      const inSitemap = cached.urls.includes(url);
      const canonicalInSitemap = canonical ? cached.urls.includes(canonical) : false;

      return {
        in_sitemap_bool: inSitemap,
        sitemap_url: cached.sitemap_url,
        canonical_in_sitemap: canonicalInSitemap,
      };
    }

    // Fetch sitemap (simplified - production would handle sitemap indexes)
    const sitemapUrl = `${urlObj.protocol}//${urlObj.host}/sitemap.xml`;
    const response = await fetch(sitemapUrl);

    if (!response.ok) {
      return {
        in_sitemap_bool: false,
        sitemap_url: sitemapUrl,
      };
    }

    const sitemapXml = await response.text();
    const urls = extractUrlsFromSitemap(sitemapXml);

    // Cache the sitemap
    await supabase.from('seo_sitemap_cache').insert({
      site_id: siteId,
      sitemap_url: sitemapUrl,
      urls,
      url_count: urls.length,
    });

    const inSitemap = urls.includes(url);
    const canonicalInSitemap = canonical ? urls.includes(canonical) : false;

    return {
      in_sitemap_bool: inSitemap,
      sitemap_url: sitemapUrl,
      canonical_in_sitemap: canonicalInSitemap,
    };
  } catch (error) {
    return {
      in_sitemap_bool: false,
    };
  }
}

async function getInternalSignals(url: string, supabase: any): Promise<InternalSignals> {
  // Placeholder - production would:
  // 1. Query your CMS internal link database
  // 2. Or use a crawler snapshot table
  // 3. Calculate depth from homepage

  // For now, return mock data
  return {
    inlinks_count: 1,
    depth_estimate: 5,
    orphan_bool: false,
    top_linking_pages: [],
  };
}

// =====================================================
// LLM Classification
// =====================================================

async function classifyWithLLM(payload: LLMPromptPayload): Promise<Classification> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiKey) {
    console.warn('⚠️ No OpenAI API key - using fallback classification');
    return fallbackClassification(payload);
  }

  try {
    const userPrompt = buildUserPrompt(payload);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const classification = extractJSON(content);

    if (!validateClassification(classification)) {
      throw new Error('Invalid classification schema from LLM');
    }

    return classification as Classification;
  } catch (error) {
    console.error('❌ LLM classification failed:', error);
    return fallbackClassification(payload);
  }
}

function fallbackClassification(payload: LLMPromptPayload): Classification {
  // Simple deterministic fallback
  if (payload.signals.has_noindex) {
    return {
      root_cause: 'NOINDEX_CONFLICT',
      confidence: 0.9,
      recommended_actions: [
        {
          action: 'REMOVE_NOINDEX',
          detail: 'Remove noindex tag from page or canonical target',
          priority: 'high',
        },
      ],
      autofix_plan: {
        safe_to_autofix: false,
        patches: [],
        requires_human_review: ['Verify noindex is unintentional'],
      },
      notes: 'Fallback classification - noindex detected',
    };
  }

  if (payload.robots.blocked_bool) {
    return {
      root_cause: 'ROBOTS_BLOCKED',
      confidence: 0.95,
      recommended_actions: [
        {
          action: 'UPDATE_ROBOTS_TXT',
          detail: `Remove blocking rule: ${payload.robots.matched_rule}`,
          priority: 'high',
        },
      ],
      autofix_plan: {
        safe_to_autofix: false,
        patches: [],
        requires_human_review: ['Verify robots.txt rule can be removed'],
      },
      notes: 'Fallback classification - robots.txt blocking',
    };
  }

  return {
    root_cause: 'UNKNOWN_NEEDS_HUMAN_REVIEW',
    confidence: 0.5,
    recommended_actions: [
      {
        action: 'MANUAL_REVIEW',
        detail: 'Unable to auto-classify - needs human analysis',
        priority: 'medium',
      },
    ],
    autofix_plan: {
      safe_to_autofix: false,
      patches: [],
      requires_human_review: ['Complex issue requiring expert review'],
    },
    notes: 'Fallback classification - insufficient data',
  };
}

// =====================================================
// Utilities
// =====================================================

function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function extractUrlsFromSitemap(xml: string): string[] {
  // Simple XML parsing - production would use proper XML parser
  const urlMatches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return Array.from(urlMatches).map((match) => match[1]);
}



