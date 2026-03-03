/**
 * Supabase Edge Function: Batch Strategy Processor
 * 
 * Processes content strategies from the content_strategy table automatically.
 * Queries for "Planned" strategies, calls agentic-content-gen for each,
 * and updates strategy status after processing.
 * 
 * Request Body:
 * {
 *   site_id?: string (default: 'rateroots')
 *   limit?: number (default: 5, max: 10)
 *   priority_level?: 'Critical' | 'High' | 'Medium' | 'Low' (optional filter)
 *   dry_run?: boolean (default: false) - If true, only logs what would be processed
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   processed: number
 *   succeeded: number
 *   failed: number
 *   results: Array<{
 *     strategy_id: string
 *     strategy_title: string
 *     status: 'success' | 'failed'
 *     article_id?: string
 *     error?: string
 *   }>
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchStrategyRequest {
  site_id?: string;
  limit?: number;
  priority_level?: 'Critical' | 'High' | 'Medium' | 'Low';
  dry_run?: boolean;
  // Refresh mode parameters
  mode?: 'generate' | 'refresh';
  refresh_criteria?: {
    min_age_days?: number; // Minimum age in days before refresh
    ranking_drop_threshold?: number; // Refresh if ranking dropped by X positions
    ctr_threshold?: number; // Refresh if CTR below threshold
  };
  refresh_scope?: 'full' | 'section'; // Refresh entire page or just sections
  section_to_refresh?: string; // Specific section: hero, answer_pack, faq, service_areas, etc
}

interface StrategyResult {
  strategy_id: string;
  strategy_title: string;
  status: 'success' | 'failed';
  article_id?: string;
  error?: string;
}

/**
 * Fetch strategies from database (generate mode)
 */
