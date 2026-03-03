/**
 * Supabase Edge Function: AEO Answer Completeness Scorer
 * 
 * Measures how completely content answers a target question, identifying
 * gaps and missing aspects for AEO optimization.
 * 
 * Request Body:
 * {
 *   question: string (required) - The question being answered
 *   content: string (required) - The content to evaluate
 *   answer_requirements?: string[] (optional) - Required answer components
 *   question_type?: string (optional) - Type of question (what, how, why, etc.)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   question_coverage: number (0-100)
 *   answer_depth: 'surface' | 'moderate' | 'comprehensive'
 *   missing_aspects: string[]
 *   covered_aspects: string[]
 *   follow_up_questions: string[]
 *   semantic_similarity: number (0-1)
 *   recommendations: string[]
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnswerCompletenessRequest {
  question: string;
  content: string;
  answer_requirements?: string[];
  question_type?: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which';
}

interface AnswerCompletenessResponse {
  success: boolean;
  question_coverage: number;
  answer_depth: 'surface' | 'moderate' | 'comprehensive';
  missing_aspects: string[];
  covered_aspects: string[];
  follow_up_questions: string[];
  semantic_similarity: number;
  recommendations: string[];
  error?: string;
}

/**
 * Calculate semantic similarity between question and answer using embeddings
 */
async function calculateSemanticSimilarity(
  question: string,
  answer: string
): Promise<number> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || 
                       Deno.env.get('OPEN_AI_PUBLISHARE_KEY');
  
  if (!openaiApiKey) {
    // Fallback: simple keyword matching if OpenAI not available
    return calculateKeywordSimilarity(question, answer);
  }

  try {
    // Generate embeddings for question and answer
    const questionEmbedding = await generateEmbedding(question, openaiApiKey);
    const answerEmbedding = await generateEmbedding(answer, openaiApiKey);
    
    // Calculate cosine similarity
    return cosineSimilarity(questionEmbedding, answerEmbedding);
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    return calculateKeywordSimilarity(question, answer);
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      input: text.replace(/\n/g, ' '),
      model: 'text-embedding-ada-002'
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Fallback: Simple keyword-based similarity
 */
function calculateKeywordSimilarity(question: string, answer: string): number {
  const questionWords = new Set(
    question.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
  
  const answerWords = new Set(
    answer.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );
  
  let matches = 0;
  for (const word of questionWords) {
    if (answerWords.has(word)) matches++;
  }
  
  return questionWords.size > 0 ? matches / questionWords.size : 0;
}

/**
 * Analyze answer completeness using AI
 */
async function analyzeCompletenessWithAI(
  question: string,
  content: string,
  answerRequirements?: string[],
  questionType?: string
): Promise<{
  question_coverage: number;
  answer_depth: 'surface' | 'moderate' | 'comprehensive';
  missing_aspects: string[];
  covered_aspects: string[];
  follow_up_questions: string[];
  recommendations: string[];
}> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const requirementsText = answerRequirements && answerRequirements.length > 0
    ? `\n\nRequired Answer Components:\n${answerRequirements.map(r => `- ${r}`).join('\n')}`
    : '';

  const prompt = `Analyze how completely this content answers the question for Answer Engine Optimization (AEO):

QUESTION: "${question}"
${questionType ? `Question Type: ${questionType}` : ''}

CONTENT (first 500 words):
${content.substring(0, 500)}${content.length > 500 ? '...' : ''}
${requirementsText}

Evaluate and return JSON:
{
  "question_coverage": 0-100, // How completely the question is answered (0-100)
  "answer_depth": "surface|moderate|comprehensive", // Depth of the answer
  "missing_aspects": [
    "What's missing from the answer",
    "Key information gaps",
    "Unanswered sub-questions"
  ],
  "covered_aspects": [
    "What the answer does cover well",
    "Strong points of the answer"
  ],
  "follow_up_questions": [
    "Questions readers might still have",
    "Related questions not addressed"
  ],
  "recommendations": [
    "Specific improvements to make the answer more complete",
    "What to add or expand"
  ]
}

Guidelines:
- question_coverage: 0-40 = incomplete, 41-70 = partial, 71-90 = mostly complete, 91-100 = comprehensive
- answer_depth: surface = brief/overview, moderate = some detail, comprehensive = thorough/complete
- missing_aspects: Be specific about what's missing
- recommendations: Provide actionable improvements

Return ONLY valid JSON, no markdown, no explanations.`;

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
            content: 'You are an AEO expert. Return only valid JSON, no markdown, no explanations.'
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

    return {
      question_coverage: Math.max(0, Math.min(100, parsed.question_coverage || 0)),
      answer_depth: parsed.answer_depth || 'surface',
      missing_aspects: Array.isArray(parsed.missing_aspects) ? parsed.missing_aspects : [],
      covered_aspects: Array.isArray(parsed.covered_aspects) ? parsed.covered_aspects : [],
      follow_up_questions: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.error('Error analyzing completeness with AI:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: AnswerCompletenessRequest = await req.json();
    
    const { question, content, answer_requirements, question_type } = body;

    if (!question || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          question_coverage: 0,
          answer_depth: 'surface',
          missing_aspects: [],
          covered_aspects: [],
          follow_up_questions: [],
          semantic_similarity: 0,
          recommendations: [],
          error: 'question and content are required'
        } as AnswerCompletenessResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract first 100 words as the "answer" for similarity calculation
    const first100Words = content.split(/\s+/).slice(0, 100).join(' ');

    // Calculate semantic similarity
    const semanticSimilarity = await calculateSemanticSimilarity(question, first100Words);

    // Analyze completeness with AI
    const analysis = await analyzeCompletenessWithAI(
      question,
      content,
      answer_requirements,
      question_type
    );

    const response: AnswerCompletenessResponse = {
      success: true,
      question_coverage: analysis.question_coverage,
      answer_depth: analysis.answer_depth,
      missing_aspects: analysis.missing_aspects,
      covered_aspects: analysis.covered_aspects,
      follow_up_questions: analysis.follow_up_questions,
      semantic_similarity: semanticSimilarity,
      recommendations: analysis.recommendations
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Answer Completeness Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        question_coverage: 0,
        answer_depth: 'surface',
        missing_aspects: [],
        covered_aspects: [],
        follow_up_questions: [],
        semantic_similarity: 0,
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as AnswerCompletenessResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

