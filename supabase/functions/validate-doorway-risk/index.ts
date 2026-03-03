/**
 * Supabase Edge Function: Validate Doorway Risk
 * 
 * Detects doorway pages using OpenAI embeddings for content similarity.
 * Compares page content against existing pages in the same vertical to identify
 * duplicate or near-duplicate content that could be flagged as doorway pages.
 * 
 * Request Body:
 * {
 *   page_content: string (required) - Content to validate
 *   page_id?: string (optional) - Page ID (to exclude from comparison)
 *   domain_id?: string (optional) - Domain ID for filtering
 *   vertical: string (required) - Service vertical (hvac, plumbing, pest, etc)
 *   compare_against?: string[] (optional) - Specific page IDs to compare against
 *   threshold?: number (optional, default: 0.85) - Similarity threshold for high risk
 * }
 * 
 * Response:
 * {
 *   risk_level: 'low' | 'medium' | 'high'
 *   similarity_score: number (0-1)
 *   similar_pages: Array<{
 *     page_id: string
 *     similarity: number
 *     matching_sections: string[]
 *   }>
 *   recommendations: string[]
 *   can_publish: boolean
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DoorwayRiskRequest {
  page_content: string;
  page_id?: string;
  domain_id?: string;
  vertical: string;
  compare_against?: string[];
  threshold?: number; // High risk threshold (default: 0.85)
}

interface SimilarPage {
  page_id: string;
  similarity: number;
  matching_sections: string[];
  title?: string;
  city?: string;
  state?: string;
}

interface DoorwayRiskResponse {
  risk_level: 'low' | 'medium' | 'high';
  similarity_score: number; // Highest similarity found
  similar_pages: SimilarPage[];
  recommendations: string[];
  can_publish: boolean;
  checked_at: string;
}

/**
 * Generate embedding for content using OpenAI
 */
