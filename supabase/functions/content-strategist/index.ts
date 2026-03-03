import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentGap {
  ux_category_slug: string;
  ux_category_name: string;
  article_count: number;
  priority: number;
  recommended_articles: string[];
  similar_content_ids?: string[];
  re_categorization_opportunities?: Array<{
    article_id: string;
    article_title: string;
    current_category: string;
    suggested_category: string;
  }>;
}

interface ContentStrategyRecommendation {
  site_id: string;
  analysis_date: string;
  total_articles: number;
  categories_with_content: number;
  categories_without_content: number;
  gaps: ContentGap[];
  immediate_actions: Array<{
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    articles_to_create?: string[];
    articles_to_re_categorize?: Array<{
      article_id: string;
      article_title: string;
      from_category: string;
      to_category: string;
    }>;
  }>;
  content_creation_plan: {
    priority_1: ContentGap[];
    priority_2: ContentGap[];
    priority_3: ContentGap[];
    priority_4: ContentGap[];
  };
  estimated_articles_needed: number;
  estimated_time_to_complete: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { site_id, create_strategy_entries, ux_categories } = await req.json();
    
    if (!site_id) {
      return new Response(
        JSON.stringify({ error: 'site_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all UX categories for the site
    const { data: uxCategories, error: uxError } = await supabase
      .from('ux_categories')
      .select('id, name, slug, description')
      .eq('site_id', site_id)
      .eq('is_active', true)
      .order('display_order');

    if (uxError) {
      throw new Error(`Failed to fetch UX categories: ${uxError.message}`);
    }

    // Get article counts per UX category
    const { data: articlesWithCategories, error: articlesError } = await supabase
      .from('articles_with_primary_ux_category')
      .select('id, title, primary_ux_category_slug, primary_ux_category_name, category, site_id')
      .eq('site_id', site_id)
      .eq('status', 'published');

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    // Analyze gaps
    const gaps: ContentGap[] = [];
    const immediateActions: ContentStrategyRecommendation['immediate_actions'] = [];
    const reCategorizationOpportunities: Array<{
      article_id: string;
      article_title: string;
      current_category: string;
      suggested_category: string;
    }> = [];

    for (const uxCategory of uxCategories || []) {
      const articlesInCategory = (articlesWithCategories || []).filter(
        a => a.primary_ux_category_slug === uxCategory.slug
      );
      
      const articleCount = articlesInCategory.length;
      
      // Determine priority based on category
      let priority = 4; // Default low priority
      let recommendedArticles: string[] = [];
      
      if (articleCount === 0) {
        // High priority categories (revenue drivers, funnel feeders)
        if (uxCategory.slug === 'financial-planning') {
          priority = 1;
          recommendedArticles = [
            '529 Plan Basics: Everything Parents Need to Know',
            'How to Calculate Your College Savings Goal',
            'Life Insurance for Parents: Protecting Your Family\'s Future',
            'Estate Planning Essentials for College-Bound Families',
            'Financial Aid vs. Merit Scholarships: A Parent\'s Guide',
            '529 Plan Contribution Limits and Rules',
            'Tax Benefits of 529 Plans: Complete Guide',
            'Life Insurance for New Parents: Complete Guide',
            'Estate Planning for Families: Complete Guide',
            'College Cost Calculators: How to Plan Ahead'
          ];
        } else if (uxCategory.slug === 'high-school') {
          priority = 2;
          recommendedArticles = [
            'GPA Optimization Strategies for College Admissions',
            'SAT vs. ACT: Which Test Should Your Student Take?',
            'Building a Strong Extracurricular Profile',
            'How to Get Strong Teacher Recommendations',
            'AP Course Selection Guide for College-Bound Students',
            'High School Course Selection: Complete Guide',
            'Standardized Testing Strategy: SAT vs. ACT',
            'Extracurricular Activities for College: Complete Guide',
            'Junior Year of High School: Complete Guide',
            'Senior Year of High School: Complete Guide'
          ];
        } else if (uxCategory.slug === 'middle-school') {
          priority = 3;
          recommendedArticles = [
            'Middle School Course Selection: Setting Up for Success',
            'Study Skills and Time Management for Teens',
            'Preparing for High School: A Parent\'s Guide',
            'Summer Programs and Enrichment Opportunities',
            'Building Academic Foundations in Middle School',
            'Middle School Academic Planning: Setting the Stage',
            'Extracurricular Activities for Middle Schoolers',
            'Preparing for High School: Complete Guide for 8th Grade Parents'
          ];
        } else if (uxCategory.slug === 'early-years') {
          priority = 4;
          recommendedArticles = [
            'Early Childhood Development Milestones',
            'Choosing the Right Preschool for Your Child',
            'Learning Through Play: Educational Strategies',
            'Building Academic Foundations (Ages 0-10)',
            'Character Development and Values Education',
            'Early Childhood Development: Building Foundations',
            '529 Plans for Babies: Complete Guide to Starting Early'
          ];
        }

        // Find similar content that could be re-categorized
        const similarContent = await findSimilarContent(supabase, site_id, uxCategory);
        const reCatOps = similarContent.map(article => ({
          article_id: article.id,
          article_title: article.title,
          from_category: article.primary_ux_category_slug || 'resources',
          to_category: uxCategory.slug
        }));

        gaps.push({
          ux_category_slug: uxCategory.slug,
          ux_category_name: uxCategory.name,
          article_count: articleCount,
          priority,
          recommended_articles: recommendedArticles,
          similar_content_ids: similarContent.map(a => a.id),
          re_categorization_opportunities: reCatOps.length > 0 ? reCatOps : undefined
        });

        // Add immediate action for critical gaps
        if (priority <= 2) {
          immediateActions.push({
            action: `Create foundational content for ${uxCategory.name}`,
            priority: priority === 1 ? 'critical' : 'high',
            description: `${uxCategory.name} has no published articles. Create at least 2-3 foundational articles to prevent 404s and support user navigation.`,
            articles_to_create: recommendedArticles.slice(0, 3),
            articles_to_re_categorize: reCatOps.length > 0 ? reCatOps.slice(0, 3) : undefined
          });
        }
      }
    }

    // Sort gaps by priority
    gaps.sort((a, b) => a.priority - b.priority);

    // Group by priority
    const contentCreationPlan = {
      priority_1: gaps.filter(g => g.priority === 1),
      priority_2: gaps.filter(g => g.priority === 2),
      priority_3: gaps.filter(g => g.priority === 3),
      priority_4: gaps.filter(g => g.priority === 4)
    };

    // Calculate estimates
    const totalArticlesNeeded = gaps.reduce((sum, gap) => sum + gap.recommended_articles.length, 0);
    const estimatedTime = calculateEstimatedTime(gaps);

    // Build recommendation
    const recommendation: ContentStrategyRecommendation = {
      site_id,
      analysis_date: new Date().toISOString(),
      total_articles: articlesWithCategories?.length || 0,
      categories_with_content: uxCategories.filter(cat => {
        const count = (articlesWithCategories || []).filter(
          a => a.primary_ux_category_slug === cat.slug
        ).length;
        return count > 0;
      }).length,
      categories_without_content: gaps.length,
      gaps,
      immediate_actions: immediateActions,
      content_creation_plan: contentCreationPlan,
      estimated_articles_needed: totalArticlesNeeded,
      estimated_time_to_complete: estimatedTime
    };

    // Optionally create content_strategy entries
    let strategyEntriesCreated = 0;
    if (create_strategy_entries) {
      const targetCategories = ux_categories || ['early-years', 'middle-school'];
      const targetGaps = gaps.filter(g => targetCategories.includes(g.ux_category_slug));
      
      const strategyEntries = [];
      
      for (const gap of targetGaps) {
        // Get UX category details for mapping
        const uxCategory = uxCategories.find(c => c.slug === gap.ux_category_slug);
        
        // Map UX category to content strategy category
        const categoryMapping: Record<string, string> = {
          'early-years': 'Early Years',
          'middle-school': 'Middle School',
          'high-school': 'High School',
          'financial-planning': 'Financial Planning',
          'college-planning': 'College Planning'
        };
        
        const contentCategory = categoryMapping[gap.ux_category_slug] || gap.ux_category_name;
        
        // Create strategy entries for recommended articles (limit to 10 per category)
        for (const articleTitle of gap.recommended_articles.slice(0, 10)) {
          // Determine content type from title
          let contentType = 'article';
          const titleLower = articleTitle.toLowerCase();
          if (titleLower.includes('how to') || titleLower.includes('how do')) {
            contentType = 'how-to';
          } else if (titleLower.includes(' vs ') || titleLower.includes('comparison') || titleLower.includes('compare')) {
            contentType = 'comparison';
          } else if (titleLower.includes('complete guide') || titleLower.includes('guide to')) {
            contentType = 'pillar-page';
          }
          
          // Extract primary keyword from title
          const primaryKeyword = articleTitle.split(':')[0].toLowerCase() || 
                                articleTitle.split(' - ')[0].toLowerCase() ||
                                articleTitle.toLowerCase();
          
          strategyEntries.push({
            site_id: site_id,
            content_title: articleTitle,
            primary_keyword: primaryKeyword,
            content_type: contentType,
            category: contentCategory,
            target_audience: 'Affluent parents (40-55, $150K+ income) with college-bound children seeking expert guidance',
            word_count: gap.ux_category_slug === 'early-years' ? 2000 : 2500,
            priority_level: gap.priority === 1 ? 'Critical' : gap.priority === 2 ? 'High' : gap.priority === 3 ? 'Medium' : 'Low',
            status: 'Planned',
            content_pillar: gap.ux_category_name,
            search_volume: null,
            funnel_stage: 'Awareness',
            call_to_action: `Get expert guidance at ${site_id === 'parentsimple' ? 'ParentSimple.org' : 'your-site.com'}`,
            target_date: new Date(Date.now() + (strategyEntries.length * 24 * 60 * 60 * 1000)).toISOString() // Stagger by 1 day
          });
        }
      }
      
      if (strategyEntries.length > 0) {
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
    }

    // Add strategy entries info to response
    const response = {
      ...recommendation,
      ...(create_strategy_entries ? {
        strategy_entries_created: strategyEntriesCreated,
        message: `Created ${strategyEntriesCreated} content strategy entries. Use batch-strategy-processor to generate articles.`
      } : {})
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in content-strategist:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Find similar content that could be re-categorized
 */
async function findSimilarContent(
  supabase: any,
  siteId: string,
  targetCategory: { slug: string; name: string; description?: string }
): Promise<Array<{ id: string; title: string; primary_ux_category_slug: string | null }>> {
  // Define keyword mappings for each category
  const keywordMap: Record<string, string[]> = {
    'financial-planning': [
      '529', 'life insurance', 'estate planning', 'financial planning', 
      'college savings', 'tax', 'insurance', 'financial aid', 'merit scholarship'
    ],
    'high-school': [
      'high school', 'gpa', 'sat', 'act', 'ap', 'extracurricular', 
      'teacher recommendation', 'college prep', 'course selection', 'transcript'
    ],
    'middle-school': [
      'middle school', '8th grade', 'course selection', 'study skills', 
      'academic planning', 'preparing for high school'
    ],
    'early-years': [
      'early childhood', 'preschool', 'baby', 'toddler', 'foundation', 
      'development milestone', 'learning through play'
    ]
  };

  const keywords = keywordMap[targetCategory.slug] || [];
  
  if (keywords.length === 0) {
    return [];
  }

  // Search for articles with matching keywords
  const { data: allArticles, error } = await supabase
    .from('articles_with_primary_ux_category')
    .select('id, title, primary_ux_category_slug, category, content')
    .eq('site_id', siteId)
    .eq('status', 'published')
    .not('primary_ux_category_slug', 'eq', targetCategory.slug); // Exclude already in this category

  if (error || !allArticles) {
    return [];
  }

  // Filter articles that contain relevant keywords
  const matchingArticles = allArticles.filter(article => {
    const searchText = `${article.title} ${article.category || ''}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  });

  // Return top 5 matches
  return matchingArticles.slice(0, 5).map(a => ({
    id: a.id,
    title: a.title,
    primary_ux_category_slug: a.primary_ux_category_slug
  }));
}

/**
 * Calculate estimated time to complete content creation
 */
function calculateEstimatedTime(gaps: ContentGap[]): string {
  const articlesPerDay = 2; // Conservative estimate
  const totalArticles = gaps.reduce((sum, gap) => sum + gap.recommended_articles.length, 0);
  const days = Math.ceil(totalArticles / articlesPerDay);
  
  if (days <= 7) {
    return `${days} days`;
  } else if (days <= 30) {
    const weeks = Math.ceil(days / 7);
    return `${weeks} weeks`;
  } else {
    const months = Math.ceil(days / 30);
    return `${months} months`;
  }
}

