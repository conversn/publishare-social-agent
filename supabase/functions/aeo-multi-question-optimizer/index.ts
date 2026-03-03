/**
 * Supabase Edge Function: AEO Multi-Question Content Optimizer
 * 
 * Ensures content answers multiple related questions effectively.
 * Maps questions to content sections and validates coverage.
 * 
 * Request Body:
 * {
 *   primary_question: string (required) - Main question
 *   secondary_questions: string[] (optional) - Related questions
 *   content: string (required) - Content to optimize
 *   article_id?: string (optional) - Article ID to fetch content from
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   primary_question_coverage: {
 *     question: string
 *     section: string
 *     coverage_score: number (0-100)
 *     status: 'covered' | 'partial' | 'missing'
 *   }
 *   secondary_questions_coverage: Array<{
 *     question: string
 *     section: string
 *     coverage_score: number (0-100)
 *     status: 'covered' | 'partial' | 'missing'
 *     improvements?: string[]
 *   }>
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

interface MultiQuestionRequest {
  primary_question: string;
  secondary_questions?: string[];
  content?: string;
  article_id?: string;
}

interface QuestionCoverage {
  question: string;
  section: string;
  coverage_score: number;
  status: 'covered' | 'partial' | 'missing';
  improvements?: string[];
}

interface MultiQuestionResponse {
  success: boolean;
  primary_question_coverage: QuestionCoverage;
  secondary_questions_coverage: QuestionCoverage[];
  recommendations: string[];
  error?: string;
}

/**
 * Analyze multi-question coverage using AI
 */
async function analyzeMultiQuestionCoverage(
  primaryQuestion: string,
  secondaryQuestions: string[],
  content: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<{
  primary: QuestionCoverage;
  secondary: QuestionCoverage[];
  recommendations: string[];
}> {
  // Use query-content-mapper to map questions to sections
  let mappings: any[] = [];
  
  if (supabaseUrl && supabaseKey) {
    try {
      const mappingResponse = await fetch(`${supabaseUrl}/functions/v1/aeo-query-content-mapper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          queries: [primaryQuestion, ...secondaryQuestions],
          content: content
        })
      });

      if (mappingResponse.ok) {
        const mappingData = await mappingResponse.json();
        mappings = mappingData.mappings || [];
      }
    } catch (error) {
      console.error('Error calling query-content-mapper:', error);
    }
  }

  // Use answer-completeness for each question
  const primaryMapping = mappings.find(m => m.query === primaryQuestion) || {
    query: primaryQuestion,
    best_matching_section: 'Introduction',
    confidence_score: 0
  };

  let primaryCoverage: QuestionCoverage = {
    question: primaryQuestion,
    section: primaryMapping.best_matching_section,
    coverage_score: Math.round(primaryMapping.confidence_score * 100),
    status: primaryMapping.confidence_score >= 0.7 ? 'covered' : 
            primaryMapping.confidence_score >= 0.4 ? 'partial' : 'missing'
  };

  // Get completeness score for primary question
  if (supabaseUrl && supabaseKey) {
    try {
      const completenessResponse = await fetch(`${supabaseUrl}/functions/v1/aeo-answer-completeness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          question: primaryQuestion,
          content: content
        })
      });

      if (completenessResponse.ok) {
        const completenessData = await completenessResponse.json();
        primaryCoverage.coverage_score = completenessData.question_coverage || primaryCoverage.coverage_score;
        if (completenessData.recommendations) {
          primaryCoverage.improvements = completenessData.recommendations;
        }
      }
    } catch (error) {
      console.error('Error calling answer-completeness:', error);
    }
  }

  // Analyze secondary questions
  const secondaryCoverage: QuestionCoverage[] = secondaryQuestions.map(question => {
    const mapping = mappings.find(m => m.query === question) || {
      query: question,
      best_matching_section: 'Not found',
      confidence_score: 0
    };

    return {
      question,
      section: mapping.best_matching_section,
      coverage_score: Math.round(mapping.confidence_score * 100),
      status: mapping.confidence_score >= 0.7 ? 'covered' : 
              mapping.confidence_score >= 0.4 ? 'partial' : 'missing',
      improvements: mapping.suggested_improvements || []
    };
  });

  // Generate recommendations
  const recommendations: string[] = [];

  if (primaryCoverage.status !== 'covered') {
    recommendations.push(`Primary question needs better coverage: ${primaryQuestion}`);
    if (primaryCoverage.improvements) {
      recommendations.push(...primaryCoverage.improvements);
    }
  }

  const missingSecondary = secondaryCoverage.filter(q => q.status === 'missing');
  if (missingSecondary.length > 0) {
    recommendations.push(`${missingSecondary.length} secondary question(s) not addressed in content`);
    missingSecondary.forEach(q => {
      recommendations.push(`- Add section for: "${q.question}"`);
    });
  }

  const partialSecondary = secondaryCoverage.filter(q => q.status === 'partial');
  if (partialSecondary.length > 0) {
    recommendations.push(`${partialSecondary.length} secondary question(s) need expansion`);
    partialSecondary.forEach(q => {
      recommendations.push(`- Expand section "${q.section}" to better answer: "${q.question}"`);
    });
  }

  return {
    primary: primaryCoverage,
    secondary: secondaryCoverage,
    recommendations
  };
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
    const body: MultiQuestionRequest = await req.json();
    
    const { primary_question, secondary_questions = [], content, article_id } = body;

    if (!primary_question) {
      return new Response(
        JSON.stringify({
          success: false,
          primary_question_coverage: {
            question: '',
            section: '',
            coverage_score: 0,
            status: 'missing'
          },
          secondary_questions_coverage: [],
          recommendations: [],
          error: 'primary_question is required'
        } as MultiQuestionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let contentToAnalyze = content;

    // Fetch content from database if article_id provided
    if (article_id && !contentToAnalyze) {
      const { data: article, error } = await supabase
        .from('articles')
        .select('content, html_body')
        .eq('id', article_id)
        .single();
      
      if (error) {
        return new Response(
          JSON.stringify({
            success: false,
            primary_question_coverage: {
              question: primary_question,
              section: '',
              coverage_score: 0,
              status: 'missing'
            },
            secondary_questions_coverage: [],
            recommendations: [],
            error: `Error fetching article: ${error.message}`
          } as MultiQuestionResponse),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      contentToAnalyze = article?.content || article?.html_body || '';
    }

    if (!contentToAnalyze) {
      return new Response(
        JSON.stringify({
          success: false,
          primary_question_coverage: {
            question: primary_question,
            section: '',
            coverage_score: 0,
            status: 'missing'
          },
          secondary_questions_coverage: [],
          recommendations: [],
          error: 'content or article_id is required'
        } as MultiQuestionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Analyze coverage
    const analysis = await analyzeMultiQuestionCoverage(
      primary_question,
      secondary_questions,
      contentToAnalyze,
      supabaseUrl,
      supabaseKey
    );

    const response: MultiQuestionResponse = {
      success: true,
      primary_question_coverage: analysis.primary,
      secondary_questions_coverage: analysis.secondary,
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
    console.error('Multi-Question Optimizer Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        primary_question_coverage: {
          question: body?.primary_question || '',
          section: '',
          coverage_score: 0,
          status: 'missing'
        },
        secondary_questions_coverage: [],
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as MultiQuestionResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

