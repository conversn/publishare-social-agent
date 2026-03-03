/**
 * Supabase Edge Function: Fact Checker
 * 
 * Uses Perplexity API to fact-check articles and add citations
 * 
 * Request Body:
 * {
 *   article_id?: string (optional) - Article ID to fact check
 *   content?: string (required if no article_id) - Content to fact check
 *   title?: string - Article title for context
 *   site_id?: string - Site ID for context
 * }
 * 
 * Response:
 * {
 *   fact_checked: boolean
 *   citations: Array<{ claim: string; verified: boolean; source: string; url: string }>
 *   verified_content?: string - Content with citations added
 *   errors?: string[]
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FactCheckRequest {
  article_id?: string;
  content?: string;
  title?: string;
  site_id?: string;
}

interface Citation {
  claim: string;
  verified: boolean;
  source: string;
  url: string;
}

interface FactCheckResponse {
  fact_checked: boolean;
  citations: Citation[];
  verified_content?: string;
  errors?: string[];
}

/**
 * Extract factual claims from content
 */
function extractClaims(content: string): string[] {
  // Extract sentences that contain factual claims
  // Look for statements about companies, services, features, statistics, etc.
  const sentences = content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500);
  
  // Filter for sentences that likely contain facts
  const claimIndicators = [
    /\b(?:is|are|has|have|offers|provides|includes|features|costs|prices?|rates?|fees?)\b/i,
    /\b(?:best|top|leading|premier|expert|specialized)\b/i,
    /\b(?:years?|experience|clients?|students?|success|rate)\b/i,
    /\$\d+|\d+%|\d+\s*(?:years?|months?|days?)/,
    /\b(?:company|service|platform|tool|software|system)\b/i
  ];
  
  const claims = sentences.filter(sentence => {
    return claimIndicators.some(pattern => pattern.test(sentence));
  });
  
  // Limit to top 10 most likely factual claims
  return claims.slice(0, 10);
}

/**
 * Fact check a claim using Perplexity API
 */
async function factCheckClaim(claim: string, perplexityApiKey: string): Promise<Citation | null> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a fact-checker. Verify the following claim and provide a source URL if verified. Respond in JSON format: {"verified": boolean, "source": "source name", "url": "source URL", "explanation": "brief explanation"}. If you cannot verify, set verified to false.'
          },
          {
            role: 'user',
            content: `Fact-check this claim: "${claim}"`
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON response
    let result;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        result = JSON.parse(content);
      }
    } catch (e) {
      // If JSON parsing fails, try to extract information from text
      const verified = /verified.*true|true.*verified/i.test(content);
      const urlMatch = content.match(/https?:\/\/[^\s\)]+/);
      const sourceMatch = content.match(/source[:\s]+([^\n,]+)/i);
      
      result = {
        verified,
        source: sourceMatch ? sourceMatch[1].trim() : 'Unknown',
        url: urlMatch ? urlMatch[0] : '',
        explanation: content.substring(0, 200)
      };
    }

    return {
      claim,
      verified: result.verified === true || result.verified === 'true',
      source: result.source || 'Unknown',
      url: result.url || ''
    };

  } catch (error) {
    console.error(`Error fact-checking claim "${claim}":`, error);
    return null;
  }
}

/**
 * Add citations to content
 */
function addCitationsToContent(content: string, citations: Citation[]): string {
  let verifiedContent = content;
  
  // Add citations as footnotes
  const citationFootnotes: string[] = [];
  
  citations.forEach((citation, index) => {
    if (citation.verified && citation.url) {
      const footnoteNumber = index + 1;
      const footnote = `[${footnoteNumber}](${citation.url})`;
      
      // Find the claim in the content and add citation
      const claimEscaped = citation.claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const claimRegex = new RegExp(`(${claimEscaped})`, 'gi');
      
      if (claimRegex.test(verifiedContent)) {
        verifiedContent = verifiedContent.replace(claimRegex, `$1${footnote}`);
      }
      
      citationFootnotes.push(`${footnoteNumber}. ${citation.source}: ${citation.url}`);
    }
  });
  
  // Add citations section at the end
  if (citationFootnotes.length > 0) {
    verifiedContent += '\n\n## Sources\n\n';
    verifiedContent += citationFootnotes.join('\n');
  }
  
  return verifiedContent;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       bearerToken ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: FactCheckRequest = await req.json();
    
    // Get Perplexity API key
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({
          fact_checked: false,
          citations: [],
          errors: ['PERPLEXITY_API_KEY not configured']
        } as FactCheckResponse),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get content from article if article_id provided
    let content = body.content;
    let title = body.title;
    
    if (body.article_id && !content) {
      const { data: article, error } = await supabase
        .from('articles')
        .select('content, title')
        .eq('id', body.article_id)
        .single();
      
      if (error || !article) {
        return new Response(
          JSON.stringify({
            fact_checked: false,
            citations: [],
            errors: [`Failed to fetch article: ${error?.message || 'Article not found'}`]
          } as FactCheckResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      content = article.content;
      title = article.title || title;
    }

    if (!content) {
      return new Response(
        JSON.stringify({
          fact_checked: false,
          citations: [],
          errors: ['Content is required']
        } as FactCheckResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔍 Fact-checking content (${content.length} chars)...`);

    // Extract claims
    const claims = extractClaims(content);
    console.log(`📋 Extracted ${claims.length} claims to verify`);

    // Fact check each claim
    const citations: Citation[] = [];
    const errors: string[] = [];

    for (const claim of claims) {
      console.log(`   Checking: "${claim.substring(0, 60)}..."`);
      const citation = await factCheckClaim(claim, perplexityApiKey);
      
      if (citation) {
        citations.push(citation);
        console.log(`   ${citation.verified ? '✅' : '❌'} ${citation.source}`);
      } else {
        errors.push(`Failed to fact-check: ${claim.substring(0, 50)}...`);
      }
      
      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Add citations to content
    const verifiedContent = addCitationsToContent(content, citations);

    // Update article if article_id provided
    if (body.article_id) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          citations: citations,
          content: verifiedContent
        })
        .eq('id', body.article_id);

      if (updateError) {
        errors.push(`Failed to update article: ${updateError.message}`);
      } else {
        console.log('✅ Article updated with citations');
      }
    }

    const verifiedCount = citations.filter(c => c.verified).length;
    console.log(`✅ Fact-checking complete: ${verifiedCount}/${citations.length} claims verified`);

    return new Response(
      JSON.stringify({
        fact_checked: true,
        citations,
        verified_content: verifiedContent,
        errors: errors.length > 0 ? errors : undefined
      } as FactCheckResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fact Checker Error:', error);
    
    return new Response(
      JSON.stringify({
        fact_checked: false,
        citations: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      } as FactCheckResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


