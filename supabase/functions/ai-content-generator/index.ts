/**
 * Supabase Edge Function: AI Content Generator (AEO-Enhanced)
 * 
 * Generates AI content with Answer Engine Optimization (AEO) support.
 * This function serves as a fallback when agentic-content-gen fails.
 * 
 * NOTE: This is an enhanced version. If you have an existing deployment,
 * merge the AEO processing section (marked with "AEO ENHANCEMENT") into your existing code.
 * 
 * Request Body:
 * {
 *   topic: string (required)
 *   title?: string
 *   targetAudience?: string
 *   contentType?: string
 *   tone?: string
 *   length?: number
 *   keyPoints?: string[]
 *   callToAction?: string
 *   aiContext?: string
 *   // NEW AEO Parameters:
 *   aeo_optimized?: boolean (default: true)
 *   aeo_content_type?: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula'
 *   generate_schema?: boolean (default: true)
 *   answer_first?: boolean (default: true)
 * }
 * 
 * Response:
 * {
 *   content: string
 *   title?: string
 *   excerpt?: string
 *   meta_description?: string
 *   // NEW AEO Response Fields:
 *   aeo_summary?: string
 *   aeo_content_type?: string
 *   content_structure?: ContentStructure
 *   answer_first_valid?: boolean
 *   data_points?: string[]
 *   citations?: string[]
 *   schema_markup?: JSONLD
 *   aeo_score?: number
 *   speakable_summary?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIContentGeneratorRequest {
  topic: string;
  title?: string;
  targetAudience?: string;
  contentType?: string;
  tone?: string;
  length?: number;
  keyPoints?: string[];
  callToAction?: string;
  aiContext?: string;
  // AEO Parameters
  aeo_optimized?: boolean;
  aeo_content_type?: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula' | 'article';
  generate_schema?: boolean;
  answer_first?: boolean;
}

interface ContentStructure {
  h1: string | null;
  h2: string[];
  h3: string[];
  lists: number;
  tables: number;
  dataPoints: string[];
}

// Import AEO helper functions from agentic-content-gen
// In production, these would be in a shared module
function detectAEOContentType(topic: string, title?: string): string {
  const text = (title || topic).toLowerCase();
  if (text.startsWith('what is') || text.startsWith('what are') || text.includes('definition')) return 'definition';
  if (text.startsWith('how to') || text.startsWith('how do')) return 'how-to';
  if (text.includes(' vs ') || text.includes(' versus ') || text.includes('comparison')) return 'comparison';
  if (text.includes('statistics') || text.includes('data') || text.includes('numbers')) return 'data';
  if (text.includes('formula') || text.includes('calculate') || text.includes('equation')) return 'formula';
  return 'article';
}

function validateAnswerFirst(content: string): { valid: boolean; summary: string; issues: string[] } {
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  const issues: string[] = [];
  const hasDirectAnswer = /(is|are|means|refers to|defined as|consists of)/i.test(first100Words) || /\d+/.test(first100Words);
  const hasFluff = /^(in today|in this|welcome|introduction|overview)/i.test(first100Words);
  
  if (!hasDirectAnswer) issues.push('Direct answer not found in first 100 words');
  if (hasFluff) issues.push('Content starts with fluff instead of direct answer');
  
  const cleanSummary = first100Words
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  
  return { valid: hasDirectAnswer && !hasFluff, summary: cleanSummary, issues };
}

function extractContentStructure(content: string): ContentStructure {
  const lines = content.split('\n');
  const structure: ContentStructure = { h1: null, h2: [], h3: [], lists: 0, tables: 0, dataPoints: [] };
  
  for (const line of lines) {
    if (line.match(/^#\s+/)) structure.h1 = line.replace(/^#\s+/, '').trim();
    else if (line.match(/^##\s+/)) structure.h2.push(line.replace(/^##\s+/, '').trim());
    else if (line.match(/^###\s+/)) structure.h3.push(line.replace(/^###\s+/, '').trim());
    else if (line.match(/^[\*\-\+]\s+|^\d+\.\s+/)) structure.lists++;
    else if (line.includes('|')) structure.tables++;
    
    const dataMatches = line.match(/\$[\d,]+|[\d,]+%|[\d,]+ (million|billion|thousand)/gi);
    if (dataMatches) structure.dataPoints.push(...dataMatches);
  }
  
  return structure;
}

function extractDataPoints(content: string): string[] {
  const dataPoints: string[] = [];
  const patterns = [/\$[\d,]+/g, /[\d,]+%/g, /[\d,]+ (million|billion|thousand|trillion)/gi, /\d+\.\d+%/g];
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) dataPoints.push(...matches);
  }
  return [...new Set(dataPoints)];
}

function extractCitations(content: string): string[] {
  const citations: string[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    citations.push(match[2]);
  }
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urlMatches = content.match(urlPattern);
  if (urlMatches) citations.push(...urlMatches);
  return [...new Set(citations)];
}

function generateSpeakableSummary(content: string, title: string): string {
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  const cleanSummary = first100Words.replace(/#{1,6}\s+/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/\n+/g, ' ').trim();
  if (cleanSummary.length <= 350) return cleanSummary;
  const truncated = cleanSummary.substring(0, 350);
  return truncated.substring(0, truncated.lastIndexOf(' ')) + '...';
}

function calculateAEOScore(params: { answerFirst: boolean; structure: ContentStructure; dataPoints: number; hasSchema: boolean }): number {
  let score = 0;
  if (params.answerFirst) score += 30;
  if (params.structure.h1) score += 5;
  if (params.structure.h2.length >= 2) score += 10;
  if (params.structure.h3.length >= 1) score += 5;
  if (params.structure.lists > 0) score += 5;
  if (params.dataPoints > 0) score += Math.min(25, params.dataPoints * 5);
  if (params.hasSchema) score += 20;
  return Math.min(100, score);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vpysqshhafthuxvokwqj.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       req.headers.get('apikey') || '';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: AIContentGeneratorRequest = await req.json();
    
    // ========================================
    // EXISTING CONTENT GENERATION LOGIC
    // ========================================
    // TODO: Replace this section with your existing AI content generation code
    // The existing code should generate content using OpenAI/Claude/etc.
    // It should return: { content, title, excerpt, meta_description, ... }
    
    // Placeholder for existing generation logic
    let contentResult: any = {
      content: '',
      title: body.title || body.topic,
      excerpt: '',
      meta_description: '',
    };
    
    // If you have existing generation code, call it here:
    // contentResult = await generateAIContent(body);
    
    // ========================================
    // AEO ENHANCEMENT SECTION
    // ========================================
    
    if (body.aeo_optimized !== false) {
      const aeoContentType = body.aeo_content_type || detectAEOContentType(body.topic, body.title);
      const validation = validateAnswerFirst(contentResult.content);
      const structure = extractContentStructure(contentResult.content);
      const dataPoints = extractDataPoints(contentResult.content);
      const citations = extractCitations(contentResult.content);
      
      let schema = null;
      if (body.generate_schema !== false) {
        schema = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: contentResult.title,
          description: contentResult.excerpt || validation.summary,
        };
      }
      
      const speakableSummary = generateSpeakableSummary(contentResult.content, contentResult.title);
      const aeoScore = calculateAEOScore({
        answerFirst: validation.valid,
        structure: structure,
        dataPoints: dataPoints.length,
        hasSchema: !!schema
      });
      
      return new Response(
        JSON.stringify({
          ...contentResult,
          aeo_summary: validation.summary,
          aeo_content_type: aeoContentType,
          content_structure: structure,
          answer_first_valid: validation.valid,
          data_points: dataPoints,
          citations: citations,
          schema_markup: schema,
          aeo_score: aeoScore,
          speakable_summary: speakableSummary
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify(contentResult),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AI Content Generator Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


