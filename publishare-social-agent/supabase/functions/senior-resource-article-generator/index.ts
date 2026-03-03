/**
 * Supabase Edge Function: Senior Resource Article Generator
 * 
 * Analyzes senior_resources database to generate article ideas and create
 * content_strategy entries for SeniorSimple.org
 * 
 * Request Body:
 * {
 *   site_id: "seniorsimple" (optional, default: "seniorsimple")
 *   create_strategy_entries: boolean (optional, default: true)
 *   priority_level: "Critical" | "High" | "Medium" | "Low" | "all" (optional, default: "all")
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   resources_analyzed: number
 *   article_ideas_generated: number
 *   strategy_entries_created: number
 *   recommendations: {
 *     pillar_pages: Array<{title: string, priority: string}>
 *     comparison_articles: Array<{title: string, priority: string}>
 *     location_guides: Array<{title: string, state: string, priority: string}>
 *     cost_guides: Array<{title: string, priority: string}>
 *     decision_guides: Array<{title: string, priority: string}>
 *   }
 *   timestamp: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArticleGeneratorRequest {
  site_id?: string;
  create_strategy_entries?: boolean;
  priority_level?: 'Critical' | 'High' | 'Medium' | 'Low' | 'all';
}

interface ArticleIdea {
  title: string;
  content_type: string;
  category: string;
  primary_keyword: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  target_audience: string;
  word_count: number;
  funnel_stage: string;
  call_to_action: string;
  rationale?: string;
}

// Generate pillar page ideas
function generatePillarPages(): ArticleIdea[] {
  return [
    {
      title: 'Complete Guide to Assisted Living: Everything You Need to Know',
      content_type: 'pillar-page',
      category: 'Assisted Living',
      primary_keyword: 'assisted living guide',
      priority: 'Critical',
      target_audience: 'Seniors (65+) and their families researching assisted living options',
      word_count: 3000,
      funnel_stage: 'Awareness',
      call_to_action: 'Get personalized assisted living recommendations at SeniorSimple.org',
      rationale: 'High search volume, foundational content for assisted living vertical',
    },
    {
      title: 'Complete Guide to Memory Care: Understanding Alzheimer\'s and Dementia Care',
      content_type: 'pillar-page',
      category: 'Memory Care',
      primary_keyword: 'memory care guide',
      priority: 'Critical',
      target_audience: 'Families with loved ones experiencing memory loss or dementia',
      word_count: 3000,
      funnel_stage: 'Awareness',
      call_to_action: 'Find memory care facilities near you at SeniorSimple.org',
      rationale: 'High search volume, specialized care needs',
    },
    {
      title: 'Complete Guide to Independent Living for Seniors',
      content_type: 'pillar-page',
      category: 'Independent Living',
      primary_keyword: 'independent living guide',
      priority: 'High',
      target_audience: 'Active seniors (65+) seeking maintenance-free living',
      word_count: 2500,
      funnel_stage: 'Awareness',
      call_to_action: 'Explore independent living communities at SeniorSimple.org',
    },
    {
      title: 'Complete Guide to In-Home Care: Aging in Place with Support',
      content_type: 'pillar-page',
      category: 'In-Home Care',
      primary_keyword: 'in-home care guide',
      priority: 'High',
      target_audience: 'Seniors who want to stay at home with assistance',
      word_count: 2500,
      funnel_stage: 'Awareness',
      call_to_action: 'Find in-home care providers at SeniorSimple.org',
    },
    {
      title: 'Complete Guide to Nursing Homes: When Skilled Nursing is Needed',
      content_type: 'pillar-page',
      category: 'Nursing Homes',
      primary_keyword: 'nursing home guide',
      priority: 'High',
      target_audience: 'Families needing 24/7 skilled nursing care',
      word_count: 2500,
      funnel_stage: 'Awareness',
      call_to_action: 'Compare nursing home options at SeniorSimple.org',
    },
    {
      title: 'Complete Guide to Hospice Care: End-of-Life Support and Comfort',
      content_type: 'pillar-page',
      category: 'Hospice Care',
      primary_keyword: 'hospice care guide',
      priority: 'Medium',
      target_audience: 'Families facing end-of-life decisions',
      word_count: 2000,
      funnel_stage: 'Awareness',
      call_to_action: 'Learn about hospice care options at SeniorSimple.org',
    },
  ];
}

// Generate comparison article ideas
function generateComparisonArticles(): ArticleIdea[] {
  return [
    {
      title: 'Assisted Living vs Memory Care: Which is Right for Your Loved One?',
      content_type: 'comparison',
      category: 'Senior Living Options',
      primary_keyword: 'assisted living vs memory care',
      priority: 'Critical',
      target_audience: 'Families deciding between assisted living and memory care',
      word_count: 2500,
      funnel_stage: 'Consideration',
      call_to_action: 'Get personalized recommendations at SeniorSimple.org',
    },
    {
      title: 'Assisted Living vs Independent Living: Key Differences Explained',
      content_type: 'comparison',
      category: 'Senior Living Options',
      primary_keyword: 'assisted living vs independent living',
      priority: 'High',
      target_audience: 'Seniors comparing living options',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Compare your options at SeniorSimple.org',
    },
    {
      title: 'In-Home Care vs Assisted Living: Cost and Care Comparison',
      content_type: 'comparison',
      category: 'Senior Living Options',
      primary_keyword: 'in-home care vs assisted living',
      priority: 'High',
      target_audience: 'Families weighing home care vs facility care',
      word_count: 2500,
      funnel_stage: 'Consideration',
      call_to_action: 'Calculate costs at SeniorSimple.org',
    },
    {
      title: 'Nursing Home vs Assisted Living: When to Choose Each',
      content_type: 'comparison',
      category: 'Senior Living Options',
      primary_keyword: 'nursing home vs assisted living',
      priority: 'High',
      target_audience: 'Families determining care level needed',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Assess care needs at SeniorSimple.org',
    },
    {
      title: 'Memory Care vs Nursing Home: Understanding the Differences',
      content_type: 'comparison',
      category: 'Senior Living Options',
      primary_keyword: 'memory care vs nursing home',
      priority: 'Medium',
      target_audience: 'Families with dementia/Alzheimer\'s concerns',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Find memory care options at SeniorSimple.org',
    },
  ];
}

// Generate location-specific guides based on resource data
async function generateLocationGuides(
  supabase: any,
  siteId: string
): Promise<ArticleIdea[]> {
  const ideas: ArticleIdea[] = [];
  
  // Get resource counts by state
  const { data: stateCounts } = await supabase
    .from('senior_resources')
    .select('state, resource_type')
    .eq('site_id', siteId)
    .eq('is_published', true);
  
  if (!stateCounts) return ideas;
  
  // Group by state and resource type
  const stateMap: Record<string, Record<string, number>> = {};
  
  for (const resource of stateCounts) {
    if (!resource.state || !resource.resource_type) continue;
    
    if (!stateMap[resource.state]) {
      stateMap[resource.state] = {};
    }
    
    stateMap[resource.state][resource.resource_type] = 
      (stateMap[resource.state][resource.resource_type] || 0) + 1;
  }
  
  // Generate guides for top states (by resource count)
  const stateTotals = Object.entries(stateMap).map(([state, types]) => ({
    state,
    total: Object.values(types).reduce((sum, count) => sum + count, 0),
  })).sort((a, b) => b.total - a.total).slice(0, 20); // Top 20 states
  
  for (const { state } of stateTotals) {
    // Assisted Living guide
    ideas.push({
      title: `Best Assisted Living Facilities in ${getStateName(state)}`,
      content_type: 'location-guide',
      category: 'Assisted Living',
      primary_keyword: `assisted living ${state.toLowerCase()}`,
      priority: stateTotals.indexOf({ state, total: 0 }) < 10 ? 'High' : 'Medium',
      target_audience: `Seniors and families in ${getStateName(state)} seeking assisted living`,
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: `Find assisted living in ${getStateName(state)} at SeniorSimple.org`,
    });
    
    // Memory Care guide
    if (stateMap[state]?.['memory-care'] && stateMap[state]['memory-care'] > 5) {
      ideas.push({
        title: `Best Memory Care Facilities in ${getStateName(state)}`,
        content_type: 'location-guide',
        category: 'Memory Care',
        primary_keyword: `memory care ${state.toLowerCase()}`,
        priority: 'Medium',
        target_audience: `Families in ${getStateName(state)} seeking memory care`,
        word_count: 2000,
        funnel_stage: 'Consideration',
        call_to_action: `Find memory care in ${getStateName(state)} at SeniorSimple.org`,
      });
    }
  }
  
  return ideas;
}

// Generate cost guides
function generateCostGuides(): ArticleIdea[] {
  return [
    {
      title: 'How Much Does Assisted Living Cost? Complete Cost Breakdown',
      content_type: 'how-to',
      category: 'Assisted Living',
      primary_keyword: 'assisted living cost',
      priority: 'Critical',
      target_audience: 'Families planning for assisted living expenses',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Calculate assisted living costs at SeniorSimple.org',
    },
    {
      title: 'How Much Does Memory Care Cost? Pricing Guide for 2025',
      content_type: 'how-to',
      category: 'Memory Care',
      primary_keyword: 'memory care cost',
      priority: 'High',
      target_audience: 'Families budgeting for memory care',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Get memory care cost estimates at SeniorSimple.org',
    },
    {
      title: 'How Much Does In-Home Care Cost? Hourly and Monthly Rates',
      content_type: 'how-to',
      category: 'In-Home Care',
      primary_keyword: 'in-home care cost',
      priority: 'High',
      target_audience: 'Seniors considering in-home care',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Compare in-home care costs at SeniorSimple.org',
    },
    {
      title: 'Medicare and Assisted Living: What\'s Covered and What\'s Not',
      content_type: 'article',
      category: 'Financing',
      primary_keyword: 'medicare assisted living',
      priority: 'High',
      target_audience: 'Seniors exploring Medicare coverage for assisted living',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Learn about financing options at SeniorSimple.org',
    },
    {
      title: 'Medicaid and Assisted Living: Eligibility and Coverage by State',
      content_type: 'article',
      category: 'Financing',
      primary_keyword: 'medicaid assisted living',
      priority: 'High',
      target_audience: 'Low-income seniors seeking Medicaid assistance',
      word_count: 2500,
      funnel_stage: 'Consideration',
      call_to_action: 'Check Medicaid eligibility at SeniorSimple.org',
    },
  ];
}

// Generate decision guides
function generateDecisionGuides(): ArticleIdea[] {
  return [
    {
      title: 'How to Choose an Assisted Living Facility: 10 Essential Questions',
      content_type: 'how-to',
      category: 'Assisted Living',
      primary_keyword: 'how to choose assisted living',
      priority: 'High',
      target_audience: 'Families selecting an assisted living facility',
      word_count: 2000,
      funnel_stage: 'Decision',
      call_to_action: 'Get facility recommendations at SeniorSimple.org',
    },
    {
      title: 'Questions to Ask When Touring Memory Care Facilities',
      content_type: 'how-to',
      category: 'Memory Care',
      primary_keyword: 'memory care tour questions',
      priority: 'High',
      target_audience: 'Families touring memory care facilities',
      word_count: 2000,
      funnel_stage: 'Decision',
      call_to_action: 'Find memory care facilities at SeniorSimple.org',
    },
    {
      title: 'Signs Your Loved One Needs Assisted Living: When to Make the Move',
      content_type: 'article',
      category: 'Assisted Living',
      primary_keyword: 'signs need assisted living',
      priority: 'High',
      target_audience: 'Families evaluating if assisted living is needed',
      word_count: 2000,
      funnel_stage: 'Awareness',
      call_to_action: 'Assess care needs at SeniorSimple.org',
    },
    {
      title: 'When to Move from Independent to Assisted Living',
      content_type: 'article',
      category: 'Senior Living Options',
      primary_keyword: 'when to move to assisted living',
      priority: 'Medium',
      target_audience: 'Seniors in independent living considering next step',
      word_count: 2000,
      funnel_stage: 'Consideration',
      call_to_action: 'Explore assisted living options at SeniorSimple.org',
    },
  ];
}

// Helper: Get state name from code
function getStateName(code: string): string {
  const states: Record<string, string> = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
  };
  return states[code.toUpperCase()] || code;
}

// Main serve function
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: ArticleGeneratorRequest = await req.json();
    
    const siteId = body.site_id || 'seniorsimple';
    const createStrategyEntries = body.create_strategy_entries !== false;
    const priorityFilter = body.priority_level || 'all';
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get resource count
    const { count: resourceCount } = await supabase
      .from('senior_resources')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('is_published', true);
    
    // Generate all article ideas
    const pillarPages = generatePillarPages();
    const comparisonArticles = generateComparisonArticles();
    const costGuides = generateCostGuides();
    const decisionGuides = generateDecisionGuides();
    const locationGuides = await generateLocationGuides(supabase, siteId);
    
    // Filter by priority if specified
    const filterByPriority = (ideas: ArticleIdea[]) => {
      if (priorityFilter === 'all') return ideas;
      return ideas.filter(idea => idea.priority === priorityFilter);
    };
    
    const allIdeas: ArticleIdea[] = [
      ...filterByPriority(pillarPages),
      ...filterByPriority(comparisonArticles),
      ...filterByPriority(costGuides),
      ...filterByPriority(decisionGuides),
      ...filterByPriority(locationGuides),
    ];
    
    // Create content_strategy entries if requested
    let strategyEntriesCreated = 0;
    if (createStrategyEntries && allIdeas.length > 0) {
      const strategyEntries = allIdeas.map((idea, index) => ({
        site_id: siteId,
        content_title: idea.title,
        primary_keyword: idea.primary_keyword,
        content_type: idea.content_type,
        category: idea.category,
        target_audience: idea.target_audience,
        word_count: idea.word_count,
        priority_level: idea.priority,
        status: 'Planned',
        content_pillar: idea.category,
        search_volume: null,
        funnel_stage: idea.funnel_stage,
        call_to_action: idea.call_to_action,
        target_date: new Date(Date.now() + (index * 24 * 60 * 60 * 1000)).toISOString(), // Stagger by 1 day
      }));
      
      const { data: inserted, error: insertError } = await supabase
        .from('content_strategy')
        .insert(strategyEntries)
        .select('id');
      
      if (insertError) {
        console.error('Failed to create strategy entries:', insertError.message);
      } else {
        strategyEntriesCreated = inserted?.length || 0;
      }
    }
    
    const response = {
      success: true,
      resources_analyzed: resourceCount || 0,
      article_ideas_generated: allIdeas.length,
      strategy_entries_created: strategyEntriesCreated,
      recommendations: {
        pillar_pages: pillarPages.map(i => ({ title: i.title, priority: i.priority })),
        comparison_articles: comparisonArticles.map(i => ({ title: i.title, priority: i.priority })),
        location_guides: locationGuides.map(i => ({ 
          title: i.title, 
          state: i.primary_keyword.split(' ').pop()?.toUpperCase() || '', 
          priority: i.priority 
        })),
        cost_guides: costGuides.map(i => ({ title: i.title, priority: i.priority })),
        decision_guides: decisionGuides.map(i => ({ title: i.title, priority: i.priority })),
      },
      timestamp: new Date().toISOString(),
    };
    
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





