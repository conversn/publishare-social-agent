/**
 * Supabase Edge Function: AEO Query-to-Content Mapper
 * 
 * Maps search queries to content sections and validates alignment.
 * Helps ensure content sections answer specific queries.
 * 
 * Request Body:
 * {
 *   queries: string[] (required) - Array of search queries
 *   content: string (required) - Content to map queries against
 *   article_id?: string (optional) - Article ID to fetch content from
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   mappings: Array<{
 *     query: string
 *     best_matching_section: string
 *     confidence_score: number (0-1)
 *     section_type: 'h1' | 'h2' | 'h3' | 'paragraph'
 *     suggested_improvements: string[]
 *   }>
 *   unmapped_queries: string[]
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryMappingRequest {
  queries: string[];
  content?: string;
  article_id?: string;
}

interface QueryMapping {
  query: string;
  best_matching_section: string;
  confidence_score: number;
  section_type: 'h1' | 'h2' | 'h3' | 'paragraph';
  suggested_improvements: string[];
}

interface QueryMappingResponse {
  success: boolean;
  mappings: QueryMapping[];
  unmapped_queries: string[];
  error?: string;
}

/**
 * Extract content sections
 */
function extractContentSections(content: string): Array<{
  type: 'h1' | 'h2' | 'h3' | 'paragraph';
  heading: string;
  content: string;
  startIndex: number;
}> {
  const sections: Array<{
    type: 'h1' | 'h2' | 'h3' | 'paragraph';
    heading: string;
    content: string;
    startIndex: number;
  }> = [];

  const lines = content.split('\n');
  let currentSection: {
    type: 'h1' | 'h2' | 'h3' | 'paragraph';
    heading: string;
    content: string;
    startIndex: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^#\s+/)) {
      // H1
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: 'h1',
        heading: line.replace(/^#\s+/, '').trim(),
        content: line,
        startIndex: i
      };
    } else if (line.match(/^##\s+/)) {
      // H2
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: 'h2',
        heading: line.replace(/^##\s+/, '').trim(),
        content: line,
        startIndex: i
      };
    } else if (line.match(/^###\s+/)) {
      // H3
      if (currentSection) sections.push(currentSection);
      currentSection = {
        type: 'h3',
        heading: line.replace(/^###\s+/, '').trim(),
        content: line,
        startIndex: i
      };
    } else if (currentSection && line.trim()) {
      // Add to current section
      currentSection.content += '\n' + line;
    } else if (!currentSection && line.trim()) {
      // Paragraph without heading
      currentSection = {
        type: 'paragraph',
        heading: line.substring(0, 50) + (line.length > 50 ? '...' : ''),
        content: line,
        startIndex: i
      };
    }
  }

  if (currentSection) sections.push(currentSection);

  return sections;
}

/**
 * Calculate similarity between query and section
 */
function calculateQuerySectionSimilarity(query: string, section: string): number {
  const queryWords = new Set(
    query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'is', 'are', 'what', 'how', 'why', 'when', 'where', 'who', 'which'].includes(w))
  );

  const sectionWords = new Set(
    section.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );

  let matches = 0;
  for (const word of queryWords) {
    if (sectionWords.has(word)) matches++;
  }

  return queryWords.size > 0 ? matches / queryWords.size : 0;
}

/**
 * Map queries to content sections using AI
 */
