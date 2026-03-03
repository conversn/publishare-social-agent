/**
 * Supabase Edge Function: Plan Pages
 * 
 * Generates rollout plan per city/vertical/domain for HomeSimple local SEO pages.
 * Analyzes existing pages, identifies content gaps, and creates page recommendations
 * with internal linking strategy.
 * 
 * Request Body:
 * {
 *   domain_id: string (required)
 *   city?: string (optional) - Filter to specific city
 *   state?: string (optional) - Filter to specific state
 *   vertical: string (required) - Service vertical (hvac, plumbing, pest, etc)
 *   target_pages?: number (optional, default: 10) - Target number of pages to create
 *   existing_pages?: string[] (optional) - Page IDs to consider as existing
 * }
 * 
 * Response:
 * {
 *   plan: {
 *     pages_to_create: Array<{
 *       slug: string
 *       title: string
 *       primary_keyword: string
 *       internal_link_targets: string[]
 *       priority: 'high' | 'medium' | 'low'
 *     }>
 *     internal_linking_strategy: {
 *       hub_pages: string[]
 *       cluster_pages: string[]
 *       link_map: Record<string, string[]>
 *     }
 *     sitemap_tasks: string[]
 *   }
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanPagesRequest {
  domain_id: string;
  city?: string;
  state?: string;
  vertical: string;
  target_pages?: number;
  existing_pages?: string[];
}

interface PageRecommendation {
  slug: string;
  title: string;
  primary_keyword: string;
  internal_link_targets: string[];
  priority: 'high' | 'medium' | 'low';
}

interface InternalLinkingStrategy {
  hub_pages: string[];
  cluster_pages: string[];
  link_map: Record<string, string[]>;
}

interface PlanPagesResponse {
  plan: {
    pages_to_create: PageRecommendation[];
    internal_linking_strategy: InternalLinkingStrategy;
    sitemap_tasks: string[];
  };
}

/**
 * Analyze existing pages for domain/vertical
 */
async function analyzeExistingPages(
  supabase: any,
  domainId: string,
  vertical: string,
  city?: string,
  state?: string
): Promise<any[]> {
  let query = supabase
    .from('articles')
    .select('id, title, slug, city, state, vertical, page_type')
    .eq('domain_id', domainId)
    .eq('vertical', vertical)
    .eq('page_type', 'local_page');

  if (city) {
    query = query.eq('city', city);
  }
  if (state) {
    query = query.eq('state', state);
  }

  const { data: pages, error } = await query;

  if (error) {
    console.error('Error fetching existing pages:', error);
    return [];
  }

  return pages || [];
}

/**
 * Identify content gaps using AI
 */
