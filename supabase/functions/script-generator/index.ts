/**
 * Supabase Edge Function: Script Generator
 * 
 * Converts article content into structured video scripts following
 * Simple Media Network Content Agent Prompt rules.
 * 
 * Uses:
 * - Content Agent configuration from sites.config
 * - Persona profile from heygen_avatar_config
 * - Article content and metadata
 * 
 * Request Body:
 * {
 *   article_id: string (required)
 *   script_type?: 'short-form' | 'long-form' (default: 'short-form')
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   script: {
 *     hook: string
 *     context?: string
 *     beats?: string[]
 *     sections?: Array<{title: string, content: string}>
 *     surprise?: string
 *     story?: string
 *     tips?: string[]
 *     summary?: string
 *     cta: string
 *   }
 *   overlay_text: string
 *   broll_suggestions: string[]
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScriptGeneratorRequest {
  article_id: string;
  script_type?: 'short-form' | 'long-form';
}

/**
 * Get Content Agent configuration for a site
 */
async function getContentAgentConfig(
  supabase: any,
  siteId: string
): Promise<any> {
  const { data: site } = await supabase
    .from('sites')
    .select('config, domain')
    .eq('id', siteId)
    .single();
  
  if (!site) {
    return null;
  }
  
  const contentAgent = site.config?.content_agent || {};
  return {
    ...contentAgent,
    domain: site.domain || `${siteId}.org`
  };
}

/**
 * Get persona profile for a site
 */
async function getPersonaProfile(
  supabase: any,
  siteId: string
): Promise<any> {
  const { data: avatarConfig } = await supabase
    .from('heygen_avatar_config')
    .select('persona_profile')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .single();
  
  return avatarConfig?.persona_profile || null;
}

/**
 * Build Content Agent system prompt
 */
function buildContentAgentPrompt(
  contentAgentConfig: any,
  personaProfile: any,
  scriptType: 'short-form' | 'long-form',
  articleTitle: string,
  articleContent: string
): string {
  const verticalTheme = contentAgentConfig.vertical_theme || 'Financial education';
  const toneGuidelines = contentAgentConfig.tone_guidelines || 'Educational storytelling, clear, friendly, expert tone';
  const overlayRules = contentAgentConfig.overlay_rules || {};
  const safetyRules = contentAgentConfig.safety_rules || [];
  const storytellingGuidelines = contentAgentConfig.storytelling_guidelines || {};
  
  let prompt = `You are the Simple Media Network Content Agent.

Your role is to generate structured video scripts following strict Content Agent rules.

## VERTICAL CONTEXT
Vertical Theme: ${verticalTheme}
Tone Guidelines: ${toneGuidelines}

## PERSONA VOICE
`;
  
  if (personaProfile) {
    prompt += `You are writing as ${personaProfile.name || 'the brand expert'}.
Writing Style: ${personaProfile.voice?.writing_style || 'Clear, conversational'}
Tone: ${personaProfile.voice?.tone || 'Warm but authoritative'}
Worldview: ${personaProfile.voice?.worldview || 'Educational and empowering'}
Philosophy: ${personaProfile.voice?.philosophy || 'Education empowers people'}

Speech Patterns: ${personaProfile.voice?.speech_patterns || 'Speaks in complete thoughts'}
Dialog Tags: ${(personaProfile.voice?.dialog_tags || []).join(', ')}

`;
  }
  
  prompt += `## SCRIPT STRUCTURE REQUIREMENTS

`;
  
  if (scriptType === 'short-form') {
    const shortForm = contentAgentConfig.script_structure?.short_form || {};
    prompt += `SHORT FORM (20s-40s):
1. Hook Sentence (≤ ${shortForm.hook_max_words || 10} words) - Clear, curiosity-based, non-clickbait
2. Context Line - Why this matters, in one sentence
3. Core Teaching (${shortForm.beats_count || 3} beats) - Short sentences, each delivering one idea
4. Surprise Insight - Something people don't know
5. Mini-CTA - "${shortForm.cta_format || 'Learn more at {domain}'}"

`;
  } else {
    const longForm = contentAgentConfig.script_structure?.long_form || {};
    prompt += `LONG FORM (3-5 minutes):
1. Cold Open Hook (≤ ${longForm.hook_max_words || 12} words)
2. Set the Stage
3. Breakdown of the Concept (${longForm.sections_count || 5} sections)
4. Story, Case, or Analogy
5. Modern Impact or Current Rule
6. Practical Tips (${longForm.tips_count || 5} bullet beats)
7. Closing Summary
8. CTA - "${longForm.cta_format || 'See the full guide at {domain}'}"

`;
  }
  
  prompt += `## ON-SCREEN TEXT RULES (NON-NEGOTIABLE)
- Max ${overlayRules.max_words || 8} words
- ${overlayRules.no_punctuation ? 'NO punctuation' : 'Minimal punctuation'}
- Readable in < ${overlayRules.readable_in_seconds || 1} second
- ${overlayRules.one_idea_max ? 'One idea maximum' : 'Simple ideas only'}
- Avoid complex grammar

## CONTENT SAFETY RULES
${safetyRules.map((rule: string) => `- ${rule}`).join('\n')}

## STORYTELLING GUIDELINES
Use: ${(storytellingGuidelines.use || []).join(', ')}
Avoid: ${(storytellingGuidelines.avoid || []).join(', ')}

## OUTPUT FORMAT
You MUST output valid JSON matching this structure:

${scriptType === 'short-form' ? `{
  "script": {
    "hook": "",
    "context": "",
    "beats": ["", "", ""],
    "surprise": "",
    "cta": ""
  },
  "overlay_text": "",
  "broll_suggestions": ["", "", ""]
}` : `{
  "script": {
    "hook": "",
    "setup": "",
    "sections": [
      {"title": "", "content": ""},
      {"title": "", "content": ""}
    ],
    "story": "",
    "tips": ["", "", ""],
    "summary": "",
    "cta": ""
  },
  "overlay_text": "",
  "broll_suggestions": ["", "", "", ""]
}`}

## ARTICLE CONTENT
Title: ${articleTitle}
Content: ${articleContent.substring(0, 5000)}

Generate the script now, following ALL rules above. Output ONLY valid JSON, no additional text.`;

  return prompt;
}

