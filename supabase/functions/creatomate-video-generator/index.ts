/**
 * Supabase Edge Function: Creatomate Video Generator
 * 
 * Unified Video Template Engine for Simple Media Network
 * 
 * Uses 4 master templates with dynamic brand injection:
 * - Long Form — Simple Explainer
 * - Short Form — Story Spark
 * - Short Form — Steps & Mistakes
 * - Short Form — Concept in 20s
 * 
 * Request Body:
 * {
 *   article_id: string (required)
 *   template_type?: 'story-spark' | 'steps-mistakes' | 'concept-20s' | 'long-form' (default: auto-select)
 *   use_voice?: boolean (default: false for shorts, true for long-form)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   video_url?: string
 *   render_id?: string
 *   provider: 'creatomate'
 *   template_id: string
 *   error?: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatomateVideoRequest {
  article_id: string;
  template_type?: 'story-spark' | 'steps-mistakes' | 'concept-20s' | 'long-form';
  use_voice?: boolean;
}

// Master Template IDs
const TEMPLATES = {
  'long-form': '45e99fdb-0130-453c-a3eb-aaadd5ac4bd4', // Simple Explainer
  'story-spark': 'e1a24ce7-9501-417c-a28c-1c2171142fff', // Story Spark
  'steps-mistakes': 'f80fd478-c290-49c4-8d5e-2ea311945a39', // Steps & Mistakes
  'concept-20s': '36934f8f-5b78-4788-8d1e-96c3ad92f965', // Concept in 20s
};

// Brand Color Mapping
const BRAND_COLORS: Record<string, string> = {
  'seniorsimple': '#5A7186',
  'mortgagesimple': '#2E5EAA',
  'lendingsimple': '#0F7B6C',
  'rateroots': '#249C77',
  'creditrepairsimple': '#8841D1',
  'parentsimple': '#375172',
  'smallbizsimple': '#3A7A4C',
  'scalingsimple': '#444F88',
};

// Domain Mapping
const BRAND_DOMAINS: Record<string, string> = {
  'seniorsimple': 'SeniorSimple.com',
  'mortgagesimple': 'MortgageSimple.com',
  'lendingsimple': 'LendingSimple.com',
  'rateroots': 'RateRoots.com',
  'creditrepairsimple': 'CreditRepairSimple.com',
  'parentsimple': 'ParentSimple.com',
  'smallbizsimple': 'SmallBizSimple.com',
  'scalingsimple': 'ScalingSimple.com',
};

// Logo URL Mapping (to be configured in Supabase Storage or environment)
const BRAND_LOGO_URLS: Record<string, string> = {
  'seniorsimple': 'https://storage.googleapis.com/simple-media-network/logos/seniorsimple-logo.png',
  'mortgagesimple': 'https://storage.googleapis.com/simple-media-network/logos/mortgagesimple-logo.png',
  'lendingsimple': 'https://storage.googleapis.com/simple-media-network/logos/lendingsimple-logo.png',
  'rateroots': 'https://storage.googleapis.com/simple-media-network/logos/rateroots-logo.png',
  'creditrepairsimple': 'https://storage.googleapis.com/simple-media-network/logos/creditrepairsimple-logo.png',
  'parentsimple': 'https://storage.googleapis.com/simple-media-network/logos/parentsimple-logo.png',
  'smallbizsimple': 'https://storage.googleapis.com/simple-media-network/logos/smallbizsimple-logo.png',
  'scalingsimple': 'https://storage.googleapis.com/simple-media-network/logos/scalingsimple-logo.png',
};

/**
 * Auto-select template based on article content
 */
function selectTemplate(content: string, title: string): 'story-spark' | 'steps-mistakes' | 'concept-20s' | 'long-form' {
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  // Check for step-by-step content
  if (lowerContent.includes('step') || lowerContent.includes('how to') || 
      lowerTitle.includes('step') || lowerTitle.includes('how to')) {
    return 'steps-mistakes';
  }
  
  // Check for concept/definition content
  if (lowerContent.includes('what is') || lowerContent.includes('definition') ||
      lowerTitle.includes('what is') || lowerTitle.includes('definition')) {
    return 'concept-20s';
  }
  
  // Default to story spark for engaging content
  return 'story-spark';
}

/**
 * Extract content sections for video
 */