async function identifyContentGaps(
  existingPages: any[],
  vertical: string,
  city?: string,
  state?: string,
  targetPages: number = 10
): Promise<PageRecommendation[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || 
                       Deno.env.get('OPEN_AI_PUBLISHARE_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const existingTitles = existingPages.map(p => p.title).join('\n- ');
  const locationContext = city && state ? ` in ${city}, ${state}` : '';

  const prompt = `You are a local SEO content strategist. Analyze the existing pages and identify content gaps for a ${vertical} service business${locationContext}.

EXISTING PAGES:
${existingTitles || 'None'}

Generate ${targetPages} new page recommendations that:
1. Target different problem keywords (e.g., "AC not cooling", "furnace won't start", "plumbing leak")
2. Are unique and don't duplicate existing pages
3. Target high-intent local search queries
4. Include city name naturally in the title
5. Are actionable and conversion-focused

For each page, provide:
- slug: URL-friendly slug (e.g., "ac-not-cooling-tampa")
- title: SEO-optimized title with city name
- primary_keyword: Main keyword to target
- priority: high (high-intent, high-volume), medium, or low

Return as JSON array:
[
  {
    "slug": "ac-not-cooling-tampa",
    "title": "AC Not Cooling in Tampa? Here's What to Do",
    "primary_keyword": "AC not cooling Tampa",
    "priority": "high"
  },
  ...
]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a local SEO expert. Return only valid JSON arrays, no markdown, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response (AI may return array directly or wrapped in object)
    let recommendations: any[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        recommendations = parsed;
      } else if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations;
      } else if (parsed.pages && Array.isArray(parsed.pages)) {
        recommendations = parsed.pages;
      } else {
        console.warn('Unexpected AI response format:', parsed);
        recommendations = [];
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      recommendations = [];
    }

    // Add internal_link_targets (will be populated in buildLinkingStrategy)
    return recommendations.map((rec: any) => ({
      ...rec,
      internal_link_targets: [] // Will be populated later
    }));
  } catch (error) {
    console.error('Error identifying content gaps:', error);
    // Return fallback recommendations
    return generateFallbackRecommendations(vertical, city, state, targetPages);
  }
}

/**
 * Generate fallback recommendations if AI fails
 */
function generateFallbackRecommendations(
  vertical: string,
  city?: string,
  state?: string,
  targetPages: number = 10
): PageRecommendation[] {
  const cityName = city || 'Your City';
  const commonProblems: Record<string, string[]> = {
    hvac: [
      'AC Not Cooling',
      'Furnace Won\'t Start',
      'AC Making Strange Noises',
      'High Energy Bills',
      'AC Not Blowing Cold Air',
      'Furnace Not Heating',
      'AC Unit Frozen',
      'Thermostat Not Working',
      'AC Leaking Water',
      'Furnace Blowing Cold Air'
    ],
    plumbing: [
      'Leaky Faucet Repair',
      'Clogged Drain',
      'Water Heater Not Working',
      'Burst Pipe Emergency',
      'Low Water Pressure',
      'Running Toilet',
      'Sewer Line Backup',
      'Frozen Pipes',
      'Garbage Disposal Not Working',
      'Water Leak Detection'
    ],
    pest: [
      'Ant Control',
      'Roach Extermination',
      'Rodent Removal',
      'Bed Bug Treatment',
      'Termite Inspection',
      'Spider Control',
      'Wasp Nest Removal',
      'Flea Treatment',
      'Mice Extermination',
      'Cockroach Control'
    ]
  };

  const problems = commonProblems[vertical] || commonProblems.hvac;
  const selectedProblems = problems.slice(0, targetPages);

  return selectedProblems.map((problem, index) => ({
    slug: `${problem.toLowerCase().replace(/\s+/g, '-')}-${city?.toLowerCase().replace(/\s+/g, '-') || 'city'}`,
    title: `${problem} in ${cityName}${state ? `, ${state}` : ''} - Expert Solutions`,
    primary_keyword: `${problem} ${cityName}${state ? ` ${state}` : ''}`,
    priority: index < 3 ? 'high' : index < 7 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
    internal_link_targets: []
  }));
}

/**
 * Build internal linking strategy
 */
function buildLinkingStrategy(
  existingPages: any[],
  newPages: PageRecommendation[]
): InternalLinkingStrategy {
  // Identify hub pages (main category/service pages)
  const hubPages = existingPages
    .filter(p => 
      p.title.toLowerCase().includes('guide') ||
      p.title.toLowerCase().includes('complete') ||
      p.title.toLowerCase().includes('everything')
    )
    .map(p => p.id);

  // All other pages are cluster pages
  const clusterPages = [
    ...existingPages.filter(p => !hubPages.includes(p.id)).map(p => p.id),
    ...newPages.map(p => p.slug) // New pages will get IDs after creation
  ];

  // Build link map (which pages link to which)
  const linkMap: Record<string, string[]> = {};

  // Hub pages link to all cluster pages
  hubPages.forEach(hubId => {
    linkMap[hubId] = clusterPages.slice(0, 5); // Link to top 5 cluster pages
  });

  // Cluster pages link to hub pages and related cluster pages
  clusterPages.forEach(clusterId => {
    const links: string[] = [];
    // Link to hub pages
    links.push(...hubPages.slice(0, 2));
    // Link to 2-3 related cluster pages
    const related = clusterPages
      .filter(id => id !== clusterId)
      .slice(0, 3);
    links.push(...related);
    linkMap[clusterId] = links;
  });

  // New pages link to existing pages
  newPages.forEach(newPage => {
    const links: string[] = [];
    // Link to hub pages
    links.push(...hubPages.slice(0, 2));
    // Link to 2-3 existing cluster pages
    const existingCluster = existingPages
      .filter(p => !hubPages.includes(p.id))
      .slice(0, 3)
      .map(p => p.id);
    links.push(...existingCluster);
    linkMap[newPage.slug] = links;
    newPage.internal_link_targets = links;
  });

  return {
    hub_pages: hubPages,
    cluster_pages: clusterPages,
    link_map: linkMap
  };
}

/**
 * Generate sitemap tasks
 */
function generateSitemapTasks(
  domainId: string,
  newPages: PageRecommendation[],
  existingPages: any[]
): string[] {
  const tasks: string[] = [];

  tasks.push(`Update sitemap.xml for domain ${domainId}`);
  tasks.push(`Add ${newPages.length} new local pages to sitemap`);
  tasks.push(`Verify all ${existingPages.length} existing pages are in sitemap`);
  tasks.push(`Submit updated sitemap to Google Search Console`);
  tasks.push(`Submit updated sitemap to Bing Webmaster Tools`);

  return tasks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: PlanPagesRequest = await req.json();
    
    if (!body.domain_id) {
      return new Response(
        JSON.stringify({
          plan: {
            pages_to_create: [],
            internal_linking_strategy: { hub_pages: [], cluster_pages: [], link_map: {} },
            sitemap_tasks: []
          },
          error: 'domain_id is required'
        } as any),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!body.vertical) {
      return new Response(
        JSON.stringify({
          plan: {
            pages_to_create: [],
            internal_linking_strategy: { hub_pages: [], cluster_pages: [], link_map: {} },
            sitemap_tasks: []
          },
          error: 'vertical is required'
        } as any),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Planning pages for domain: ${body.domain_id}, vertical: ${body.vertical}`);

    // Step 1: Analyze existing pages
    console.log('🔍 Analyzing existing pages...');
    const existingPages = await analyzeExistingPages(
      supabase,
      body.domain_id,
      body.vertical,
      body.city,
      body.state
    );
    console.log(`Found ${existingPages.length} existing pages`);

    // Step 2: Identify content gaps
    console.log('🎯 Identifying content gaps...');
    const targetPages = body.target_pages || 10;
    const pageRecommendations = await identifyContentGaps(
      existingPages,
      body.vertical,
      body.city,
      body.state,
      targetPages
    );
    console.log(`Generated ${pageRecommendations.length} page recommendations`);

    // Step 3: Build internal linking strategy
    console.log('🔗 Building internal linking strategy...');
    const linkingStrategy = buildLinkingStrategy(existingPages, pageRecommendations);

    // Step 4: Generate sitemap tasks
    console.log('🗺️  Generating sitemap tasks...');
    const sitemapTasks = generateSitemapTasks(body.domain_id, pageRecommendations, existingPages);

    const response: PlanPagesResponse = {
      plan: {
        pages_to_create: pageRecommendations,
        internal_linking_strategy: linkingStrategy,
        sitemap_tasks: sitemapTasks
      }
    };

    console.log(`✅ Page planning complete: ${pageRecommendations.length} pages recommended`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Plan Pages Error:', error);
    
    return new Response(
      JSON.stringify({
        plan: {
          pages_to_create: [],
          internal_linking_strategy: { hub_pages: [], cluster_pages: [], link_map: {} },
          sitemap_tasks: []
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      } as any),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

