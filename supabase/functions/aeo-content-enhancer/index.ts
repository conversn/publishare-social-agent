/**
 * Supabase Edge Function: AEO Content Enhancer
 * 
 * Enhances existing content to meet AEO requirements.
 * 
 * Request Body:
 * {
 *   article_id: string (required)
 *   enhancement_type: 'answer-first' | 'structure' | 'data-points' | 'schema' | 'all' (default: 'all')
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   enhanced_content: string
 *   changes: string[]
 *   aeo_score_before: number
 *   aeo_score_after: number
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AEOContentEnhancerRequest {
  article_id: string;
  enhancement_type?: 'answer-first' | 'structure' | 'data-points' | 'schema' | 'all';
}

interface AEOContentEnhancerResponse {
  success: boolean;
  enhanced_content: string;
  changes: string[];
  aeo_score_before: number;
  aeo_score_after: number;
  error?: string;
}

// Import validation functions (simplified versions)
function validateAnswerFirst(content: string): { valid: boolean; summary: string } {
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  const hasDirectAnswer = /(is|are|means|refers to|defined as|consists of)/i.test(first100Words) || /\d+/.test(first100Words);
  const hasFluff = /^(in today|in this|welcome|introduction|overview)/i.test(first100Words);
  
  const cleanSummary = first100Words
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  
  return {
    valid: hasDirectAnswer && !hasFluff,
    summary: cleanSummary
  };
}

function calculateAEOScore(content: string, hasSchema: boolean): number {
  let score = 0;
  
  const answerFirst = validateAnswerFirst(content);
  if (answerFirst.valid) score += 30;
  
  // Structure check
  const hasH1 = /^#\s+/.test(content);
  const h2Matches = content.match(/^##\s+/gm);
  const h2Count = h2Matches ? h2Matches.length : 0;
  
  if (hasH1) score += 5;
  if (h2Count >= 2) score += 10;
  if (h2Count >= 1) score += 5;
  
  // Data points
  const dataMatches = content.match(/\$[\d,]+|[\d,]+%|[\d,]+ (million|billion|thousand)/gi);
  if (dataMatches && dataMatches.length > 0) {
    score += Math.min(25, dataMatches.length * 5);
  }
  
  // Schema
  if (hasSchema) score += 20;
  
  return Math.min(100, score);
}

function enhanceAnswerFirst(content: string): { enhanced: string; changes: string[] } {
  const changes: string[] = [];
  const validation = validateAnswerFirst(content);
  
  if (!validation.valid) {
    // Extract the main answer from the content
    const sentences = content.split(/[.!?]\s+/);
    const answerSentence = sentences.find(s => 
      /(is|are|means|refers to|defined as|consists of)/i.test(s) || /\d+/.test(s)
    );
    
    if (answerSentence) {
      // Move answer to the beginning
      const restOfContent = content.replace(answerSentence, '').trim();
      const enhanced = `# ${content.match(/^#\s+(.+)$/m)?.[1] || 'Title'}\n\n${answerSentence.trim()}. ${restOfContent}`;
      changes.push('Moved direct answer to first 100 words');
      return { enhanced, changes };
    }
  }
  
  return { enhanced: content, changes };
}

function enhanceStructure(content: string): { enhanced: string; changes: string[] } {
  const changes: string[] = [];
  let enhanced = content;
  
  // Check for H1
  if (!/^#\s+/.test(enhanced)) {
    // Extract title from first line or add one
    const firstLine = enhanced.split('\n')[0];
    enhanced = `# ${firstLine}\n\n${enhanced.substring(firstLine.length).trim()}`;
    changes.push('Added H1 heading');
  }
  
  // Check for H2 headings
  const h2Matches = enhanced.match(/^##\s+/gm);
  const h2Count = h2Matches ? h2Matches.length : 0;
  
  if (h2Count < 2) {
    // Try to identify sections and add H2 headings
    const paragraphs = enhanced.split(/\n\n+/);
    let h2Added = 0;
    
    for (let i = 1; i < paragraphs.length && h2Added < 2; i++) {
      const para = paragraphs[i];
      if (!para.startsWith('#') && para.length > 100) {
        const firstSentence = para.split(/[.!?]/)[0];
        if (firstSentence.length > 10 && firstSentence.length < 60) {
          paragraphs[i] = `## ${firstSentence}\n\n${para.substring(firstSentence.length).trim()}`;
          h2Added++;
          changes.push(`Added H2 heading: ${firstSentence.substring(0, 50)}`);
        }
      }
    }
    
    enhanced = paragraphs.join('\n\n');
  }
  
  return { enhanced, changes };
}

function enhanceDataPoints(content: string): { enhanced: string; changes: string[] } {
  const changes: string[] = [];
  const dataMatches = content.match(/\$[\d,]+|[\d,]+%|[\d,]+ (million|billion|thousand)/gi);
  
  if (!dataMatches || dataMatches.length === 0) {
    // Add a note about adding data points
    const enhanced = content + '\n\n**Note:** Consider adding specific statistics, percentages, or data points to strengthen this content.';
    changes.push('Added reminder to include data points');
    return { enhanced, changes };
  }
  
  return { enhanced: content, changes };
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
    const body: AEOContentEnhancerRequest = await req.json();
    
    if (!body.article_id) {
      return new Response(
        JSON.stringify({
          success: false,
          enhanced_content: '',
          changes: [],
          aeo_score_before: 0,
          aeo_score_after: 0,
          error: 'article_id is required'
        } as AEOContentEnhancerResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('content, html_body, schema_markup')
      .eq('id', body.article_id)
      .single();
    
    if (articleError || !article) {
      return new Response(
        JSON.stringify({
          success: false,
          enhanced_content: '',
          changes: [],
          aeo_score_before: 0,
          aeo_score_after: 0,
          error: `Article not found: ${articleError?.message || 'Unknown error'}`
        } as AEOContentEnhancerResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const originalContent = article.content || article.html_body || '';
    if (!originalContent) {
      return new Response(
        JSON.stringify({
          success: false,
          enhanced_content: '',
          changes: [],
          aeo_score_before: 0,
          aeo_score_after: 0,
          error: 'Article has no content to enhance'
        } as AEOContentEnhancerResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Calculate before score
    const scoreBefore = calculateAEOScore(originalContent, !!article.schema_markup);
    
    // Apply enhancements
    const enhancementType = body.enhancement_type || 'all';
    let enhancedContent = originalContent;
    const allChanges: string[] = [];
    
    if (enhancementType === 'answer-first' || enhancementType === 'all') {
      const result = enhanceAnswerFirst(enhancedContent);
      enhancedContent = result.enhanced;
      allChanges.push(...result.changes);
    }
    
    if (enhancementType === 'structure' || enhancementType === 'all') {
      const result = enhanceStructure(enhancedContent);
      enhancedContent = result.enhanced;
      allChanges.push(...result.changes);
    }
    
    if (enhancementType === 'data-points' || enhancementType === 'all') {
      const result = enhanceDataPoints(enhancedContent);
      enhancedContent = result.enhanced;
      allChanges.push(...result.changes);
    }
    
    // Calculate after score
    const scoreAfter = calculateAEOScore(enhancedContent, !!article.schema_markup);
    
    // Update article if content changed
    if (enhancedContent !== originalContent) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ content: enhancedContent })
        .eq('id', body.article_id);
      
      if (updateError) {
        console.error('Error updating article:', updateError);
      }
    }
    
    // If schema enhancement requested and no schema exists
    if ((enhancementType === 'schema' || enhancementType === 'all') && !article.schema_markup) {
      allChanges.push('Schema generation recommended - use schema-generator function');
    }
    
    const response: AEOContentEnhancerResponse = {
      success: true,
      enhanced_content: enhancedContent,
      changes: allChanges,
      aeo_score_before: scoreBefore,
      aeo_score_after: scoreAfter
    };
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AEO Content Enhancer Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        enhanced_content: '',
        changes: [],
        aeo_score_before: 0,
        aeo_score_after: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as AEOContentEnhancerResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