async function fetchStrategies(
  supabase: any,
  siteId: string,
  limit: number,
  priorityLevel?: string
): Promise<any[]> {
  let query = supabase
    .from('content_strategy')
    .select('*')
    .eq('site_id', siteId)
    .eq('status', 'Planned')
    .order('priority_level', { ascending: false })
    .order('target_date', { ascending: true, nullsLast: true })
    .limit(limit);

  if (priorityLevel) {
    query = query.eq('priority_level', priorityLevel);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch strategies: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch articles for refresh mode
 */
async function fetchArticlesForRefresh(
  supabase: any,
  siteId: string,
  limit: number,
  criteria?: {
    min_age_days?: number;
    ranking_drop_threshold?: number;
    ctr_threshold?: number;
  }
): Promise<any[]> {
  let query = supabase
    .from('articles')
    .select('*')
    .eq('site_id', siteId)
    .eq('page_type', 'local_page')
    .eq('status', 'published')
    .order('updated_at', { ascending: true })
    .limit(limit);

  // Filter by minimum age
  if (criteria?.min_age_days) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - criteria.min_age_days);
    query = query.lt('updated_at', minDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch articles for refresh: ${error.message}`);
  }

  return data || [];
}

/**
 * Identify weak sections in content
 */
async function identifyWeakSections(
  content: string,
  articleId: string
): Promise<string[]> {
  // In production, this would use AI to analyze content quality
  // For now, use simple heuristics
  
  const weakSections: string[] = [];
  
  // Check if hero section is weak (first 200 words)
  const heroSection = content.substring(0, 500);
  if (heroSection.length < 200 || !heroSection.match(/^#\s+/m)) {
    weakSections.push('hero');
  }
  
  // Check if answer pack is weak (first 100 words don't answer directly)
  const answerPack = content.substring(0, 500);
  if (!answerPack.match(/\b(is|are|means|refers to|defined as)\b/i)) {
    weakSections.push('answer_pack');
  }
  
  // Check if FAQ section exists
  if (!content.match(/##?\s+(FAQ|Frequently Asked|Questions)/i)) {
    weakSections.push('faq');
  }
  
  // Check if service areas section exists (for local pages)
  if (!content.match(/##?\s+(Service Areas|Areas We Serve|Coverage)/i)) {
    weakSections.push('service_areas');
  }
  
  return weakSections;
}

/**
 * Refresh a specific section of content
 */
async function refreshSection(
  supabase: any,
  article: any,
  section: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; newContent?: string; error?: string }> {
  try {
    // Call agentic-content-gen with section-specific prompt
    const sectionPrompts: Record<string, string> = {
      hero: `Rewrite the hero section (first 200 words) for: "${article.title}". Make it answer-first, compelling, and city-specific.`,
      answer_pack: `Rewrite the answer pack (first 100 words) for: "${article.title}". Start with a direct answer to the problem.`,
      faq: `Generate 5-7 FAQs for: "${article.title}" in ${article.city || 'the city'}, ${article.state || 'state'}.`,
      service_areas: `Generate a service areas section for ${article.city || 'the city'}, ${article.state || 'state'} covering neighborhoods and nearby areas.`
    };

    const prompt = sectionPrompts[section] || `Rewrite the ${section} section for: "${article.title}"`;

    // For now, return a placeholder
    // In production, would call agentic-content-gen with section-specific parameters
    return {
      success: true,
      newContent: `[${section} section refreshed]`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Map strategy fields to agentic-content-gen parameters
 */
function mapStrategyToContentParams(strategy: any): any {
  const params: any = {
    topic: strategy.primary_keyword || strategy.content_title || '',
    site_id: strategy.site_id || 'rateroots',
  };

  if (strategy.content_title) {
    params.title = strategy.content_title;
  }

  if (strategy.target_audience) {
    params.target_audience = strategy.target_audience;
  }

  if (strategy.content_type) {
    params.content_type = strategy.content_type;
  }

  // Pass category from content strategy for UX category mapping
  if (strategy.category) {
    params.category = strategy.category;
  }

  if (strategy.word_count) {
    params.content_length = strategy.word_count;
  }

  // Set AEO optimization defaults
  params.aeo_optimized = true;
  params.generate_schema = true;
  params.answer_first = true;

  // Detect AEO content type from title/keyword
  if (strategy.content_title) {
    const title = strategy.content_title.toLowerCase();
    if (title.includes('how to') || title.includes('how do')) {
      params.aeo_content_type = 'how-to';
    } else if (title.includes('what is') || title.includes('definition')) {
      params.aeo_content_type = 'definition';
    } else if (title.includes(' vs ') || title.includes('comparison') || title.includes('compare') || title.includes('best ')) {
      params.aeo_content_type = 'comparison';
      params.content_type = 'comparison'; // Also set content_type for comparison detection
    } else {
      params.aeo_content_type = 'article';
    }
  }

  // Pass metadata from strategy
  if (strategy.primary_keyword) {
    params.focus_keyword = strategy.primary_keyword;
  }

  if (strategy.tags) {
    params.tags = Array.isArray(strategy.tags) 
      ? strategy.tags 
      : typeof strategy.tags === 'string' 
        ? JSON.parse(strategy.tags) 
        : [];
  }

  if (strategy.target_date) {
    params.scheduled_date = strategy.target_date;
  }

  // Enable full workflow
  params.generate_image = true;
  params.generate_links = true;
  params.convert_to_html = true;
  params.generate_social_posts = true;
  params.auto_publish = false; // Don't auto-publish, review first

  // Extract local page metadata from strategy
  // Check both metadata JSONB column and direct fields (for backward compatibility)
  let localMetadata: any = {};
  
  // First, check metadata JSONB column
  if (strategy.metadata && typeof strategy.metadata === 'object') {
    localMetadata = strategy.metadata;
  }
  
  // Also check direct fields on strategy (for backward compatibility)
  if (strategy.city) localMetadata.city = strategy.city;
  if (strategy.state) localMetadata.state = strategy.state;
  if (strategy.vertical) localMetadata.vertical = strategy.vertical;
  if (strategy.page_type) localMetadata.page_type = strategy.page_type;
  if (strategy.phone_number) localMetadata.phone_number = strategy.phone_number;
  if (strategy.service_areas) localMetadata.service_areas = strategy.service_areas;
  if (strategy.domain_id) localMetadata.domain_id = strategy.domain_id;
  
  // If this is a local page, set all local page parameters
  if (localMetadata.page_type === 'local_page' || localMetadata.city || localMetadata.vertical) {
    params.page_type = 'local_page';
    
    if (localMetadata.city) {
      params.city = localMetadata.city;
    }
    
    if (localMetadata.state) {
      params.state = localMetadata.state;
    }
    
    if (localMetadata.vertical) {
      params.vertical = localMetadata.vertical;
    }
    
    if (localMetadata.phone_number) {
      params.phone_number = localMetadata.phone_number;
    }
    
    if (localMetadata.service_areas) {
      // Handle both array and string formats
      if (Array.isArray(localMetadata.service_areas)) {
        params.service_areas = localMetadata.service_areas;
      } else if (typeof localMetadata.service_areas === 'string') {
        try {
          params.service_areas = JSON.parse(localMetadata.service_areas);
        } catch {
          // If not JSON, treat as comma-separated string
          params.service_areas = localMetadata.service_areas.split(',').map((s: string) => s.trim());
        }
      }
    }
    
    if (localMetadata.domain_id) {
      params.domain_id = localMetadata.domain_id;
    }
    
    if (localMetadata.call_routing_configured !== undefined) {
      params.call_routing_configured = localMetadata.call_routing_configured;
    }
    
    // If local_facts are provided in metadata, pass them through
    if (localMetadata.local_facts) {
      params.local_facts = localMetadata.local_facts;
    }
    
    console.log(`🏠 Local page detected: ${localMetadata.city || 'N/A'}, ${localMetadata.state || 'N/A'} - ${localMetadata.vertical || 'N/A'}`);
  }

  // If comparison content, fetch comparison config from site
  if (params.content_type === 'comparison' || params.aeo_content_type === 'comparison') {
    // Note: comparison parameters (preferred_service, alternatives) should be
    // provided in the content_strategy table or passed separately
    // For now, agentic-content-gen will fetch comparison config from site.config
    // and use defaults if not provided
  }

  return params;
}

/**
 * Update strategy status
 */
async function updateStrategyStatus(
  supabase: any,
  strategyId: string,
  status: 'In Progress' | 'Completed' | 'Failed',
  articleId?: string,
  error?: string
): Promise<void> {
  const updateData: any = {
    status,
    last_generation_attempt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (articleId) {
    // Store article_id if we have a way to link it
    // Note: content_strategy table may need an article_id column
  }

  const { error: updateError } = await supabase
    .from('content_strategy')
    .update(updateData)
    .eq('id', strategyId);

  if (updateError) {
    console.error(`Failed to update strategy ${strategyId}:`, updateError);
  }
}

/**
 * Process a single strategy
 */
async function processStrategy(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  strategy: any,
  jwtToken?: string // JWT token for function-to-function calls
): Promise<StrategyResult> {
  const strategyId = strategy.id;
  const strategyTitle = strategy.content_title || strategy.primary_keyword || 'Unknown';

  console.log(`📝 Processing strategy: ${strategyTitle} (${strategyId})`);

  try {
    // Update status to "In Progress"
    await updateStrategyStatus(supabase, strategyId, 'In Progress');

    // Map strategy to content generation parameters
    const contentParams = mapStrategyToContentParams(strategy);

    // If comparison content, fetch comparison config from site
    if (contentParams.content_type === 'comparison' || contentParams.aeo_content_type === 'comparison') {
      try {
        const { data: siteData } = await supabase
          .from('sites')
          .select('config')
          .eq('id', strategy.site_id || contentParams.site_id)
          .single();

        if (siteData?.config?.comparison_content) {
          const comparisonConfig = siteData.config.comparison_content;
          
          // Add comparison parameters if not already provided
          if (!contentParams.preferred_service && comparisonConfig.preferred_service) {
            contentParams.preferred_service = comparisonConfig.preferred_service;
          }
          
          if (!contentParams.preferred_service_description && comparisonConfig.preferred_service_description) {
            contentParams.preferred_service_description = comparisonConfig.preferred_service_description;
          }
          
          if (!contentParams.comparison_criteria && comparisonConfig.comparison_criteria) {
            contentParams.comparison_criteria = comparisonConfig.comparison_criteria;
          }
          
          if (!contentParams.editorial_tone && comparisonConfig.editorial_tone) {
            contentParams.editorial_tone = comparisonConfig.editorial_tone;
          }
          
          if (!contentParams.conclusion_style && comparisonConfig.conclusion_style) {
            contentParams.conclusion_style = comparisonConfig.conclusion_style;
          }

          // For alternatives, we need to either:
          // 1. Store them in content_strategy table (future enhancement)
          // 2. Provide them manually when creating strategy
          // 3. Generate them from the topic/title
          // For now, if not provided, we'll let the comparison generator handle defaults
          if (!contentParams.alternatives) {
            console.log('⚠️  No alternatives provided for comparison content. Comparison generator may use defaults.');
          }
        }
      } catch (error) {
        console.warn('Failed to fetch comparison config from site:', error);
      }
    }

    // For local pages, fetch local facts if not already provided
    if (contentParams.page_type === 'local_page' && contentParams.city && contentParams.state && contentParams.vertical) {
      if (!contentParams.local_facts) {
        try {
          console.log(`🔍 Fetching local facts for ${contentParams.city}, ${contentParams.state} - ${contentParams.vertical}`);
          const { data: localFacts, error: factsError } = await supabase
            .from('local_facts')
            .select('fact_type, content')
            .eq('city', contentParams.city)
            .eq('state', contentParams.state)
            .eq('vertical', contentParams.vertical)
            .eq('verified', true);
          
          if (!factsError && localFacts && localFacts.length > 0) {
            const facts: any = {};
            for (const fact of localFacts) {
              switch (fact.fact_type) {
                case 'neighborhood':
                  if (!facts.neighborhoods) facts.neighborhoods = [];
                  facts.neighborhoods.push(fact.content);
                  break;
                case 'climate':
                  facts.climate_notes = fact.content;
                  break;
                case 'common_issue':
                  if (!facts.common_issues) facts.common_issues = [];
                  facts.common_issues.push(fact.content);
                  break;
                case 'regulation':
                  facts.regulations = fact.content;
                  break;
                case 'emergency_seasonality':
                  facts.emergency_seasonality = fact.content;
                  break;
              }
            }
            contentParams.local_facts = facts;
            console.log(`✅ Fetched ${localFacts.length} local facts`);
          } else if (factsError) {
            console.warn(`⚠️  Failed to fetch local facts: ${factsError.message}`);
          }
        } catch (error) {
          console.warn(`⚠️  Error fetching local facts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Fetch phone number from domain if not provided
      if (!contentParams.phone_number && contentParams.domain_id) {
        try {
          const { data: domain, error: domainError } = await supabase
            .from('domains')
            .select('phone_number')
            .eq('id', contentParams.domain_id)
            .single();
          
          if (!domainError && domain?.phone_number) {
            contentParams.phone_number = domain.phone_number;
            console.log(`📞 Fetched phone number from domain: ${contentParams.phone_number}`);
          }
        } catch (error) {
          console.warn(`⚠️  Error fetching phone number from domain: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    console.log(`🚀 Calling agentic-content-gen with params:`, JSON.stringify(contentParams, null, 2));

    // Use service role key for function-to-function calls
    // For function-to-function calls, we need JWT format (not function secret)
    // Use JWT token if provided, otherwise use supabaseKey (might be JWT or function secret)
    const serviceRoleKey = jwtToken || (supabaseKey.startsWith('eyJ') ? supabaseKey : null) || supabaseKey;
    
    console.log(`🔑 batch-strategy-processor: Using key for function calls (length: ${serviceRoleKey.length}, isJWT: ${serviceRoleKey.startsWith('eyJ')})`);

    // Call agentic-content-gen function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/agentic-content-gen`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey, // Required for Supabase Edge Functions
        },
        body: JSON.stringify(contentParams),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`agentic-content-gen failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Check for article_id (agentic-content-gen returns article_id directly, not always success field)
    if (result.article_id || result.id) {
      const articleId = result.article_id || result.id;
      
      // Update strategy to "Completed"
      await updateStrategyStatus(supabase, strategyId, 'Completed', articleId);

      console.log(`✅ Successfully generated article: ${articleId}`);

      return {
        strategy_id: strategyId,
        strategy_title: strategyTitle,
        status: 'success',
        article_id: articleId,
      };
    } else if (result.error || result.success === false) {
      throw new Error(result.error || 'Unknown error from agentic-content-gen');
    } else {
      // If we get here, the response doesn't have article_id or error
      throw new Error(`Unexpected response format: ${JSON.stringify(result).substring(0, 200)}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ Failed to process strategy ${strategyId}:`, errorMessage);

    // Update strategy to "Failed"
    await updateStrategyStatus(supabase, strategyId, 'Failed', undefined, errorMessage);

    return {
      strategy_id: strategyId,
      strategy_title: strategyTitle,
      status: 'failed',
      error: errorMessage,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    
    // Prioritize service role key from environment, then from request
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const apikeyHeader = req.headers.get('apikey');
    
    // Use service role key from env first, then from request headers
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       bearerToken ||
                       apikeyHeader ||
                       Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseKey) {
      throw new Error('Supabase API key required. Set SUPABASE_SERVICE_ROLE_KEY in function secrets or pass via Authorization header.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const body: BatchStrategyRequest = await req.json();
    
    const siteId = body.site_id || 'rateroots';
    const limit = Math.min(body.limit || 5, 10); // Max 10 per run
    const priorityLevel = body.priority_level;
    const dryRun = body.dry_run || false;

    console.log(`🔄 Starting batch strategy processor for site: ${siteId}, limit: ${limit}`);

    // Fetch strategies
    const strategies = await fetchStrategies(supabase, siteId, limit, priorityLevel);

    if (strategies.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          failed: 0,
          results: [],
          message: 'No strategies found to process'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Found ${strategies.length} strategies to process`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          succeeded: 0,
          failed: 0,
          results: strategies.map(s => ({
            strategy_id: s.id,
            strategy_title: s.content_title || s.primary_keyword,
            status: 'dry_run' as any,
            note: 'Would be processed in real run'
          })),
          message: 'Dry run - no strategies were actually processed'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process each strategy
    const results: StrategyResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const strategy of strategies) {
      // Pass JWT token for function-to-function calls (bearerToken or apikeyHeader)
      const jwtToken = bearerToken || apikeyHeader;
      const result = await processStrategy(supabase, supabaseUrl, supabaseKey, strategy, jwtToken);
      results.push(result);

      if (result.status === 'success') {
        succeeded++;
      } else {
        failed++;
      }

      // Add small delay between requests to avoid rate limiting
      if (strategies.indexOf(strategy) < strategies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    console.log(`✅ Batch processing complete: ${succeeded} succeeded, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: strategies.length,
        succeeded,
        failed,
        results,
        site_id: siteId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Batch Strategy Processor Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

