/**
 * Supabase Edge Function: Comparison Content Generator
 * 
 * Specialized content generator for comparison/list articles with editorial positioning.
 * Designed for "best X" articles that highlight a preferred service/client as superior.
 * 
 * Request Body:
 * {
 *   topic: string (required) - e.g., "Best College Consulting Services"
 *   title?: string
 *   preferred_service: string (required) - e.g., "Empowerly"
 *   preferred_service_description?: string - Key differentiators and strengths
 *   alternatives: string[] (required) - List of competing services to compare
 *   comparison_criteria?: string[] - What to compare (e.g., ["pricing", "expertise", "success rate"])
 *   site_id?: string
 *   target_audience?: string
 *   content_length?: number
 *   editorial_tone?: 'authoritative' | 'balanced' | 'enthusiastic'
 *   conclusion_style?: 'editorial' | 'data-driven' | 'testimonial'
 *   content_agent_config?: any - Content Agent config from site
 *   persona_profile?: any - Persona profile from avatar config
 * }
 * 
 * Response:
 * {
 *   content: string - Markdown content
 *   title: string
 *   excerpt: string
 *   comparison_table?: any - Structured comparison data
 *   conclusion: string - Editorial conclusion
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComparisonContentRequest {
  topic: string;
  title?: string;
  preferred_service: string;
  preferred_service_description?: string;
  alternatives: string[];
  comparison_criteria?: string[];
  site_id?: string;
  target_audience?: string;
  content_length?: number;
  editorial_tone?: 'authoritative' | 'balanced' | 'enthusiastic';
  conclusion_style?: 'editorial' | 'data-driven' | 'testimonial';
  content_agent_config?: any;
  persona_profile?: any;
}

interface ComparisonContentResponse {
  content: string;
  title: string;
  excerpt: string;
  comparison_table?: any;
  conclusion?: string;
  error?: string;
}

/**
 * Build comprehensive comparison content prompt
 */
