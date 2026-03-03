/**
 * Supabase Edge Function: AEO Question Intent Analyzer
 * 
 * Analyzes search queries and content to extract questions, determine intent,
 * and identify answer requirements for AEO optimization.
 * 
 * Request Body:
 * {
 *   query?: string (optional) - Search query or question to analyze
 *   topic?: string (optional) - Topic/keyword to generate questions for
 *   content?: string (optional) - Existing content to extract questions from
 *   vertical?: string (optional) - Service vertical (hvac, plumbing, etc.)
 *   city?: string (optional) - City for local SEO context
 *   state?: string (optional) - State for local SEO context
 *   generate_related?: boolean (optional, default: true) - Generate related questions
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   primary_question?: string
 *   question_type?: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which'
 *   intent?: 'informational' | 'transactional' | 'navigational'
 *   related_questions?: string[]
 *   answer_requirements?: string[]
 *   question_variations?: string[]
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionAnalyzerRequest {
  query?: string;
  topic?: string;
  content?: string;
  vertical?: string;
  city?: string;
  state?: string;
  generate_related?: boolean;
}

interface QuestionAnalysis {
  primary_question: string;
  question_type: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which';
  intent: 'informational' | 'transactional' | 'navigational';
  related_questions: string[];
  answer_requirements: string[];
  question_variations: string[];
}

interface QuestionAnalyzerResponse {
  success: boolean;
  primary_question?: string;
  question_type?: string;
  intent?: string;
  related_questions?: string[];
  answer_requirements?: string[];
  question_variations?: string[];
  error?: string;
}

/**
 * Analyze question using DeepSeek AI
 */
async function analyzeQuestionWithAI(
  queryOrTopic: string,
  vertical?: string,
  city?: string,
  state?: string,
  generateRelated: boolean = true
): Promise<QuestionAnalysis> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const context = city && state 
    ? ` for ${city}, ${state}`
    : vertical 
    ? ` for ${vertical} services`
    : '';

  const prompt = `Analyze this search query or topic and extract question intent for Answer Engine Optimization (AEO):

Query/Topic: "${queryOrTopic}"
${context ? `Context: ${context}` : ''}

Provide a comprehensive analysis in JSON format:
{
  "primary_question": "The main question users are asking (formatted as a question)",
  "question_type": "what|how|why|when|where|who|which",
  "intent": "informational|transactional|navigational",
  "related_questions": [
    "3-5 related questions users might also ask",
    "Include variations and follow-up questions"
  ],
  "answer_requirements": [
    "What the answer must include to fully address the question",
    "Key information points required",
    "Data or statistics needed",
    "Action steps if applicable"
  ],
  "question_variations": [
    "Different ways users phrase this question",
    "Common search query variations",
    "Long-tail variations"
  ]
}

Guidelines:
- Question type: Determine if it's asking WHAT (definition), HOW (process), WHY (reason), WHEN (timing), WHERE (location), WHO (person/entity), or WHICH (choice)
- Intent: 
  * informational = seeking knowledge/information
  * transactional = ready to take action (buy, call, hire)
  * navigational = looking for specific website/service
- Related questions: Think about what users ask before/after this question
- Answer requirements: List what a complete answer must include
- Question variations: Include natural language variations people use

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
            content: 'You are an SEO and AEO expert. Return only valid JSON, no markdown, no explanations.'
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
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and structure response
    const analysis: QuestionAnalysis = {
      primary_question: parsed.primary_question || queryOrTopic,
      question_type: parsed.question_type || 'what',
      intent: parsed.intent || 'informational',
      related_questions: Array.isArray(parsed.related_questions) ? parsed.related_questions : [],
      answer_requirements: Array.isArray(parsed.answer_requirements) ? parsed.answer_requirements : [],
      question_variations: Array.isArray(parsed.question_variations) ? parsed.question_variations : []
    };

    return analysis;
  } catch (error) {
    console.error('Error analyzing question with AI:', error);
    throw error;
  }
}

/**
 * Extract questions from existing content
 */
function extractQuestionsFromContent(content: string): string[] {
  const questions: string[] = [];
  
  // Pattern 1: Direct questions (ending with ?)
  const questionPattern = /[^.!?]*\?/g;
  const matches = content.match(questionPattern);
  if (matches) {
    questions.push(...matches.map(q => q.trim()));
  }
  
  // Pattern 2: FAQ-style headings
  const faqPattern = /(?:^|\n)(?:##?\s+)?(?:Q:|Question:|FAQ:)?\s*([^?\n]+\?)/gim;
  let faqMatch;
  while ((faqMatch = faqPattern.exec(content)) !== null) {
    if (faqMatch[1]) {
      questions.push(faqMatch[1].trim());
    }
  }
  
  // Pattern 3: "People also ask" style patterns
  const paaPattern = /(?:people also ask|you might wonder|common questions?)[:.]?\s*([^.\n]+\?)/gim;
  let paaMatch;
  while ((paaMatch = paaPattern.exec(content)) !== null) {
    if (paaMatch[1]) {
      questions.push(paaMatch[1].trim());
    }
  }
  
  return [...new Set(questions)]; // Remove duplicates
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
    const body: QuestionAnalyzerRequest = await req.json();
    
    const { query, topic, content, vertical, city, state, generate_related = true } = body;

    // Determine input source
    const input = query || topic;
    
    if (!input && !content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Either query/topic or content is required'
        } as QuestionAnalyzerResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let analysis: QuestionAnalysis;

    if (content) {
      // Extract questions from content
      const extractedQuestions = extractQuestionsFromContent(content);
      
      if (extractedQuestions.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No questions found in content'
          } as QuestionAnalyzerResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Analyze the first (primary) question
      analysis = await analyzeQuestionWithAI(
        extractedQuestions[0],
        vertical,
        city,
        state,
        generate_related
      );

      // Add other extracted questions as related
      if (extractedQuestions.length > 1) {
        analysis.related_questions = [
          ...analysis.related_questions,
          ...extractedQuestions.slice(1)
        ];
      }
    } else {
      // Analyze query/topic
      analysis = await analyzeQuestionWithAI(
        input!,
        vertical,
        city,
        state,
        generate_related
      );
    }

    const response: QuestionAnalyzerResponse = {
      success: true,
      primary_question: analysis.primary_question,
      question_type: analysis.question_type,
      intent: analysis.intent,
      related_questions: analysis.related_questions,
      answer_requirements: analysis.answer_requirements,
      question_variations: analysis.question_variations
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Question Analyzer Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as QuestionAnalyzerResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