function extractContentSections(
  content: string,
  title: string,
  speakableSummary: string | null,
  templateType: string
): any {
  const sections: any = {};
  
  if (templateType === 'story-spark') {
    // Story Spark: hook_text, concept_text, broll_label_1
    const hook = speakableSummary || title || content.substring(0, 100);
    const concept = content.split('\n\n')[0] || content.substring(0, 200);
    
    sections.hook_text = hook.substring(0, 150);
    sections.concept_text = concept.substring(0, 300);
    sections.broll_label_1 = title.substring(0, 50);
    
  } else if (templateType === 'steps-mistakes') {
    // Steps & Mistakes: title_text, step_1_text, step_2_text, step_3_text
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    sections.title_text = title.substring(0, 100);
    sections.step_1_text = paragraphs[0]?.substring(0, 150) || content.substring(0, 150);
    sections.step_2_text = paragraphs[1]?.substring(0, 150) || paragraphs[0]?.substring(150, 300) || '';
    sections.step_3_text = paragraphs[2]?.substring(0, 150) || paragraphs[0]?.substring(300, 450) || '';
    
  } else if (templateType === 'concept-20s') {
    // Concept in 20s: concept_title, concept_detail
    sections.concept_title = title.substring(0, 80);
    sections.concept_detail = speakableSummary || content.split('\n\n')[0] || content.substring(0, 200);
    sections.concept_detail = sections.concept_detail.substring(0, 250);
    
  } else if (templateType === 'long-form') {
    // Long Form: cold_open_text, act_1_text, act_2_text, act_3_text
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    sections.cold_open_text = speakableSummary || title || paragraphs[0]?.substring(0, 200) || '';
    sections.act_1_text = paragraphs[0]?.substring(0, 300) || content.substring(0, 300);
    sections.act_2_text = paragraphs[1]?.substring(0, 300) || paragraphs[0]?.substring(300, 600) || '';
    sections.act_3_text = paragraphs[2]?.substring(0, 300) || paragraphs[0]?.substring(600, 900) || '';
  }
  
  return sections;
}

/**
 * Build modifications payload for Creatomate
 */
function buildModifications(
  templateType: string,
  siteId: string,
  contentSections: any,
  featuredImageUrl: string | null,
  presenterClipUrl?: string,
  brollClips?: string[],
  audioUrls?: string[]
): any {
  const brandColor = BRAND_COLORS[siteId] || '#5A7186';
  const domain = BRAND_DOMAINS[siteId] || 'SimpleMediaNetwork.com';
  const logoUrl = BRAND_LOGO_URLS[siteId] || '';
  
  const modifications: any = {
    brand_color: brandColor,
    domain: domain,
  };
  
  // Add logo overlay
  if (logoUrl) {
    modifications.logoOverlay = {
      source: logoUrl,
      x: 80,
      y: 80,
      width: 240,
      height: 'auto',
      fit: 'contain'
    };
  }
  
  // Template-specific modifications
  if (templateType === 'story-spark') {
    modifications.hook_text = contentSections.hook_text || '';
    modifications.concept_text = contentSections.concept_text || '';
    modifications.broll_label_1 = contentSections.broll_label_1 || '';
    modifications.broll_clip_1 = brollClips?.[0] || featuredImageUrl || '';
    modifications.presenter_clip_url = presenterClipUrl || '';
    
  } else if (templateType === 'steps-mistakes') {
    modifications.title_text = contentSections.title_text || '';
    modifications.step_1_text = contentSections.step_1_text || '';
    modifications.step_2_text = contentSections.step_2_text || '';
    modifications.step_3_text = contentSections.step_3_text || '';
    modifications.step_1_clip = brollClips?.[0] || featuredImageUrl || '';
    modifications.step_2_clip = brollClips?.[1] || featuredImageUrl || '';
    modifications.step_3_clip = brollClips?.[2] || featuredImageUrl || '';
    
  } else if (templateType === 'concept-20s') {
    modifications.concept_title = contentSections.concept_title || '';
    modifications.concept_detail = contentSections.concept_detail || '';
    modifications.broll_clip = brollClips?.[0] || featuredImageUrl || '';
    modifications.presenter_clip = presenterClipUrl || '';
    
  } else if (templateType === 'long-form') {
    modifications.cold_open_broll = brollClips?.[0] || featuredImageUrl || '';
    modifications.cold_open_text = contentSections.cold_open_text || '';
    modifications.host_intro_clip = presenterClipUrl || '';
    modifications.act_1_broll = brollClips?.[1] || featuredImageUrl || '';
    modifications.act_1_text = contentSections.act_1_text || '';
    modifications.act_2_broll = brollClips?.[2] || featuredImageUrl || '';
    modifications.act_2_text = contentSections.act_2_text || '';
    modifications.act_3_broll = brollClips?.[3] || featuredImageUrl || '';
    modifications.act_3_text = contentSections.act_3_text || '';
    
    // Add audio URLs if provided
    if (audioUrls && audioUrls.length > 0) {
      modifications.act_1_audio = audioUrls[0] || '';
      modifications.act_2_audio = audioUrls[1] || '';
      modifications.act_3_audio = audioUrls[2] || '';
    }
  }
  
  return modifications;
}