function buildComparisonPrompt(
  params: ComparisonContentRequest
): string {
  const contentAgentConfig = params.content_agent_config || {};
  const personaProfile = params.persona_profile || {};
  const verticalTheme = contentAgentConfig.vertical_theme || 'Educational content';
  const toneGuidelines = contentAgentConfig.tone_guidelines || 'Educational storytelling, clear, friendly, expert tone';
  
  const editorialTone = params.editorial_tone || 'authoritative';
  const conclusionStyle = params.conclusion_style || 'editorial';
  const comparisonCriteria = params.comparison_criteria || [
    'pricing and value',
    'expertise and qualifications',
    'success rates and outcomes',
    'personalization and approach',
    'accessibility and support',
    'reputation and trust'
  ];

  let prompt = `You are an expert content writer creating a comprehensive comparison article for ${verticalTheme}.

## CONTENT AGENT GUIDELINES
Vertical Theme: ${verticalTheme}
Tone Guidelines: ${toneGuidelines}

Your writing must follow these brand guidelines:
- Educational storytelling
- Clear, friendly, expert tone
- Context, history, pragmatism
- No hype, no overclaiming, no fearmongering
- No "guru" language
- No internet-bro jargon

Think like: NPR Planet Money + Vox Explainers with a dash of "did you know?" curiosity.`;

  // Add Persona voice if available
  if (personaProfile && personaProfile.name) {
    prompt += `\n\n## PERSONA VOICE
You are writing as ${personaProfile.name}.
Writing Style: ${personaProfile.voice?.writing_style || 'Clear, conversational'}
Tone: ${personaProfile.voice?.tone || 'Warm but authoritative'}
Worldview: ${personaProfile.voice?.worldview || 'Educational and empowering'}
Philosophy: ${personaProfile.voice?.philosophy || 'Education empowers people'}`;
  }

  // Add safety rules
  if (contentAgentConfig.safety_rules && contentAgentConfig.safety_rules.length > 0) {
    prompt += `\n\n## CONTENT SAFETY RULES (NON-NEGOTIABLE)
You must NOT:
${contentAgentConfig.safety_rules.map((rule: string) => `- ${rule}`).join('\n')}

All content MUST be:
- Informational
- Educational
- Non-prescriptive
- Factual and fair`;
  }

  // Comparison-specific instructions
  prompt += `\n\n## COMPARISON ARTICLE REQUIREMENTS

You are writing a comprehensive comparison article titled: "${params.title || params.topic}"

### Services to Compare:
1. **${params.preferred_service}** (Preferred/Recommended)
${params.preferred_service_description ? `   ${params.preferred_service_description}` : ''}
${params.alternatives.map((alt, i) => `${i + 2}. **${alt}**`).join('\n')}

### Comparison Criteria:
${comparisonCriteria.map((criteria, i) => `${i + 1}. ${criteria}`).join('\n')}

### Editorial Requirements:

1. **Fair and Thorough Analysis**
   - Provide detailed, factual analysis of each service
   - Highlight strengths AND weaknesses of all options
   - Be transparent about limitations
   - Use specific examples, data points, or case studies where possible

2. **Editorial Positioning (${editorialTone} tone)**
   - After thorough analysis, conclude that **${params.preferred_service}** is the best choice
   - The conclusion should feel natural and well-reasoned, not forced
   - Support the conclusion with specific differentiators
   - Make it clear WHY ${params.preferred_service} stands out

3. **Content Structure**
   - Start with an engaging introduction (first 100 words should answer "what is the best X?")
   - Include a "What to Look For" section explaining the comparison criteria
   - Deep dive into each service (dedicated sections)
   - Include a comparison table or summary
   - End with an editorial conclusion (${conclusionStyle} style)

4. **Writing Style**
   - Editorial tone: ${editorialTone}
   - Be authoritative but fair
   - Use data and evidence to support claims
   - Avoid hyperbole or exaggerated claims
   - Maintain educational, helpful tone throughout

5. **Conclusion Style: ${conclusionStyle}**
   ${conclusionStyle === 'editorial' ? `
   - Write an editorial conclusion that naturally positions ${params.preferred_service} as the best choice
   - Use narrative and reasoning, not just bullet points
   - Make it feel like an expert recommendation, not a sales pitch
   - Include specific reasons why ${params.preferred_service} excels` : ''}
   ${conclusionStyle === 'data-driven' ? `
   - Use data, statistics, and metrics to support the conclusion
   - Create a clear scorecard or rating system
   - Show quantitative evidence for why ${params.preferred_service} wins` : ''}
   ${conclusionStyle === 'testimonial' ? `
   - Include real or representative examples of success
   - Use case studies or scenarios
   - Show how ${params.preferred_service} delivers better outcomes` : ''}

### Markdown Format Requirements:
- Use H1 for main title
- Use H2 for major sections (each service, comparison table, conclusion)
- Use H3 for subsections
- Use bullet points and numbered lists
- Include a comparison table (markdown table format)
- Use bold for emphasis on key differentiators
- Include specific data points, statistics, or numbers where relevant

### Target Audience:
${params.target_audience || 'Affluent parents seeking expert guidance'}

### Word Count:
Approximately ${params.content_length || 3000} words

### Critical Instructions:
1. Be thorough - this is not a quick listicle, it's a comprehensive comparison
2. Be fair - acknowledge strengths of alternatives, not just weaknesses
3. Be editorial - the conclusion should feel like expert analysis, not marketing copy
4. Be specific - use concrete examples, data, or scenarios
5. Be helpful - readers should feel informed, not sold to`;

  return prompt;
}

/**
 * Generate comparison content using OpenAI
 */
