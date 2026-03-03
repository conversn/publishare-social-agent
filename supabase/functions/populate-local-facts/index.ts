/**
 * Supabase Edge Function: Populate Local Facts
 * 
 * Researches and populates local_facts table with city-specific information
 * for HomeSimple local SEO pages. Uses AI to extract:
 * - Neighborhoods
 * - Climate notes
 * - Common home service issues
 * - Local regulations
 * - Emergency seasonality
 * 
 * Request Body:
 * {
 *   city: string (required)
 *   state: string (required, 2-letter code)
 *   vertical: string (required) - hvac, plumbing, pest, roof, windows, etc
 *   fact_types?: string[] (optional) - Specific fact types to fetch, or all if omitted
 *   use_ai?: boolean (optional, default: true) - Use AI for extraction
 *   update_existing?: boolean (optional, default: true) - Update existing facts
 *   dry_run?: boolean (optional, default: false)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   facts_added: number
 *   facts_updated: number
 *   facts_skipped: number
 *   errors: number
 *   results: Array<{
 *     fact_type: string
 *     content: string
 *     status: 'added' | 'updated' | 'skipped' | 'error'
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

interface PopulateLocalFactsRequest {
  // Single city mode
  city?: string;
  state?: string;
  vertical?: string;
  // Batch mode (process multiple cities)
  batch?: Array<{
    city: string;
    state: string;
    vertical: string;
  }>;
  fact_types?: string[]; // neighborhood, climate, regulation, common_issue, emergency_seasonality
  use_ai?: boolean;
  update_existing?: boolean;
  dry_run?: boolean;
  max_concurrent?: number; // Max concurrent AI requests (default: 3)
}

interface LocalFactResult {
  fact_type: string;
  content: string;
  status: 'added' | 'updated' | 'skipped' | 'error';
  error?: string;
}

interface PopulateLocalFactsResponse {
  success: boolean;
  facts_added: number;
  facts_updated: number;
  facts_skipped: number;
  errors: number;
  results: LocalFactResult[];
  batch_results?: Array<{
    city: string;
    state: string;
    vertical: string;
    facts_added: number;
    facts_updated: number;
    facts_skipped: number;
    errors: number;
    status: 'success' | 'error';
    error?: string;
  }>;
}

/**
 * Research local facts using DeepSeek AI
 */
