/**
 * Supabase Edge Function: AEO Query Analyzer
 * 
 * Analyzes search queries to determine AEO content type and structure.
 * 
 * Request Body:
 * {
 *   query: string (required)
 *   site_id?: string (optional)
 * }
 * 
 * Response:
 * {
 *   content_type: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula'
 *   question_type: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which'
 *   suggested_title: string
 *   suggested_structure: ContentStructure
 *   key_terms: string[]
 *   data_focus: boolean
 *   comparison_focus: boolean
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AEOQueryAnalyzerRequest {
  query: string;
  site_id?: string;
}

interface ContentStructure {
  sections: string[];
  required_headings: string[];
}

interface AEOQueryAnalyzerResponse {
  content_type: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula' | 'article';
  question_type: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which' | null;
  suggested_title: string;
  suggested_structure: ContentStructure;
  key_terms: string[];
  data_focus: boolean;
  comparison_focus: boolean;
}

function detectQuestionType(query: string): 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which' | null {
  const lowerQuery = query.toLowerCase().trim();
  
  if (lowerQuery.startsWith('what')) return 'what';
  if (lowerQuery.startsWith('how')) return 'how';
  if (lowerQuery.startsWith('why')) return 'why';
  if (lowerQuery.startsWith('when')) return 'when';
  if (lowerQuery.startsWith('where')) return 'where';
  if (lowerQuery.startsWith('who')) return 'who';
  if (lowerQuery.startsWith('which')) return 'which';
  
  return null;
}

function detectContentType(query: string, questionType: string | null): 'definition' | 'how-to' | 'comparison' | 'data' | 'formula' | 'article' {
  const lowerQuery = query.toLowerCase();
  
  if (questionType === 'what' || lowerQuery.includes('definition') || lowerQuery.includes('what is')) {
    return 'definition';
  }
  
  if (questionType === 'how' || lowerQuery.includes('how to') || lowerQuery.includes('how do')) {
    return 'how-to';
  }
  
  if (lowerQuery.includes(' vs ') || lowerQuery.includes(' versus ') || lowerQuery.includes('comparison') || lowerQuery.includes('better')) {
    return 'comparison';
  }
  
  if (lowerQuery.includes('statistics') || lowerQuery.includes('data') || lowerQuery.includes('numbers') || lowerQuery.includes('percent')) {
    return 'data';
  }
  
  if (lowerQuery.includes('formula') || lowerQuery.includes('calculate') || lowerQuery.includes('equation')) {
    return 'formula';
  }
  
  return 'article';
}

function extractKeyTerms(query: string): string[] {
  // Remove common stop words
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can'];
  
  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // Return unique terms, limited to 10
  return [...new Set(words)].slice(0, 10);
}

function generateSuggestedTitle(query: string, contentType: string, questionType: string | null): string {
  const cleanQuery = query.trim();
  
  // If it's already a good title, use it
  if (cleanQuery.length > 10 && cleanQuery.length < 80) {
    // Capitalize first letter
    return cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
  }
  
  // Generate based on content type
  switch (contentType) {
    case 'definition':
      if (questionType === 'what') {
        return `What is ${cleanQuery.replace(/^what is\s+/i, '')}?`;
      }
      return `What is ${cleanQuery}?`;
    
    case 'how-to':
      if (questionType === 'how') {
        return `How to ${cleanQuery.replace(/^how to\s+/i, '').replace(/^how do\s+/i, '')}`;
      }
      return `How to ${cleanQuery}`;
    
    case 'comparison':
      // Try to extract comparison terms
      const vsMatch = cleanQuery.match(/(.+?)\s+(?:vs|versus)\s+(.+)/i);
      if (vsMatch) {
        return `${vsMatch[1]} vs ${vsMatch[2]}`;
      }
      return `${cleanQuery} Comparison`;
    
    case 'data':
      return `${cleanQuery} Statistics and Data`;
    
    case 'formula':
      return `${cleanQuery} Formula and Calculation`;
    
    default:
      return cleanQuery;
  }
}

function getSuggestedStructure(contentType: string): ContentStructure {
  switch (contentType) {
    case 'definition':
      return {
        sections: ['definition', 'key_points', 'examples', 'related_concepts'],
        required_headings: ['H1: Definition', 'H2: Key Points', 'H2: Examples', 'H2: Related Concepts']
      };
    
    case 'how-to':
      return {
        sections: ['overview', 'steps', 'tips', 'common_mistakes'],
        required_headings: ['H1: How to [Action]', 'H2: Overview', 'H2: Step-by-Step Guide', 'H2: Tips', 'H2: Common Mistakes']
      };
    
    case 'comparison':
      return {
        sections: ['overview', 'comparison_table', 'pros_cons', 'recommendation'],
        required_headings: ['H1: [Option1] vs [Option2]', 'H2: Overview', 'H2: Comparison', 'H2: Pros and Cons', 'H2: Recommendation']
      };
    
    case 'data':
      return {
        sections: ['overview', 'key_statistics', 'trends', 'sources'],
        required_headings: ['H1: [Topic] Statistics', 'H2: Key Statistics', 'H2: Trends', 'H2: Sources']
      };
    
    case 'formula':
      return {
        sections: ['overview', 'formula', 'examples', 'applications'],
        required_headings: ['H1: [Topic] Formula', 'H2: Overview', 'H2: The Formula', 'H2: Examples', 'H2: Applications']
      };
    
    default:
      return {
        sections: ['introduction', 'main_content', 'conclusion'],
        required_headings: ['H1: [Title]', 'H2: Introduction', 'H2: Main Content', 'H2: Conclusion']
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: AEOQueryAnalyzerRequest = await req.json();
    
    if (!body.query || typeof body.query !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Query is required and must be a string'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const questionType = detectQuestionType(body.query);
    const contentType = detectContentType(body.query, questionType);
    const keyTerms = extractKeyTerms(body.query);
    const suggestedTitle = generateSuggestedTitle(body.query, contentType, questionType);
    const suggestedStructure = getSuggestedStructure(contentType);
    
    const dataFocus = body.query.toLowerCase().includes('statistics') || 
                     body.query.toLowerCase().includes('data') || 
                     body.query.toLowerCase().includes('numbers') ||
                     /\d+/.test(body.query);
    
    const comparisonFocus = body.query.toLowerCase().includes(' vs ') || 
                           body.query.toLowerCase().includes(' versus ') || 
                           body.query.toLowerCase().includes('better') ||
                           body.query.toLowerCase().includes('comparison');
    
    const response: AEOQueryAnalyzerResponse = {
      content_type: contentType,
      question_type: questionType,
      suggested_title: suggestedTitle,
      suggested_structure: suggestedStructure,
      key_terms: keyTerms,
      data_focus: dataFocus,
      comparison_focus: comparisonFocus
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AEO Query Analyzer Error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


