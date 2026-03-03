/**
 * Supabase Edge Function: Generate Local Strategies
 * 
 * Generates content strategies for local pages based on domains table.
 * Creates strategies for each city/vertical combination with proper metadata.
 * 
 * Request Body:
 * {
 *   site_id?: string (default: 'homesimple')
 *   city?: string (optional - filter by city)
 *   state?: string (optional - filter by state)
 *   vertical?: string (optional - filter by vertical: hvac, plumbing, pest, roof, windows)
 *   limit?: number (optional - max strategies per city/vertical, default: 5)
 *   create_strategies?: boolean (default: true - actually create them)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   strategies_created: number
 *   strategies: Array<{
 *     id: string
 *     content_title: string
 *     city: string
 *     state: string
 *     vertical: string
 *   }>
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateLocalStrategiesRequest {
  site_id?: string;
  city?: string;
  state?: string;
  vertical?: string;
  limit?: number;
  create_strategies?: boolean;
}

// Common local page titles by vertical
const LOCAL_PAGE_TITLES: Record<string, string[]> = {
  hvac: [
    'AC Not Cooling in {city}? Here\'s What to Do',
    'Emergency AC Repair Services in {city}',
    'Furnace Not Working in {city}: Complete Guide',
    'HVAC Maintenance Services in {city}',
    'Air Duct Cleaning in {city}: What You Need to Know'
  ],
  plumbing: [
    'Emergency Plumbing Services in {city}',
    'Water Heater Repair in {city}: Complete Guide',
    'Drain Cleaning Services in {city}',
    'Leaky Pipe Repair in {city}: What to Do',
    'Plumbing Installation Services in {city}'
  ],
  pest: [
    'Pest Control Services in {city}: Complete Guide',
    'Ant Control in {city}: How to Get Rid of Ants',
    'Rodent Removal Services in {city}',
    'Termite Treatment in {city}: What to Know',
    'Bed Bug Extermination in {city}'
  ],
  roof: [
    'Roof Repair Services in {city}',
    'Roof Leak Repair in {city}: Complete Guide',
    'Roof Replacement in {city}: What to Know',
    'Gutter Cleaning Services in {city}',
    'Storm Damage Roof Repair in {city}'
  ],
  windows: [
    'Window Replacement in {city}: Complete Guide',
    'Window Repair Services in {city}',
    'Energy Efficient Windows in {city}',
    'Broken Window Repair in {city}',
    'Window Installation Services in {city}'
  ]
};

// Primary keywords by vertical
const PRIMARY_KEYWORDS: Record<string, string[]> = {
  hvac: [
    'AC not cooling {city}',
    'emergency AC repair {city}',
    'furnace not working {city}',
    'HVAC maintenance {city}',
    'air duct cleaning {city}'
  ],
  plumbing: [
    'emergency plumber {city}',
    'water heater repair {city}',
    'drain cleaning {city}',
    'leaky pipe repair {city}',
    'plumbing installation {city}'
  ],
  pest: [
    'pest control {city}',
    'ant control {city}',
    'rodent removal {city}',
    'termite treatment {city}',
    'bed bug extermination {city}'
  ],
  roof: [
    'roof repair {city}',
    'roof leak repair {city}',
    'roof replacement {city}',
    'gutter cleaning {city}',
    'storm damage roof repair {city}'
  ],
  windows: [
    'window replacement {city}',
    'window repair {city}',
    'energy efficient windows {city}',
    'broken window repair {city}',
    'window installation {city}'
  ]
};

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
    
    console.log(`🔑 Using Supabase key (length: ${supabaseKey.length}, starts with: ${supabaseKey.substring(0, 10)}...)`);
    
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    const body: GenerateLocalStrategiesRequest = await req.json();
    
    const siteId = body.site_id || 'homesimple';
    const cityFilter = body.city;
    const stateFilter = body.state;
    const verticalFilter = body.vertical;
    const limit = body.limit || 5;
    const createStrategies = body.create_strategies !== false;

    console.log(`🔍 Generating local strategies for site: ${siteId}`);

    // Build query for domains
    // Note: phone_number column may not exist - will be handled gracefully
    let domainsQuery = supabase
      .from('domains')
      .select('*') // Select all columns - phone_number will be null if column doesn't exist
      .eq('status', 'active');

    if (cityFilter) {
      domainsQuery = domainsQuery.eq('city', cityFilter);
    }
    if (stateFilter) {
      domainsQuery = domainsQuery.eq('state', stateFilter);
    }
    if (verticalFilter) {
      domainsQuery = domainsQuery.eq('vertical', verticalFilter);
    }

    const { data: domains, error: domainsError } = await domainsQuery;

    if (domainsError) {
      throw new Error(`Failed to fetch domains: ${domainsError.message}`);
    }

    if (!domains || domains.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          strategies_created: 0,
          strategies: [],
          message: 'No active domains found matching criteria'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Found ${domains.length} domains to process`);

    // Group domains by city/state/vertical
    const domainGroups = new Map<string, typeof domains>();
    for (const domain of domains) {
      const key = `${domain.city}-${domain.state}-${domain.vertical}`;
      if (!domainGroups.has(key)) {
        domainGroups.set(key, []);
      }
      domainGroups.get(key)!.push(domain);
    }

    const strategiesToCreate: any[] = [];

    // Generate strategies for each city/vertical combination
    for (const [key, domainGroup] of domainGroups.entries()) {
      const [city, state, vertical] = key.split('-');
      const domain = domainGroup[0]; // Use first domain for this combination

      // Get titles and keywords for this vertical
      const titles = LOCAL_PAGE_TITLES[vertical] || LOCAL_PAGE_TITLES.hvac;
      const keywords = PRIMARY_KEYWORDS[vertical] || PRIMARY_KEYWORDS.hvac;

      // Create strategies (up to limit)
      for (let i = 0; i < Math.min(limit, titles.length); i++) {
        const title = titles[i].replace('{city}', city);
        const keyword = keywords[i].replace('{city}', city);

        // Check if strategy already exists
        const { data: existing } = await supabase
          .from('content_strategy')
          .select('id')
          .eq('site_id', siteId)
          .eq('primary_keyword', keyword)
          .eq('status', 'Planned')
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`⏭️  Skipping existing strategy: ${title}`);
          continue;
        }

        const strategy = {
          site_id: siteId,
          content_title: title,
          primary_keyword: keyword,
          content_type: 'local_page',
          category: vertical,
          status: 'Planned',
          priority_level: 'High',
          word_count: 2000,
          metadata: {
            city: city,
            state: state,
            vertical: vertical,
            page_type: 'local_page',
            domain_id: domain.id,
            phone_number: (domain as any).phone_number || null,
            call_routing_configured: !!(domain as any).phone_number
          },
          target_date: new Date(Date.now() + (strategiesToCreate.length * 24 * 60 * 60 * 1000)).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        strategiesToCreate.push(strategy);
      }
    }

    console.log(`📝 Prepared ${strategiesToCreate.length} strategies to create`);

    let strategiesCreated = 0;
    const createdStrategies: any[] = [];

    if (createStrategies && strategiesToCreate.length > 0) {
      // Insert strategies in batches of 50
      for (let i = 0; i < strategiesToCreate.length; i += 50) {
        const batch = strategiesToCreate.slice(i, i + 50);
        
        const { data: inserted, error: insertError } = await supabase
          .from('content_strategy')
          .insert(batch)
          .select('id, content_title, metadata');

        if (insertError) {
          console.error(`❌ Failed to insert batch ${i / 50 + 1}:`, insertError);
          // Return error details in response
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to insert strategies: ${insertError.message}`,
              error_details: insertError,
              batch_number: i / 50 + 1,
              strategies_prepared: strategiesToCreate.length
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          strategiesCreated += inserted?.length || 0;
          createdStrategies.push(...(inserted || []));
          console.log(`✅ Created batch ${i / 50 + 1}: ${inserted?.length || 0} strategies`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        strategies_created: strategiesCreated,
        strategies_prepared: strategiesToCreate.length,
        strategies: createdStrategies.map(s => ({
          id: s.id,
          content_title: s.content_title,
          city: s.metadata?.city,
          state: s.metadata?.state,
          vertical: s.metadata?.vertical
        })),
        message: createStrategies 
          ? `Created ${strategiesCreated} local page strategies. Use batch-strategy-processor to generate articles.`
          : `Prepared ${strategiesToCreate.length} strategies (dry run). Set create_strategies=true to create them.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in generate-local-strategies:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