async function generateEmbedding(content: string): Promise<number[]> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || 
                       Deno.env.get('OPEN_AI_PUBLISHARE_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured (OPENAI_API_KEY or OPEN_AI_PUBLISHARE_KEY)');
  }

  // Clean content for embedding (remove markdown, limit length)
  const cleanContent = content
    .replace(/#{1,6}\s+/g, '') // Remove markdown headers
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
    .substring(0, 8000) // Limit to 8000 chars for embedding
    .trim();

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // Cost-effective embedding model
      input: cleanContent
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI embeddings API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Find similar pages in database
 */
async function findSimilarPages(
  supabase: any,
  targetEmbedding: number[],
  vertical: string,
  pageId?: string,
  domainId?: string,
  compareAgainst?: string[]
): Promise<SimilarPage[]> {
  let query = supabase
    .from('articles')
    .select('id, title, content, city, state, page_type, vertical')
    .eq('page_type', 'local_page')
    .eq('vertical', vertical)
    .not('content', 'is', null);

  // Exclude current page if provided
  if (pageId) {
    query = query.neq('id', pageId);
  }

  // Filter by domain if provided
  if (domainId) {
    query = query.eq('domain_id', domainId);
  }

  // Filter to specific pages if provided
  if (compareAgainst && compareAgainst.length > 0) {
    query = query.in('id', compareAgainst);
  }

  const { data: pages, error } = await query;

  if (error) {
    console.error('Error fetching pages for comparison:', error);
    return [];
  }

  if (!pages || pages.length === 0) {
    return [];
  }

  const similarPages: SimilarPage[] = [];

  // Compare against each page (generate embeddings and calculate similarity)
  for (const page of pages) {
    try {
      // Generate embedding for comparison page
      const pageEmbedding = await generateEmbedding(page.content || '');
      
      // Calculate similarity
      const similarity = calculateSimilarity(targetEmbedding, pageEmbedding);
      
      // Only include if similarity is above threshold (0.7)
      if (similarity >= 0.7) {
        // Extract matching sections (simplified - would be more sophisticated in production)
        const matchingSections = extractMatchingSections(
          page.content || '',
          similarity
        );

        similarPages.push({
          page_id: page.id,
          similarity: Math.round(similarity * 100) / 100, // Round to 2 decimals
          matching_sections: matchingSections,
          title: page.title,
          city: page.city,
          state: page.state
        });
      }
    } catch (error) {
      console.warn(`Error processing page ${page.id}:`, error);
      // Continue with other pages
    }
  }

  // Sort by similarity (highest first)
  similarPages.sort((a, b) => b.similarity - a.similarity);

  return similarPages;
}

/**
 * Extract matching sections from content (simplified version)
 */
function extractMatchingSections(content: string, similarity: number): string[] {
  // For high similarity (>0.9), identify common sections
  if (similarity < 0.9) {
    return [];
  }

  const sections: string[] = [];
  
  // Extract headings as potential matching sections
  const headingMatches = content.match(/^#{1,3}\s+(.+)$/gm);
  if (headingMatches) {
    sections.push(...headingMatches.slice(0, 5).map(h => h.replace(/^#{1,3}\s+/, '')));
  }

  return sections.slice(0, 3); // Return top 3 matching sections
}

/**
 * Assess risk level based on similarity scores
 */
function assessRiskLevel(
  highestSimilarity: number,
  similarPagesCount: number,
  threshold: number = 0.85
): 'low' | 'medium' | 'high' {
  if (highestSimilarity >= threshold) {
    return 'high';
  }
  
  if (highestSimilarity >= 0.75 || similarPagesCount >= 3) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Generate recommendations based on risk assessment
 */
function generateRecommendations(
  riskLevel: string,
  highestSimilarity: number,
  similarPages: SimilarPage[]
): string[] {
  const recommendations: string[] = [];

  if (riskLevel === 'high') {
    recommendations.push(`High similarity detected (${(highestSimilarity * 100).toFixed(1)}%). This page may be flagged as a doorway page.`);
    recommendations.push('Consider rewriting significant portions to make content more unique.');
    recommendations.push('Add more city-specific details, local examples, and unique local facts.');
    
    if (similarPages.length > 0) {
      const topSimilar = similarPages[0];
      recommendations.push(`Most similar to: "${topSimilar.title}" (${topSimilar.city || 'N/A'}, ${topSimilar.state || 'N/A'})`);
    }
  } else if (riskLevel === 'medium') {
    recommendations.push(`Moderate similarity detected (${(highestSimilarity * 100).toFixed(1)}%).`);
    recommendations.push('Consider adding more unique local content to differentiate this page.');
    recommendations.push('Review similar pages and ensure this page offers unique value.');
  } else {
    recommendations.push('Low similarity detected. Page appears unique enough to publish.');
  }

  if (similarPages.length >= 5) {
    recommendations.push(`Found ${similarPages.length} similar pages. Consider consolidating or significantly differentiating content.`);
  }

  return recommendations;
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
    const body: DoorwayRiskRequest = await req.json();
    
    if (!body.page_content) {
      return new Response(
        JSON.stringify({
          risk_level: 'high',
          similarity_score: 0,
          similar_pages: [],
          recommendations: ['Page content is required'],
          can_publish: false,
          checked_at: new Date().toISOString()
        } as DoorwayRiskResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!body.vertical) {
      return new Response(
        JSON.stringify({
          risk_level: 'high',
          similarity_score: 0,
          similar_pages: [],
          recommendations: ['Vertical is required for comparison'],
          can_publish: false,
          checked_at: new Date().toISOString()
        } as DoorwayRiskResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Validating doorway risk for vertical: ${body.vertical}`);

    // Generate embedding for target content
    console.log('📊 Generating embedding for target content...');
    const targetEmbedding = await generateEmbedding(body.page_content);

    // Find similar pages
    console.log('🔎 Finding similar pages...');
    const similarPages = await findSimilarPages(
      supabase,
      targetEmbedding,
      body.vertical,
      body.page_id,
      body.domain_id,
      body.compare_against
    );

    // Determine highest similarity
    const highestSimilarity = similarPages.length > 0 
      ? similarPages[0].similarity 
      : 0;

    // Assess risk level
    const threshold = body.threshold || 0.85;
    const riskLevel = assessRiskLevel(highestSimilarity, similarPages.length, threshold);

    // Generate recommendations
    const recommendations = generateRecommendations(riskLevel, highestSimilarity, similarPages);

    // Determine if can publish (low or medium risk, or high risk with < threshold)
    const canPublish = riskLevel !== 'high' || highestSimilarity < threshold;

    const response: DoorwayRiskResponse = {
      risk_level: riskLevel,
      similarity_score: highestSimilarity,
      similar_pages: similarPages.slice(0, 10), // Limit to top 10
      recommendations,
      can_publish: canPublish,
      checked_at: new Date().toISOString()
    };

    // Save to quality_checks table if page_id provided
    if (body.page_id) {
      try {
        await supabase
          .from('quality_checks')
          .upsert({
            page_id: body.page_id,
            doorway_risk_score: highestSimilarity,
            doorway_risk_level: riskLevel,
            similar_pages: similarPages.slice(0, 5), // Store top 5
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'page_id'
          });
        console.log('✅ Quality check saved to database');
      } catch (error) {
        console.warn('Failed to save quality check:', error);
        // Don't fail the request if save fails
      }
    }

    console.log(`✅ Doorway risk assessment complete: ${riskLevel} risk (${(highestSimilarity * 100).toFixed(1)}% similarity)`);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Validate Doorway Risk Error:', error);
    
    return new Response(
      JSON.stringify({
        risk_level: 'high',
        similarity_score: 0,
        similar_pages: [],
        recommendations: [`Error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`],
        can_publish: false,
        checked_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      } as DoorwayRiskResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