/**
 * Generate script using OpenAI
 */
async function generateScript(
  apiKey: string,
  prompt: string
): Promise<{ script?: any; overlay_text?: string; broll_suggestions?: string[]; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a scriptwriting expert. Always output valid JSON matching the exact structure requested. Never add explanatory text outside the JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: `OpenAI API error: ${response.status} - ${errorText}` };
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      return { error: 'No content in OpenAI response' };
    }
    
    try {
      const parsed = JSON.parse(content);
      return {
        script: parsed.script,
        overlay_text: parsed.overlay_text,
        broll_suggestions: parsed.broll_suggestions || []
      };
    } catch (parseError) {
      return { error: `Failed to parse JSON response: ${parseError}` };
    }
    
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
    const body: ScriptGeneratorRequest = await req.json();
    
    if (!body.article_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'article_id is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const scriptType = body.script_type || 'short-form';

    console.log(`📝 Generating ${scriptType} script for article ${body.article_id}`);

    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title, content, excerpt, speakable_summary, site_id')
      .eq('id', body.article_id)
      .single();

    if (articleError || !article) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Article not found: ${articleError?.message || 'Not found'}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const siteId = article.site_id || 'seniorsimple';

    // Get Content Agent config
    const contentAgentConfig = await getContentAgentConfig(supabase, siteId);
    if (!contentAgentConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Content Agent config not found for site: ${siteId}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get persona profile
    const personaProfile = await getPersonaProfile(supabase, siteId);

    // Build prompt
    const prompt = buildContentAgentPrompt(
      contentAgentConfig,
      personaProfile,
      scriptType,
      article.title || '',
      article.content || article.excerpt || article.speakable_summary || ''
    );

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPEN_AI_PUBLISHARE_KEY') || 
                        Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API key not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🤖 Generating script with OpenAI...`);

    // Generate script
    const scriptResult = await generateScript(openaiApiKey, prompt);

    if (scriptResult.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: scriptResult.error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Replace {domain} placeholder in CTA
    if (scriptResult.script?.cta) {
      scriptResult.script.cta = scriptResult.script.cta.replace(
        '{domain}',
        contentAgentConfig.domain || `${siteId}.org`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        script: scriptResult.script,
        overlay_text: scriptResult.overlay_text,
        broll_suggestions: scriptResult.broll_suggestions,
        script_type: scriptType,
        site_id: siteId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Script Generator Error:', error);
    
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