/**
 * Validate modifications payload
 */
function validateModifications(templateType: string, modifications: any): { valid: boolean; error?: string } {
  const requiredFields: Record<string, string[]> = {
    'story-spark': ['hook_text', 'concept_text', 'broll_label_1', 'broll_clip_1', 'presenter_clip_url', 'brand_color', 'domain'],
    'steps-mistakes': ['title_text', 'step_1_text', 'step_2_text', 'step_3_text', 'step_1_clip', 'step_2_clip', 'step_3_clip', 'brand_color', 'domain'],
    'concept-20s': ['concept_title', 'concept_detail', 'broll_clip', 'presenter_clip', 'brand_color', 'domain'],
    'long-form': ['cold_open_broll', 'cold_open_text', 'host_intro_clip', 'act_1_broll', 'act_1_text', 'act_2_broll', 'act_2_text', 'act_3_broll', 'act_3_text', 'brand_color', 'domain'],
  };
  
  const required = requiredFields[templateType] || [];
  
  for (const field of required) {
    const value = modifications[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, error: `Missing or empty required field: ${field}` };
    }
    
    // Validate URLs
    if (field.includes('clip') || field.includes('broll') || field.includes('audio')) {
      if (typeof value === 'string' && value && !value.match(/^https?:\/\//) && !value.match(/\.(mp4|jpg|jpeg|png|webp)$/i)) {
        return { valid: false, error: `Invalid URL format for field: ${field}` };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Call Creatomate API to render video
 */
async function renderCreatomateVideo(
  apiKey: string,
  templateId: string,
  modifications: any
): Promise<{ render_id?: string; error?: string }> {
  try {
    const payload = {
      template_id: templateId,
      modifications: modifications
    };
    
    const response = await fetch('https://api.creatomate.com/v2/renders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (response.status === 200 || response.status === 202) {
      const result = await response.json();
      if (Array.isArray(result) && result.length > 0) {
        return { render_id: result[0].id };
      } else if (result.id) {
        return { render_id: result.id };
      } else {
        return { error: 'Unexpected response format from Creatomate' };
      }
    } else {
      const errorText = await response.text();
      return { error: `Creatomate API error: ${response.status} - ${errorText}` };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check render status and wait for completion
 */
async function waitForRenderCompletion(
  apiKey: string,
  renderId: string,
  timeout: number = 300
): Promise<{ video_url?: string; error?: string }> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout * 1000) {
    try {
      const response = await fetch(`https://api.creatomate.com/v2/renders/${renderId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      
      if (response.ok) {
        const status = await response.json();
        
        if (status.status === 'succeeded') {
          return { video_url: status.url };
        } else if (status.status === 'failed') {
          return { error: status.error || 'Render failed' };
        }
        // Still processing, wait and retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        return { error: `Failed to check render status: ${response.status}` };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  return { error: 'Render timeout' };
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
    const body: CreatomateVideoRequest = await req.json();
    
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

    // Fetch article data
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title, content, excerpt, speakable_summary, aeo_summary, featured_image_url, site_id')
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

    // Auto-select template if not specified
    const templateType = body.template_type || selectTemplate(
      article.content || article.excerpt || '',
      article.title || ''
    );

    const templateId = TEMPLATES[templateType];
    if (!templateId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid template type: ${templateType}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎬 Generating ${templateType} video for article ${body.article_id}`);

    // Determine script type based on template
    const scriptType = templateType === 'long-form' ? 'long-form' : 'short-form';

    // Call script-generator function to get structured script
    let scriptData: any = null;
    try {
      console.log(`📝 Generating structured script via script-generator...`);
      const scriptResponse = await fetch(
        `${supabaseUrl}/functions/v1/script-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            article_id: body.article_id,
            script_type: scriptType
          })
        }
      );

      if (scriptResponse.ok) {
        const scriptResult = await scriptResponse.json();
        if (scriptResult.success && scriptResult.script) {
          scriptData = scriptResult;
          console.log(`✅ Script generated successfully`);
        } else {
          console.warn('Script generator returned unsuccessful result, falling back to direct extraction');
        }
      } else {
        console.warn('Script generator failed, falling back to direct extraction');
      }
    } catch (error) {
      console.warn('Error calling script-generator, falling back to direct extraction:', error);
    }

    // Extract content sections (use script data if available, otherwise fall back to direct extraction)
    let contentSections: any;
    if (scriptData && scriptData.script) {
      // Map script generator output to Creatomate template fields
      if (templateType === 'story-spark') {
        contentSections = {
          hook_text: scriptData.script.hook || '',
          concept_text: scriptData.script.beats?.join(' ') || scriptData.script.context || '',
          broll_label_1: scriptData.overlay_text || article.title?.substring(0, 50) || ''
        };
      } else if (templateType === 'steps-mistakes') {
        contentSections = {
          title_text: scriptData.script.hook || article.title?.substring(0, 100) || '',
          step_1_text: scriptData.script.beats?.[0] || '',
          step_2_text: scriptData.script.beats?.[1] || '',
          step_3_text: scriptData.script.beats?.[2] || ''
        };
      } else if (templateType === 'concept-20s') {
        contentSections = {
          concept_title: scriptData.overlay_text || scriptData.script.hook || article.title?.substring(0, 80) || '',
          concept_detail: scriptData.script.beats?.join(' ') || scriptData.script.context || ''
        };
      } else if (templateType === 'long-form') {
        contentSections = {
          cold_open_text: scriptData.script.hook || '',
          act_1_text: scriptData.script.sections?.[0]?.content || scriptData.script.setup || '',
          act_2_text: scriptData.script.sections?.[1]?.content || scriptData.script.story || '',
          act_3_text: scriptData.script.sections?.[2]?.content || scriptData.script.tips?.join(' ') || ''
        };
      }
    } else {
      // Fall back to direct extraction
      contentSections = extractContentSections(
        article.content || article.excerpt || '',
        article.title || '',
        article.speakable_summary,
        templateType
      );
    }

    // Generate audio for long-form if needed
    let audioUrls: string[] | undefined;
    if (templateType === 'long-form' && body.use_voice !== false) {
      console.log('🎤 Generating audio via ElevenLabs...');
      
      const sections = (article.content || '').split('\n\n').filter(p => p.trim().length > 0).slice(0, 3);
      audioUrls = [];
      
      for (const section of sections) {
        if (section.trim().length > 0) {
          try {
            const audioResponse = await fetch(
              `${supabaseUrl}/functions/v1/elevenlabs-audio-generator`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  text: section.substring(0, 5000),
                  article_id: body.article_id
                })
              }
            );
            
            if (audioResponse.ok) {
              const audioResult = await audioResponse.json();
              if (audioResult.success && audioResult.audio_url) {
                audioUrls.push(audioResult.audio_url);
              }
            }
          } catch (error) {
            console.error('Error generating audio for section:', error);
          }
        }
      }
    }

    // Build modifications
    const siteId = (article.site_id || 'seniorsimple').toLowerCase();
    const modifications = buildModifications(
      templateType,
      siteId,
      contentSections,
      article.featured_image_url,
      undefined, // presenterClipUrl - to be added later
      undefined, // brollClips - to be added later
      audioUrls
    );

    // Validate modifications
    const validation = validateModifications(templateType, modifications);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error || 'Invalid modifications payload'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get Creatomate API key
    const creatomateApiKey = Deno.env.get('CREATOMATE_API_KEY');
    if (!creatomateApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CREATOMATE_API_KEY not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📤 Sending render request to Creatomate (template: ${templateType})...`);

    // Render video
    const renderResult = await renderCreatomateVideo(creatomateApiKey, templateId, modifications);
    
    if (renderResult.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: renderResult.error
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!renderResult.render_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to get render ID from Creatomate'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`⏳ Waiting for render completion: ${renderResult.render_id}`);

    // Wait for render to complete
    const completionResult = await waitForRenderCompletion(
      creatomateApiKey,
      renderResult.render_id,
      300
    );

    if (completionResult.error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: completionResult.error,
          render_id: renderResult.render_id
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Video generated: ${completionResult.video_url}`);

    return new Response(
      JSON.stringify({
        success: true,
        video_url: completionResult.video_url,
        render_id: renderResult.render_id,
        provider: 'creatomate',
        template_id: templateId,
        template_type: templateType
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Creatomate Video Generator Error:', error);
    
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