async function researchLocalFactsWithAI(
  city: string,
  state: string,
  vertical: string,
  factTypes: string[]
): Promise<Record<string, string[]>> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DeepSeek API key not configured (DEEPSEEK_API_KEY)');
  }

  const factTypeDescriptions: Record<string, string> = {
    neighborhood: 'major neighborhoods, districts, or service areas',
    climate: 'climate characteristics, seasonal weather patterns, and how they affect home services',
    regulation: 'local building codes, permit requirements, or regulations relevant to home services',
    common_issue: `common ${vertical} problems specific to ${city}, ${state}`,
    emergency_seasonality: 'when emergency calls are most common (seasonal patterns, weather-related spikes)'
  };

  const prompt = `You are a local SEO researcher. Research and provide specific, factual information about ${city}, ${state} for ${vertical} services.

Provide information for these categories:
${factTypes.map(type => `- ${type}: ${factTypeDescriptions[type] || type}`).join('\n')}

Requirements:
- Be specific to ${city}, ${state} (not generic)
- Provide factual, verifiable information
- For neighborhoods: list 5-10 major neighborhoods/districts
- For climate: focus on how weather affects ${vertical} services
- For regulations: mention specific codes or permit requirements if relevant
- For common issues: list 3-5 city-specific problems
- For emergency seasonality: describe when emergency calls peak (e.g., "summer AC failures", "winter pipe freezes")

Return as JSON object:
{
  "neighborhood": ["Neighborhood 1", "Neighborhood 2", ...],
  "climate": "Climate description text",
  "regulation": "Regulation description text",
  "common_issue": ["Issue 1", "Issue 2", ...],
  "emergency_seasonality": "Seasonality description text"
}

Only include categories that were requested.`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a local SEO researcher. Return only valid JSON, no markdown, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`DeepSeek API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let parsed: Record<string, any> = {};
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Convert arrays to proper format
    const facts: Record<string, string[]> = {};
    for (const factType of factTypes) {
      if (parsed[factType]) {
        if (Array.isArray(parsed[factType])) {
          facts[factType] = parsed[factType];
        } else if (typeof parsed[factType] === 'string') {
          // For single string facts (climate, regulation, emergency_seasonality), wrap in array
          if (factType === 'neighborhood' || factType === 'common_issue') {
            // These should be arrays, split by comma or newline
            facts[factType] = parsed[factType]
              .split(/[,\n]/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
          } else {
            // Single string facts
            facts[factType] = [parsed[factType]];
          }
        }
      }
    }

    return facts;
  } catch (error) {
    console.error('Error researching local facts with AI:', error);
    throw error;
  }
}

/**
 * Process a single city/vertical combination
 */
async function processSingleCity(
  supabase: any,
  city: string,
  state: string,
  vertical: string,
  factTypes: string[],
  useAI: boolean,
  updateExisting: boolean,
  dryRun: boolean
): Promise<{
  city: string;
  state: string;
  vertical: string;
  facts_added: number;
  facts_updated: number;
  facts_skipped: number;
  errors: number;
  status: 'success' | 'error';
  error?: string;
  results: LocalFactResult[];
}> {
  const result = {
    city,
    state,
    vertical,
    facts_added: 0,
    facts_updated: 0,
    facts_skipped: 0,
    errors: 0,
    status: 'success' as 'success' | 'error',
    results: [] as LocalFactResult[]
  };

  try {
    // Research facts using AI
    let facts: Record<string, string[]> = {};
    
    if (useAI) {
      facts = await researchLocalFactsWithAI(city, state, vertical, factTypes);
    }

    // Store facts to database
    for (const factType of factTypes) {
      const factData = facts[factType];
      
      if (!factData || factData.length === 0) {
        result.results.push({
          fact_type: factType,
          content: '',
          status: 'skipped'
        });
        result.facts_skipped++;
        continue;
      }

      // For array facts (neighborhood, common_issue), store each item separately
      if (factType === 'neighborhood' || factType === 'common_issue') {
        for (const item of factData) {
          const storeResult = await storeLocalFact(
            supabase,
            city,
            state,
            vertical,
            factType,
            item,
            updateExisting,
            dryRun
          );

          result.results.push({
            fact_type: factType,
            content: item,
            status: storeResult.status,
            error: storeResult.error
          });

          if (storeResult.status === 'added') {
            result.facts_added++;
          } else if (storeResult.status === 'updated') {
            result.facts_updated++;
          } else if (storeResult.status === 'skipped') {
            result.facts_skipped++;
          } else {
            result.errors++;
          }
        }
      } else {
        // Store as single fact
        const content = Array.isArray(factData) ? factData.join('\n') : factData;
        
        const storeResult = await storeLocalFact(
          supabase,
          city,
          state,
          vertical,
          factType,
          content,
          updateExisting,
          dryRun
        );

        result.results.push({
          fact_type: factType,
          content: content,
          status: storeResult.status,
          error: storeResult.error
        });

        if (storeResult.status === 'added') {
          result.facts_added++;
        } else if (storeResult.status === 'updated') {
          result.facts_updated++;
        } else if (storeResult.status === 'skipped') {
          result.facts_skipped++;
        } else {
          result.errors++;
        }
      }
    }
  } catch (error) {
    result.status = 'error';
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.errors++;
  }

  return result;
}

/**
 * Process batch mode with concurrency control
 */
async function processBatchMode(
  supabase: any,
  batch: Array<{ city: string; state: string; vertical: string }>,
  factTypes: string[],
  useAI: boolean,
  updateExisting: boolean,
  dryRun: boolean,
  maxConcurrent: number
): Promise<Response> {
  const response: PopulateLocalFactsResponse = {
    success: true,
    facts_added: 0,
    facts_updated: 0,
    facts_skipped: 0,
    errors: 0,
    results: [],
    batch_results: []
  };

  // Process in batches with concurrency limit
  for (let i = 0; i < batch.length; i += maxConcurrent) {
    const batchChunk = batch.slice(i, i + maxConcurrent);
    
    console.log(`📦 Processing batch ${Math.floor(i / maxConcurrent) + 1}: ${batchChunk.length} cities`);

    // Process chunk concurrently
    const chunkPromises = batchChunk.map(item =>
      processSingleCity(
        supabase,
        item.city,
        item.state,
        item.vertical,
        factTypes,
        useAI,
        updateExisting,
        dryRun
      )
    );

    const chunkResults = await Promise.all(chunkPromises);

    // Aggregate results
    for (const chunkResult of chunkResults) {
      response.facts_added += chunkResult.facts_added;
      response.facts_updated += chunkResult.facts_updated;
      response.facts_skipped += chunkResult.facts_skipped;
      response.errors += chunkResult.errors;
      response.results.push(...chunkResult.results);
      
      response.batch_results!.push({
        city: chunkResult.city,
        state: chunkResult.state,
        vertical: chunkResult.vertical,
        facts_added: chunkResult.facts_added,
        facts_updated: chunkResult.facts_updated,
        facts_skipped: chunkResult.facts_skipped,
        errors: chunkResult.errors,
        status: chunkResult.status,
        error: chunkResult.error
      });

      if (chunkResult.status === 'error') {
        response.success = false;
      }
    }

    // Rate limiting: small delay between batches
    if (i + maxConcurrent < batch.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  }

  console.log(`✅ Batch processing complete: ${response.facts_added} added, ${response.facts_updated} updated across ${batch.length} cities`);

  return new Response(
    JSON.stringify(response),
    {
      status: response.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Store local fact to database
 */
async function storeLocalFact(
  supabase: any,
  city: string,
  state: string,
  vertical: string,
  factType: string,
  content: string,
  updateExisting: boolean,
  dryRun: boolean
): Promise<{ status: 'added' | 'updated' | 'skipped' | 'error'; error?: string }> {
  try {
    // Check if fact already exists
    const { data: existing, error: fetchError } = await supabase
      .from('local_facts')
      .select('id, content')
      .eq('city', city)
      .eq('state', state)
      .eq('vertical', vertical)
      .eq('fact_type', factType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      return { status: 'error', error: fetchError.message };
    }

    if (existing) {
      if (!updateExisting) {
        return { status: 'skipped' };
      }

      // Update existing fact
      if (dryRun) {
        return { status: 'updated' };
      }

      const { error: updateError } = await supabase
        .from('local_facts')
        .update({
          content: content,
          verified: false, // Reset verified status when updated
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        return { status: 'error', error: updateError.message };
      }

      return { status: 'updated' };
    } else {
      // Insert new fact
      if (dryRun) {
        return { status: 'added' };
      }

      const { error: insertError } = await supabase
        .from('local_facts')
        .insert({
          city: city,
          state: state,
          vertical: vertical,
          fact_type: factType,
          content: content,
          verified: false,
          source_url: null
        });

      if (insertError) {
        return { status: 'error', error: insertError.message };
      }

      return { status: 'added' };
    }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: PopulateLocalFactsRequest = await req.json();
    
    // Determine if batch mode or single city mode
    const isBatchMode = !!body.batch && body.batch.length > 0;
    
    if (!isBatchMode && (!body.city || !body.state || !body.vertical)) {
      return new Response(
        JSON.stringify({
          success: false,
          facts_added: 0,
          facts_updated: 0,
          facts_skipped: 0,
          errors: 0,
          results: [],
          error: 'Either (city, state, vertical) or batch array is required'
        } as any),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const factTypes = body.fact_types || [
      'neighborhood',
      'climate',
      'regulation',
      'common_issue',
      'emergency_seasonality'
    ];

    const useAI = body.use_ai !== false;
    const updateExisting = body.update_existing !== false;
    const dryRun = body.dry_run || false;
    const maxConcurrent = body.max_concurrent || 3;

    // Batch mode processing
    if (isBatchMode) {
      console.log(`📦 Batch mode: Processing ${body.batch!.length} city/vertical combinations`);
      return await processBatchMode(
        supabase,
        body.batch!,
        factTypes,
        useAI,
        updateExisting,
        dryRun,
        maxConcurrent
      );
    }

    // Single city mode
    console.log(`🔍 Researching local facts for ${body.city}, ${body.state} - ${body.vertical}`);

    const singleResult = await processSingleCity(
      supabase,
      body.city!,
      body.state!,
      body.vertical!,
      factTypes,
      useAI,
      updateExisting,
      dryRun
    );

    const response: PopulateLocalFactsResponse = {
      success: singleResult.status === 'success',
      facts_added: singleResult.facts_added,
      facts_updated: singleResult.facts_updated,
      facts_skipped: singleResult.facts_skipped,
      errors: singleResult.errors,
      results: singleResult.results
    };

    if (singleResult.error) {
      response.results.push({
        fact_type: 'processing',
        content: '',
        status: 'error',
        error: singleResult.error
      });
    }

    console.log(`✅ Local facts population complete: ${response.facts_added} added, ${response.facts_updated} updated, ${response.facts_skipped} skipped, ${response.errors} errors`);

    return new Response(
      JSON.stringify(response),
      {
        status: response.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Populate Local Facts Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        facts_added: 0,
        facts_updated: 0,
        facts_skipped: 0,
        errors: 1,
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as any),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