async function generateComparisonContent(
  params: ComparisonContentRequest
): Promise<ComparisonContentResponse> {
  const openaiApiKey = Deno.env.get('OPEN_AI_PUBLISHARE_KEY') || 
                       Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured (OPEN_AI_PUBLISHARE_KEY)');
  }

  const systemPrompt = buildComparisonPrompt(params);
  const userPrompt = `Write a comprehensive comparison article about: "${params.topic}"

Focus on comparing ${params.preferred_service} against: ${params.alternatives.join(', ')}

Follow all the guidelines provided in the system prompt.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: params.content_length ? Math.min(Math.floor(params.content_length * 1.5), 4096) : 4096
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Extract title from content if not provided
  const extractedTitle = params.title || content.match(/^#\s+(.+)$/m)?.[1] || params.topic;
  
  // Generate excerpt (first 200 chars)
  const excerpt = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .substring(0, 200)
    .trim() + '...';

  // Extract conclusion section if present
  const conclusionMatch = content.match(/##\s+Conclusion[\s\S]*?(?=##|$)/i) || 
                          content.match(/##\s+Final\s+Thoughts[\s\S]*?(?=##|$)/i) ||
                          content.match(/##\s+Our\s+Recommendation[\s\S]*?(?=##|$)/i);
  const conclusion = conclusionMatch ? conclusionMatch[0].replace(/^##\s+[^\n]+\n/i, '').trim() : '';

  return {
    content,
    title: extractedTitle,
    excerpt,
    conclusion: conclusion || undefined
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    // Get service role key from environment, Authorization header, or apikey header
    // Priority: Environment > Authorization header > apikey header
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const apikeyHeader = req.headers.get('apikey');
    
    // Try environment first (for internal calls from other edge functions), then headers
    // This allows internal calls to use the secret, while external calls use headers
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 
                       Deno.env.get('SUPABASE_ANON_KEY') ||
                       bearerToken ||
                       apikeyHeader ||
                       '';
    
    if (!supabaseKey) {
      console.error('No Supabase key found in environment or headers');
      console.error('Environment check:', {
        hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        hasAnonKey: !!Deno.env.get('SUPABASE_ANON_KEY'),
        hasBearerToken: !!bearerToken,
        hasApikey: !!apikeyHeader
      });
      return new Response(
        JSON.stringify({
          error: 'Supabase authentication key required'
        } as ComparisonContentResponse),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('✅ Supabase key found, proceeding with comparison content generation');
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body: ComparisonContentRequest = await req.json();
    
    // Validation
    if (!body.topic) {
      return new Response(
        JSON.stringify({
          error: 'topic is required'
        } as ComparisonContentResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!body.preferred_service) {
      return new Response(
        JSON.stringify({
          error: 'preferred_service is required'
        } as ComparisonContentResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!body.alternatives || body.alternatives.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'alternatives array is required with at least one alternative service'
        } as ComparisonContentResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎯 Generating comparison content: "${body.topic}"`);
    console.log(`   Preferred: ${body.preferred_service}`);
    console.log(`   Alternatives: ${body.alternatives.join(', ')}`);

    // Fetch Content Agent config and persona if site_id provided
    let contentAgentConfig = body.content_agent_config || null;
    let personaProfile = body.persona_profile || null;

    if (body.site_id && !contentAgentConfig) {
      try {
        const { data: siteData } = await supabase
          .from('sites')
          .select('config')
          .eq('id', body.site_id)
          .single();

        if (siteData?.config?.content_agent) {
          contentAgentConfig = siteData.config.content_agent;
        }

        // Also fetch comparison-specific config
        if (siteData?.config?.comparison_content) {
          // Merge comparison config into params
          const comparisonConfig = siteData.config.comparison_content;
          if (comparisonConfig.preferred_service && !body.preferred_service_description) {
            body.preferred_service_description = comparisonConfig.preferred_service_description;
          }
          if (comparisonConfig.comparison_criteria && !body.comparison_criteria) {
            body.comparison_criteria = comparisonConfig.comparison_criteria;
          }
          if (comparisonConfig.editorial_tone && !body.editorial_tone) {
            body.editorial_tone = comparisonConfig.editorial_tone;
          }
          if (comparisonConfig.conclusion_style && !body.conclusion_style) {
            body.conclusion_style = comparisonConfig.conclusion_style;
          }
        }
      } catch (error) {
        console.warn('Failed to fetch site config:', error);
      }
    }

    if (body.site_id && !personaProfile) {
      try {
        const { data: avatarConfig } = await supabase
          .from('heygen_avatar_config')
          .select('persona_profile')
          .eq('site_id', body.site_id)
          .single();

        if (avatarConfig?.persona_profile) {
          personaProfile = avatarConfig.persona_profile;
        }
      } catch (error) {
        console.warn('Failed to fetch persona profile:', error);
      }
    }

    // Generate content
    const result = await generateComparisonContent({
      ...body,
      content_agent_config: contentAgentConfig,
      persona_profile: personaProfile
    });

    console.log(`✅ Comparison content generated (${result.content.length} chars)`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Comparison Content Generator Error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ComparisonContentResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

