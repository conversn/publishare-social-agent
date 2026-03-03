/**
 * Supabase Edge Function: AI Link Suggestions
 * 
 * Generates intelligent internal link suggestions for articles based on content analysis.
 * Uses AI to identify relevant topics and suggest related articles.
 * 
 * Request Body:
 * {
 *   content: string (required) - Article content to analyze
 *   article_id?: string (optional) - UUID of current article (to exclude from suggestions)
 *   site_id?: string (optional) - Site ID to filter suggestions
 *   max_suggestions?: number (optional, default: 5) - Maximum number of suggestions
 *   currentArticleId?: string (optional) - Alternative name for article_id
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   suggestions: Array<{
 *     id: string
 *     title: string
 *     url: string
 *     relevance: 'High' | 'Medium' | 'Low'
 *     anchorText: string
 *     description: string
 *     category: string
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

interface LinkSuggestion {
  id: string;
  title: string;
  url: string;
  relevance: 'High' | 'Medium' | 'Low';
  anchorText: string;
  description: string;
  category: string;
  aeo_score?: number; // NEW: AEO score for this suggestion
}

interface LinkSuggestionsRequest {
  content: string;
  article_id?: string | null;
  currentArticleId?: string | null;
  site_id?: string | null; // NEW: Site ID to filter suggestions
  max_suggestions?: number;
}

interface LinkSuggestionsResponse {
  success: boolean;
  suggestions: LinkSuggestion[];
  timestamp: string;
  error?: string;
}

// Helper function to validate UUID
function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Helper function to extract keywords from content
function extractKeywords(content: string, maxKeywords: number = 10): string[] {
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 4 && 
      !['about', 'their', 'there', 'these', 'those', 'which', 'where', 'when', 
        'what', 'with', 'from', 'they', 'have', 'this', 'that', 'would', 'could',
        'should', 'might', 'shall', 'will', 'been', 'being', 'have', 'has', 'had'].includes(word)
    );
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// ========================================
// AEO SCORING FUNCTIONS
// ========================================

// Calculate AEO score for an article
function calculateAEOScore(article: any): number {
  let score = 0;
  
  // Has schema: +10 points
  if (article.schema_markup) score += 10;
  
  // Answer-first validated: +5 points
  if (article.aeo_answer_first) score += 5;
  
  // Has data points: +3 points
  if (article.data_points && Array.isArray(article.data_points) && article.data_points.length > 0) {
    score += 3;
  }
  
  // Has citations: +2 points
  if (article.citations && Array.isArray(article.citations) && article.citations.length > 0) {
    score += 2;
  }
  
  // Has content structure: +2 points
  if (article.content_structure) score += 2;
  
  // Has AEO summary: +3 points
  if (article.aeo_summary) score += 3;
  
  return Math.min(25, score); // Cap at 25 points for AEO bonus
}

// Extract question keywords from content to determine preferred content type
function extractQuestionKeywords(content: string): string[] {
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'vs', 'versus'];
  const lowerContent = content.toLowerCase();
  return questionWords.filter(word => lowerContent.includes(word));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body: LinkSuggestionsRequest = await req.json();
    
    // Validate required fields
    if (!body.content || typeof body.content !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          suggestions: [],
          timestamp: new Date().toISOString(),
          error: 'Content is required and must be a string'
        } as LinkSuggestionsResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get article_id (handle both naming conventions)
    const articleId = body.article_id || body.currentArticleId;
    
    // Validate article_id if provided (must be valid UUID or null/empty)
    if (articleId !== null && articleId !== undefined && articleId !== '' && !isValidUUID(articleId)) {
      return new Response(
        JSON.stringify({
          success: false,
          suggestions: [],
          timestamp: new Date().toISOString(),
          error: `Invalid article_id format. Must be a valid UUID or empty/null. Received: ${articleId}`
        } as LinkSuggestionsResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const maxSuggestions = body.max_suggestions || 5;
    const content = body.content;

    // Get site_id from current article if not provided
    let siteId = body.site_id;
    if (!siteId && articleId && isValidUUID(articleId)) {
      const { data: currentArticle } = await supabase
        .from('articles')
        .select('site_id')
        .eq('id', articleId)
        .single();
      
      if (currentArticle) {
        siteId = currentArticle.site_id;
      }
    }

    // Get site route path
    let routePath = '/articles'; // Default
    if (siteId) {
      const { data: site } = await supabase
        .from('sites')
        .select('article_route_path')
        .eq('id', siteId)
        .single();
      
      if (site && site.article_route_path) {
        routePath = site.article_route_path;
      }
    }

    // Extract keywords from content
    const keywords = extractKeywords(content, 10);
    
    // Query for related articles from database
    let relatedArticles: any[] = [];
    
    try {
      // Extract question keywords to determine preferred content type
      const questionKeywords = extractQuestionKeywords(content);
      
      // Build query to find related articles with AEO fields
      let query = supabase
        .from('articles')
        .select('id, title, slug, excerpt, category, site_id, aeo_content_type, aeo_answer_first, schema_markup, data_points, citations, content_structure, aeo_summary')
        .eq('status', 'published')
        .limit(maxSuggestions * 3); // Get more for better AEO matching

      // CRITICAL: Filter by site_id to ensure links are site-specific
      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      // Exclude current article if article_id is provided and valid
      if (articleId && isValidUUID(articleId)) {
        query = query.neq('id', articleId);
      }
      
      // AEO ENHANCEMENT: Prioritize AEO-optimized articles
      // First, try to get AEO-optimized articles
      query = query.eq('aeo_answer_first', true);

      const { data, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        // Fallback: query without AEO filter
        let fallbackQuery = supabase
          .from('articles')
          .select('id, title, slug, excerpt, category, site_id, aeo_content_type, aeo_answer_first, schema_markup, data_points, citations, content_structure, aeo_summary')
          .eq('status', 'published')
          .limit(maxSuggestions * 2);
        
        // CRITICAL: Still filter by site_id in fallback
        if (siteId) {
          fallbackQuery = fallbackQuery.eq('site_id', siteId);
        }
        
        if (articleId && isValidUUID(articleId)) {
          fallbackQuery = fallbackQuery.neq('id', articleId);
        }
        
        const { data: fallbackData } = await fallbackQuery;
        if (fallbackData) {
          relatedArticles = fallbackData;
        }
      } else if (data) {
        relatedArticles = data;
      }
    } catch (dbError) {
      console.error('Error querying articles:', dbError);
      // Don't generate fake suggestions - return empty array
    }

    // Generate link suggestions with AEO scoring
    const suggestions: LinkSuggestion[] = [];

    // If we have related articles, score and sort them by AEO
    if (relatedArticles.length > 0) {
      // Calculate AEO scores and add to articles
      const scoredArticles = relatedArticles.map(article => ({
        ...article,
        aeoScore: calculateAEOScore(article)
      }));
      
      // Sort by AEO score (highest first), then by relevance
      scoredArticles.sort((a, b) => {
        if (b.aeoScore !== a.aeoScore) {
          return b.aeoScore - a.aeoScore;
        }
        // If AEO scores are equal, maintain original order
        return 0;
      });
      
      // Take top suggestions - ONLY REAL ARTICLES
      scoredArticles.slice(0, maxSuggestions).forEach((article, index) => {
        // Use correct route path from site configuration
        const articleUrl = `${routePath}/${article.slug || article.id}`;
        
        suggestions.push({
          id: article.id,
          title: article.title,
          url: articleUrl,
          relevance: article.aeoScore >= 15 ? 'High' : article.aeoScore >= 10 ? 'Medium' : 'Low',
          anchorText: `learn more about ${article.title.toLowerCase()}`,
          description: article.excerpt || `Related content about ${article.title}`,
          category: article.category || 'article',
          aeo_score: article.aeoScore
        });
      });
    }

    // REMOVED: No longer generate fake keyword-based suggestions
    // Only return real articles that exist in the database
    // This prevents 404 errors from broken links

    const response: LinkSuggestionsResponse = {
      success: true,
      suggestions: suggestions.slice(0, maxSuggestions),
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AI Link Suggestions Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        suggestions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LinkSuggestionsResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});





