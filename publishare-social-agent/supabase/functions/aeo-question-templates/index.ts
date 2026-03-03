/**
 * Supabase Edge Function: AEO Question Template Generator
 * 
 * Generates question templates and variations based on vertical/topic patterns
 * for AEO optimization. Helps ensure content answers the right questions.
 * 
 * Request Body:
 * {
 *   vertical?: string (optional) - Service vertical (hvac, plumbing, etc.)
 *   topic?: string (optional) - Topic/keyword
 *   city?: string (optional) - City for local SEO
 *   state?: string (optional) - State for local SEO
 *   question_type?: string (optional) - Filter by question type (what, how, why, etc.)
 *   generate_variations?: boolean (optional, default: true)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   templates: Array<{
 *     template: string
 *     variations: string[]
 *     answer_structure: string[]
 *     question_type: string
 *     intent: string
 *   }>
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionTemplateRequest {
  vertical?: string;
  topic?: string;
  city?: string;
  state?: string;
  question_type?: 'what' | 'how' | 'why' | 'when' | 'where' | 'who' | 'which';
  generate_variations?: boolean;
}

interface QuestionTemplate {
  template: string;
  variations: string[];
  answer_structure: string[];
  question_type: string;
  intent: string;
}

interface QuestionTemplateResponse {
  success: boolean;
  templates: QuestionTemplate[];
  error?: string;
}

/**
 * Generate question templates using AI
 */
async function generateQuestionTemplates(
  vertical?: string,
  topic?: string,
  city?: string,
  state?: string,
  questionType?: string,
  generateVariations: boolean = true
): Promise<QuestionTemplate[]> {
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  
  if (!deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable not set');
  }

  const context = [];
  if (city && state) context.push(`${city}, ${state}`);
  if (vertical) context.push(`${vertical} services`);
  if (topic) context.push(`topic: ${topic}`);
  
  const contextText = context.length > 0 ? `\n\nContext: ${context.join(' - ')}` : '';
  const typeFilter = questionType ? `\n\nFocus on "${questionType}" type questions.` : '';

  const prompt = `Generate AEO question templates for Answer Engine Optimization.

${contextText}${typeFilter}

Create 5-8 question templates that users commonly search for. For each template, provide:

1. Template: A question pattern (e.g., "What is [service] in [city]?")
2. Variations: 3-5 different ways users phrase this question
3. Answer Structure: What the answer must include to fully address the question
4. Question Type: what|how|why|when|where|who|which
5. Intent: informational|transactional|navigational

Return JSON array:
[
  {
    "template": "Question template with placeholders",
    "variations": ["Variation 1", "Variation 2", ...],
    "answer_structure": ["Required element 1", "Required element 2", ...],
    "question_type": "what|how|why|when|where|who|which",
    "intent": "informational|transactional|navigational"
  },
  ...
]

Guidelines:
- Templates should be specific to the vertical/topic
- Include local context if city/state provided
- Mix informational and transactional questions
- Variations should reflect natural language differences
- Answer structure should list key components needed

Return ONLY valid JSON array, no markdown, no explanations.`;

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
        temperature: 0.8,
        max_tokens: 3000,
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

    // Handle both array and object with templates key
    let templates: any[] = [];
    if (Array.isArray(parsed)) {
      templates = parsed;
    } else if (parsed.templates && Array.isArray(parsed.templates)) {
      templates = parsed.templates;
    } else {
      throw new Error('Invalid response format: expected array or object with templates array');
    }

    // Validate and structure templates
    return templates.map((t: any) => ({
      template: t.template || '',
      variations: Array.isArray(t.variations) ? t.variations : [],
      answer_structure: Array.isArray(t.answer_structure) ? t.answer_structure : [],
      question_type: t.question_type || 'what',
      intent: t.intent || 'informational'
    })).filter(t => t.template.length > 0);

  } catch (error) {
    console.error('Error generating question templates:', error);
    throw error;
  }
}

/**
 * Generate default templates for common verticals
 */
function getDefaultTemplates(vertical?: string, city?: string, state?: string): QuestionTemplate[] {
  const location = city && state ? ` in ${city}, ${state}` : '';
  const service = vertical || 'service';
  
  const baseTemplates: QuestionTemplate[] = [
    {
      template: `What is ${service}${location}?`,
      variations: [
        `What does ${service} involve${location}?`,
        `${service} definition${location}`,
        `Understanding ${service}${location}`
      ],
      answer_structure: [
        'Clear definition',
        'What it involves',
        'When it\'s needed',
        'Key components'
      ],
      question_type: 'what',
      intent: 'informational'
    },
    {
      template: `How much does ${service} cost${location}?`,
      variations: [
        `${service} pricing${location}`,
        `${service} cost${location}`,
        `How much to pay for ${service}${location}?`
      ],
      answer_structure: [
        'Price ranges',
        'Factors affecting cost',
        'Average costs',
        'When to expect higher/lower costs'
      ],
      question_type: 'how',
      intent: 'transactional'
    },
    {
      template: `When do I need ${service}${location}?`,
      variations: [
        `When to call ${service}${location}?`,
        `Signs you need ${service}${location}`,
        `${service} emergency${location}`
      ],
      answer_structure: [
        'Warning signs',
        'Timing indicators',
        'Emergency situations',
        'Preventive maintenance schedule'
      ],
      question_type: 'when',
      intent: 'transactional'
    }
  ];

  return baseTemplates;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: QuestionTemplateRequest = await req.json();
    
    const { vertical, topic, city, state, question_type, generate_variations = true } = body;

    let templates: QuestionTemplate[] = [];

    // Try AI generation first
    try {
      templates = await generateQuestionTemplates(
        vertical,
        topic,
        city,
        state,
        question_type,
        generate_variations
      );
    } catch (error) {
      console.error('AI template generation failed, using defaults:', error);
      // Fallback to default templates
      templates = getDefaultTemplates(vertical, city, state);
    }

    // Filter by question type if specified
    if (question_type && templates.length > 0) {
      templates = templates.filter(t => t.question_type === question_type);
    }

    const response: QuestionTemplateResponse = {
      success: true,
      templates
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Question Template Generator Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        templates: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      } as QuestionTemplateResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

