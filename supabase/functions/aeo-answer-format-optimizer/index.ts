/**
 * Supabase Edge Function: AEO Answer Format Optimizer
 * 
 * Determines the optimal answer format based on question type and intent
 * for AEO optimization. Ensures answers match question expectations.
 * 
 * Request Body:
 * {
 *   question: string (required) - The question being answered
 *   question_type?: string (optional) - Type of question (what, how, why, etc.)
 *   intent?: string (optional) - User intent (informational, transactional, navigational)
 *   vertical?: string (optional) - Service vertical
 *   content?: string (optional) - Existing content to optimize
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   optimal_format: 'definition' | 'list' | 'step-by-step' | 'comparison' | 'data-driven' | 'narrative'
 *   required_elements: string[]
 *   format_guidelines: string[]
 *   example_structure?: string
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnswerFormatRequest {
  question: string;
  question_type?: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which';
  intent?: 'informational' | 'transactional' | 'navigational';
  vertical?: string;
  content?: string;
}

interface AnswerFormatResponse {
  success: boolean;
  optimal_format: 'definition' | 'list' | 'step-by-step' | 'comparison' | 'data-driven' | 'narrative';
  required_elements: string[];
  format_guidelines: string[];
  example_structure?: string;
  error?: string;
}

/**
 * Determine optimal format using AI
 */
async function determineOptimalFormat(
  question: string,
  questionType?: string,
  intent?: string,
  vertical?: string
): Promise<AnswerFormatResponse> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const prompt = `Determine the optimal answer format for this question for Answer Engine Optimization (AEO):

QUESTION: "${question}"
${questionType ? `Question Type: ${questionType}` : ''}
${intent ? `Intent: ${intent}` : ''}
${vertical ? `Vertical: ${vertical}` : ''}

Return JSON:
{
  "optimal_format": "definition|list|step-by-step|comparison|data-driven|narrative",
  "required_elements": [
    "What must be included in this format",
    "Key components needed"
  ],
  "format_guidelines": [
    "How to structure the answer",
    "Best practices for this format"
  ],
  "example_structure": "Example of how the answer should be structured"
}

Format Guidelines:
- definition: For "what is" questions - clear definition, characteristics, examples
- list: For questions asking for multiple items - bulleted/numbered list
- step-by-step: For "how to" questions - sequential steps with clear actions
- comparison: For "which is better" or "vs" questions - side-by-side comparison
- data-driven: For "how much", "how many" questions - statistics, numbers, data
- narrative: For "why" or "when" questions - story/explanation format

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
        max_tokens: 1500,
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
      success: true,
      optimal_format: parsed.optimal_format || 'definition',
      required_elements: Array.isArray(parsed.required_elements) ? parsed.required_elements : [],
      format_guidelines: Array.isArray(parsed.format_guidelines) ? parsed.format_guidelines : [],
      example_structure: parsed.example_structure
    };
  } catch (error) {
    console.error('Error determining optimal format:', error);
    throw error;
  }
}

/**
 * Determine format based on question patterns (fallback)
 */
function determineFormatFromPattern(
  question: string,
  questionType?: string
): AnswerFormatResponse {
  const lowerQuestion = question.toLowerCase();
  
  let optimalFormat: AnswerFormatResponse['optimal_format'] = 'definition';
  let requiredElements: string[] = [];
  let formatGuidelines: string[] = [];
  let exampleStructure = '';

  // Determine format based on question type
  if (questionType === 'what' || /^what (is|are|does|do)/i.test(question)) {
    optimalFormat = 'definition';
    requiredElements = ['Clear definition', 'Key characteristics', 'Examples', 'Context'];
    formatGuidelines = [
      'Start with a direct definition',
      'Explain what it is in simple terms',
      'Provide examples',
      'Add context about when/why it matters'
    ];
    exampleStructure = 'Definition → Characteristics → Examples → Context';
  } else if (questionType === 'how' || /^how (to|do|much|many)/i.test(question)) {
    if (/how (much|many|long)/i.test(question)) {
      optimalFormat = 'data-driven';
      requiredElements = ['Specific numbers', 'Price ranges', 'Timeframes', 'Comparisons'];
      formatGuidelines = [
        'Lead with the number/answer',
        'Provide ranges when exact numbers vary',
        'Include factors that affect the number',
        'Add context about what influences the cost/time'
      ];
      exampleStructure = 'Direct Answer (Number) → Range → Factors → Context';
    } else {
      optimalFormat = 'step-by-step';
      requiredElements = ['Clear steps', 'Action items', 'Tools needed', 'Expected outcomes'];
      formatGuidelines = [
        'Number each step clearly',
        'Use action verbs',
        'Include prerequisites',
        'Add tips or warnings'
      ];
      exampleStructure = 'Step 1 → Step 2 → Step 3 → Tips/Warnings';
    }
  } else if (questionType === 'why' || /^why/i.test(question)) {
    optimalFormat = 'narrative';
    requiredElements = ['Explanation', 'Reasons', 'Context', 'Implications'];
    formatGuidelines = [
      'Start with the main reason',
      'Explain the "why" clearly',
      'Provide supporting context',
      'Connect to implications'
    ];
    exampleStructure = 'Main Reason → Supporting Reasons → Context → Implications';
  } else if (questionType === 'when' || /^when/i.test(question)) {
    optimalFormat = 'data-driven';
    requiredElements = ['Timeframes', 'Signs/indicators', 'Best times', 'Urgency level'];
    formatGuidelines = [
      'Provide specific timeframes',
      'List warning signs',
      'Explain urgency levels',
      'Include seasonal/timing factors'
    ];
    exampleStructure = 'Timeframe → Signs → Urgency → Timing Factors';
  } else if (questionType === 'which' || /^which|vs|versus|compare/i.test(question)) {
    optimalFormat = 'comparison';
    requiredElements = ['Options', 'Comparison criteria', 'Pros/cons', 'Recommendation'];
    formatGuidelines = [
      'List the options clearly',
      'Compare on key criteria',
      'Show pros and cons',
      'Provide a recommendation if appropriate'
    ];
    exampleStructure = 'Options → Criteria → Pros/Cons → Recommendation';
  } else if (/list|what are|examples/i.test(question)) {
    optimalFormat = 'list';
    requiredElements = ['Items', 'Descriptions', 'Categories', 'Examples'];
    formatGuidelines = [
      'Use bullet points or numbered list',
      'Group related items',
      'Provide brief descriptions',
      'Include examples'
    ];
    exampleStructure = 'Category 1 → Items → Category 2 → Items';
  }

  return {
    success: true,
    optimal_format: optimalFormat,
    required_elements: requiredElements,
    format_guidelines: formatGuidelines,
    example_structure: exampleStructure
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: AnswerFormatRequest = await req.json();
    
    const { question, question_type, intent, vertical, content } = body;

    if (!question) {
      return new Response(
        JSON.stringify({
          success: false,
          optimal_format: 'definition',
          required_elements: [],
          format_guidelines: [],
          error: 'question is required'
        } as AnswerFormatResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let formatResponse: AnswerFormatResponse;

    // Try AI determination first
    try {
      formatResponse = await determineOptimalFormat(question, question_type, intent, vertical);
    } catch (error) {
      console.error('AI format determination failed, using pattern matching:', error);
      // Fallback to pattern matching
      formatResponse = determineFormatFromPattern(question, question_type);
    }

    return new Response(
      JSON.stringify(formatResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Answer Format Optimizer Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        optimal_format: 'definition',
        required_elements: [],
        format_guidelines: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as AnswerFormatResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