async function mapQueriesWithAI(
  queries: string[],
  sections: Array<{ type: string; heading: string; content: string }>
): Promise<QueryMapping[]> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const sectionsText = sections.map((s, i) => 
    `${i + 1}. [${s.type.toUpperCase()}] ${s.heading}\n   ${s.content.substring(0, 200)}...`
  ).join('\n\n');

  const prompt = `Map these search queries to the most relevant content sections:

QUERIES:
${queries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

CONTENT SECTIONS:
${sectionsText}

For each query, return:
{
  "query": "the query",
  "best_matching_section_index": 0, // Index of best matching section (0-based)
  "confidence_score": 0.0-1.0, // How confident the match is
  "suggested_improvements": [
    "What to improve in the section to better answer this query"
  ]
}

Return JSON array of mappings. Return ONLY valid JSON array, no markdown, no explanations.`;

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
            content: 'You are an AEO expert. Return only valid JSON array, no markdown, no explanations.'
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
    let parsed: any = {};
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Handle both array and object with mappings key
    let mappings: any[] = [];
    if (Array.isArray(parsed)) {
      mappings = parsed;
    } else if (parsed.mappings && Array.isArray(parsed.mappings)) {
      mappings = parsed.mappings;
    } else {
      throw new Error('Invalid response format');
    }

    // Convert to QueryMapping format
    return mappings.map((m: any) => {
      const sectionIndex = m.best_matching_section_index || 0;
      const section = sections[sectionIndex] || sections[0];
      
      return {
        query: m.query || '',
        best_matching_section: section.heading,
        confidence_score: Math.max(0, Math.min(1, m.confidence_score || 0)),
        section_type: section.type as 'h1' | 'h2' | 'h3' | 'paragraph',
        suggested_improvements: Array.isArray(m.suggested_improvements) ? m.suggested_improvements : []
      };
    }).filter(m => m.query.length > 0);

  } catch (error) {
    console.error('Error mapping queries with AI:', error);
    throw error;
  }
}

/**
 * Map queries using keyword matching (fallback)
 */
function mapQueriesWithKeywords(
  queries: string[],
  sections: Array<{ type: string; heading: string; content: string }>
): QueryMapping[] {
  return queries.map(query => {
    let bestMatch = sections[0];
    let bestScore = 0;

    for (const section of sections) {
      const score = calculateQuerySectionSimilarity(query, section.heading + ' ' + section.content);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = section;
      }
    }

    return {
      query,
      best_matching_section: bestMatch.heading,
      confidence_score: bestScore,
      section_type: bestMatch.type as 'h1' | 'h2' | 'h3' | 'paragraph',
      suggested_improvements: bestScore < 0.3 
        ? ['Add more keywords from the query to this section', 'Expand section to better address the query']
        : []
    };
  });
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
    const body: QueryMappingRequest = await req.json();
    
    const { queries, content, article_id } = body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          mappings: [],
          unmapped_queries: [],
          error: 'queries array is required'
        } as QueryMappingResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let contentToMap = content;

    // Fetch content from database if article_id provided
    if (article_id && !contentToMap) {
      const { data: article, error } = await supabase
        .from('articles')
        .select('content, html_body')
        .eq('id', article_id)
        .single();
      
      if (error) {
        return new Response(
          JSON.stringify({
            success: false,
            mappings: [],
            unmapped_queries: queries,
            error: `Error fetching article: ${error.message}`
          } as QueryMappingResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      contentToMap = article?.content || article?.html_body || '';
    }

    if (!contentToMap) {
      return new Response(
        JSON.stringify({
          success: false,
          mappings: [],
          unmapped_queries: queries,
          error: 'content or article_id is required'
        } as QueryMappingResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract content sections
    const sections = extractContentSections(contentToMap);

    if (sections.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          mappings: [],
          unmapped_queries: queries,
          error: 'No sections found in content'
        } as QueryMappingResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Map queries to sections
    let mappings: QueryMapping[];
    try {
      mappings = await mapQueriesWithAI(queries, sections);
    } catch (error) {
      console.error('AI mapping failed, using keyword matching:', error);
      mappings = mapQueriesWithKeywords(queries, sections);
    }

    // Identify unmapped queries (low confidence)
    const unmappedQueries = mappings
      .filter(m => m.confidence_score < 0.3)
      .map(m => m.query);

    const response: QueryMappingResponse = {
      success: true,
      mappings,
      unmapped_queries: unmappedQueries
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Query-Content Mapper Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        mappings: [],
        unmapped_queries: body?.queries || [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as QueryMappingResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

