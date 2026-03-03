/**
 * Supabase Edge Function: Agentic Content Generation (AEO-Enhanced)
 * 
 * Complete workflow for generating articles with all assets:
 * 1. Generates content using AI (OpenAI GPT-4)
 * 2. Creates article in database
 * 3. Applies AEO processing and optimization
 * 4. Generates featured image (optional)
 * 5. Gets link suggestions and inserts them (optional)
 * 6. Converts markdown to HTML
 * 7. Publishes article (optional)
 * 8. Generates social media posts (optional)
 * 9. Shares to social platforms (optional, requires APIs)
 * 
 * Request Body:
 * {
 *   topic: string (required)
 *   title?: string
 *   source_url?: string
 *   site_id?: string
 *   target_audience?: string
 *   content_type?: string
 *   content_length?: number
 *   tone?: string
 *   seo_optimized?: boolean
 *   model?: 'gpt4' | 'claude'
 *   workflowType?: 'article' | 'guide' | 'post'
 *   businessContext?: string
 *   goals?: string
 *   // NEW AEO Parameters:
 *   aeo_optimized?: boolean (default: true)
 *   aeo_content_type?: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula'
 *   generate_schema?: boolean (default: true)
 *   answer_first?: boolean (default: true)
 *   // Workflow options:
 *   generate_image?: boolean (default: true)
 *   generate_links?: boolean (default: true)
 *   convert_to_html?: boolean (default: true)
 *   auto_publish?: boolean (default: false) - Publish article immediately
 *   generate_social_posts?: boolean (default: true) - Generate social media posts
 *   share_to_social?: boolean (default: false) - Actually post to platforms (requires APIs)
 *   social_platforms?: string[] (default: ['facebook', 'twitter', 'linkedin']) - Platforms to target
 * }
 * 
 * Response:
 * {
 *   article_id: string
 *   title: string
 *   content: string
 *   html_body?: string
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

interface AgenticContentGenRequest {
  topic: string;
  title?: string;
  source_url?: string;
  site_id?: string;
  target_audience?: string;
  content_type?: string;
  content_length?: number;
  tone?: string;
  seo_optimized?: boolean;
  model?: 'gpt4' | 'claude';
  workflowType?: string;
  businessContext?: string;
  goals?: string;
  // AEO Parameters
  aeo_optimized?: boolean;
  aeo_content_type?: 'definition' | 'how-to' | 'comparison' | 'data' | 'formula' | 'article';
  generate_schema?: boolean;
  answer_first?: boolean;
  // AEO Question Optimization
  question?: string; // Target question to answer
  use_question_analysis?: boolean; // Analyze question intent and generate templates
  optimize_for_questions?: boolean; // Optimize content for multiple questions
  // Enhanced Generation Options
  use_deepseek?: boolean; // Use DeepSeek instead of OpenAI (default: true for better editorial quality)
  enable_checkpoints?: boolean; // Enable checkpoint system for long content (default: true)
  resume_article_id?: string; // Resume generation from checkpoint
  editorial_quality?: 'standard' | 'premium'; // Editorial quality level (default: 'premium')
  // Local Page Parameters (HomeSimple local SEO)
  page_type?: 'article' | 'local_page';
  city?: string;
  state?: string;
  vertical?: string; // hvac, plumbing, pest, roof, windows, etc
  service_areas?: string[];
  local_facts?: {
    neighborhoods?: string[];
    climate_notes?: string;
    common_issues?: string[];
    regulations?: string;
  };
  phone_number?: string;
  call_routing_configured?: boolean;
  // Comparison Content Parameters (when content_type === 'comparison')
  preferred_service?: string; // Service/client to highlight as best (e.g., "Empowerly")
  preferred_service_description?: string; // Key differentiators and strengths
  alternatives?: string[]; // List of competing services to compare
  comparison_criteria?: string[]; // What to compare (defaults provided from site config)
  editorial_tone?: 'authoritative' | 'balanced' | 'enthusiastic'; // Editorial positioning tone
  conclusion_style?: 'editorial' | 'data-driven' | 'testimonial'; // How to conclude
  // Listicle Parameters (when content_type === 'listicle')
  listicle_item_count?: number; // Number of items in the list (e.g., 12)
  listicle_subtitle?: string; // Subtitle/value proposition (e.g., "Why the 'Old Rules' no longer work...")
  listicle_intro_context?: string; // Introduction context/problem setup
  listicle_sections?: Array<{ // Optional: Pre-defined sections (PART I, PART II, etc.)
    title: string;
    item_indices: number[]; // Which items belong to this section (1-indexed)
  }>;
  listicle_offers?: Array<{ // Affiliate/offer links for each item
    item_number: number; // 1-indexed item number
    anchor_text: string; // CTA text (e.g., "Get Your Free Annuity Comparison →")
    url: string; // Affiliate/offer URL
    type?: 'affiliate' | 'owned_offer' | 'internal_link'; // Link type
  }>;
  generate_item_images?: boolean; // Generate images for each list item (default: false)
  listicle_conclusion_cta?: string; // Final CTA text for conclusion
  listicle_disclaimer?: string; // Custom disclaimer text
  // Workflow options
  generate_image?: boolean;
  generate_links?: boolean;
  convert_to_html?: boolean;
  auto_publish?: boolean; // Publish article immediately
  generate_social_posts?: boolean; // Generate social media posts
  share_to_social?: boolean; // Actually post to social platforms via GHL
  social_platforms?: string[]; // ['facebook', 'twitter', 'linkedin', 'instagram']
  profile_name?: string; // GHL profile name (if multiple profiles per site)
  schedule_hours?: number; // Hours to schedule ahead (default: 1)
}

interface ContentStructure {
  h1: string | null;
  h2: string[];
  h3: string[];
  lists: number;
  tables: number;
  dataPoints: string[];
}

// ========================================
// AEO HELPER FUNCTIONS
// ========================================

function detectAEOContentType(topic: string, title?: string): string {
  const text = (title || topic).toLowerCase();
  
  // Detect listicle format
  if (text.match(/^\d+\s+(best|top|ways|strategies|tips|methods|reasons|things)/i) ||
      text.includes('best ways') || text.includes('top ') && /\d+/.test(text)) {
    return 'listicle';
  }
  
  if (text.startsWith('what is') || text.startsWith('what are') || text.includes('definition')) {
    return 'definition';
  }
  if (text.startsWith('how to') || text.startsWith('how do')) {
    return 'how-to';
  }
  if (text.includes(' vs ') || text.includes(' versus ') || text.includes('comparison')) {
    return 'comparison';
  }
  if (text.includes('statistics') || text.includes('data') || text.includes('numbers')) {
    return 'data';
  }
  if (text.includes('formula') || text.includes('calculate') || text.includes('equation')) {
    return 'formula';
  }
  return 'article';
}

function validateAnswerFirst(content: string): { valid: boolean; summary: string; issues: string[] } {
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  const issues: string[] = [];
  
  const hasDirectAnswer = 
    /(is|are|means|refers to|defined as|consists of)/i.test(first100Words) ||
    /\d+/.test(first100Words) ||
    /(yes|no|true|false|correct|incorrect)/i.test(first100Words);
  
  const hasFluff = /^(in today|in this|welcome|introduction|overview)/i.test(first100Words);
  
  if (!hasDirectAnswer) {
    issues.push('Direct answer not found in first 100 words');
  }
  
  if (hasFluff) {
    issues.push('Content starts with fluff instead of direct answer');
  }
  
  const cleanSummary = first100Words
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  
  return {
    valid: hasDirectAnswer && !hasFluff,
    summary: cleanSummary,
    issues
  };
}

function extractContentStructure(content: string): ContentStructure {
  const lines = content.split('\n');
  const structure: ContentStructure = {
    h1: null,
    h2: [],
    h3: [],
    lists: 0,
    tables: 0,
    dataPoints: []
  };
  
  for (const line of lines) {
    if (line.match(/^#\s+/)) {
      structure.h1 = line.replace(/^#\s+/, '').trim();
    } else if (line.match(/^##\s+/)) {
      structure.h2.push(line.replace(/^##\s+/, '').trim());
    } else if (line.match(/^###\s+/)) {
      structure.h3.push(line.replace(/^###\s+/, '').trim());
    } else if (line.match(/^[\*\-\+]\s+|^\d+\.\s+/)) {
      structure.lists++;
    } else if (line.includes('|')) {
      structure.tables++;
    }
    
    const dataMatches = line.match(/\$[\d,]+|[\d,]+%|[\d,]+ (million|billion|thousand)/gi);
    if (dataMatches) {
      structure.dataPoints.push(...dataMatches);
    }
  }
  
  return structure;
}

function extractDataPoints(content: string): string[] {
  const dataPoints: string[] = [];
  const patterns = [
    /\$[\d,]+/g,
    /[\d,]+%/g,
    /[\d,]+ (million|billion|thousand|trillion)/gi,
    /\d+\.\d+%/g
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      dataPoints.push(...matches);
    }
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
  if (urlMatches) {
    citations.push(...urlMatches);
  }
  
  return [...new Set(citations)];
}

function generateSpeakableSummary(content: string, title: string): string {
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ');
  const cleanSummary = first100Words
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();
  
  if (cleanSummary.length <= 350) {
    return cleanSummary;
  }
  
  const truncated = cleanSummary.substring(0, 350);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Analyze question intent and generate templates
 */
async function analyzeQuestionIntent(
  queryOrTopic: string,
  vertical?: string,
  city?: string,
  state?: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<any> {
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/aeo-question-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        query: queryOrTopic,
        vertical,
        city,
        state,
        generate_related: true
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Question analysis failed:', error);
  }
  return null;
}

/**
 * Get optimal answer format for question
 */
async function getOptimalAnswerFormat(
  question: string,
  questionType?: string,
  intent?: string,
  vertical?: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<any> {
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/aeo-answer-format-optimizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        question,
        question_type: questionType,
        intent,
        vertical
      })
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Answer format optimization failed:', error);
  }
  return null;
}

/**
 * Get question templates for vertical/topic
 */
async function getQuestionTemplates(
  vertical?: string,
  topic?: string,
  city?: string,
  state?: string,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<any[]> {
  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/aeo-question-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        vertical,
        topic,
        city,
        state,
        generate_variations: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.templates || [];
    }
  } catch (error) {
    console.warn('Question template generation failed:', error);
  }
  return [];
}

function calculateAEOScore(params: {
  answerFirst: boolean;
  structure: ContentStructure;
  dataPoints: number;
  hasSchema: boolean;
}): number {
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

/**
 * Get site domain from database
 */
async function getSiteDomain(supabase: any, siteId?: string): Promise<string> {
  if (!siteId) return 'https://example.com';
  
  try {
    const { data: site, error } = await supabase
      .from('sites')
      .select('domain')
      .eq('id', siteId)
      .single();
    
    if (error) {
      console.warn(`⚠️  Could not fetch domain for site ${siteId}: ${error.message}`);
      return 'https://example.com';
    }
    
    if (site?.domain) {
      const domain = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
      return domain;
    }
  } catch (error) {
    console.warn(`⚠️  Error fetching site domain: ${error.message}`);
  }
  
  return 'https://example.com';
}

/**
 * Generate comprehensive SEO and social media metadata
 */
async function generateMetadata(params: {
  title: string;
  excerpt: string;
  slug: string;
  site_id?: string;
  focus_keyword?: string;
  featured_image_url?: string;
  supabase?: any;
}): Promise<{
  breadcrumb_title: string;
  canonical_url: string;
  focus_keyword: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
  twitter_title: string;
  twitter_description: string;
  twitter_image: string | null;
  featured_image_alt: string;
}> {
  // Generate breadcrumb title (shorter version, 40-60 chars)
  const breadcrumbTitle = params.title.length > 60 
    ? params.title.substring(0, 57) + '...'
    : params.title;

  // Generate canonical URL - fetch domain from sites table
  const siteDomain = params.supabase && params.site_id
    ? await getSiteDomain(params.supabase, params.site_id)
    : 'https://example.com';
  const canonicalUrl = `${siteDomain}/${params.slug}`;

  // Use provided focus keyword or extract from title
  const focusKeyword = params.focus_keyword || 
    params.title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .join(' ');

  // Generate OG metadata
  const ogTitle = params.title.length > 60
    ? params.title.substring(0, 57) + '...'
    : params.title;
  const ogDescription = params.excerpt.length > 200
    ? params.excerpt.substring(0, 197) + '...'
    : params.excerpt;
  const ogImage = params.featured_image_url || null;

  // Twitter metadata (can be same as OG or optimized)
  const twitterTitle = ogTitle;
  const twitterDescription = ogDescription;
  const twitterImage = ogImage;

  // Generate featured image alt text
  const featuredImageAlt = params.featured_image_url
    ? `${params.title} - Featured image`
    : '';

  return {
    breadcrumb_title: breadcrumbTitle,
    canonical_url: canonicalUrl,
    focus_keyword: focusKeyword,
    og_title: ogTitle,
    og_description: ogDescription,
    og_image: ogImage,
    twitter_title: twitterTitle,
    twitter_description: twitterDescription,
    twitter_image: twitterImage,
    featured_image_alt: featuredImageAlt
  };
}

async function generateSchema(params: {
  article: any;
  site_id?: string;
  content_type: string;
}): Promise<any> {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.article.title,
    description: params.article.excerpt || params.article.aeo_summary,
    datePublished: params.article.created_at || new Date().toISOString(),
    dateModified: params.article.updated_at || new Date().toISOString(),
  };
  
  if (params.content_type === 'how-to') {
    schema['@type'] = 'HowTo';
    schema.name = params.article.title;
  }
  
  if (params.site_id) {
    schema.publisher = {
      '@type': 'Organization',
      name: params.site_id,
    };
  }
  
  return schema;
}

// ========================================
// CONTENT GENERATION FUNCTION
// ========================================

/**
 * Get Content Agent configuration for a site
 */
async function getContentAgentConfig(
  supabase: any,
  siteId: string
): Promise<any> {
  const { data: site } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .single();
  
  if (!site) {
    return null;
  }
  
  return site.config?.content_agent || null;
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
 * Fetch local facts for a city/state/vertical combination
 */
async function fetchLocalFacts(
  supabase: any,
  city: string,
  state: string,
  vertical: string
): Promise<{
  neighborhoods?: string[];
  climate_notes?: string;
  common_issues?: string[];
  regulations?: string;
}> {
  try {
    const { data: facts, error } = await supabase
      .from('local_facts')
      .select('fact_type, content')
      .eq('city', city)
      .eq('state', state)
      .eq('vertical', vertical)
      .eq('verified', true);
    
    if (error) {
      console.warn('Error fetching local facts:', error);
      return {};
    }
    
    if (!facts || facts.length === 0) {
      return {};
    }
    
    const result: any = {};
    
    for (const fact of facts) {
      switch (fact.fact_type) {
        case 'neighborhood':
          if (!result.neighborhoods) result.neighborhoods = [];
          result.neighborhoods.push(fact.content);
          break;
        case 'climate':
          result.climate_notes = fact.content;
          break;
        case 'common_issue':
          if (!result.common_issues) result.common_issues = [];
          result.common_issues.push(fact.content);
          break;
        case 'regulation':
          result.regulations = fact.content;
          break;
      }
    }
    
    return result;
  } catch (error) {
    console.warn('Error processing local facts:', error);
    return {};
  }
}

/**
 * Extract voice reference samples from existing content
 */
function extractVoiceReference(
  content: string,
  numSamples: number = 3
): string {
  if (!content || content.length < 500) {
    return '';
  }

  // Split content into paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 100);
  
  if (paragraphs.length === 0) {
    return '';
  }

  // Select diverse samples
  const samples: string[] = [];
  const step = Math.max(1, Math.floor(paragraphs.length / numSamples));

  for (let i = 0; i < paragraphs.length && samples.length < numSamples; i += step) {
    const para = paragraphs[i];
    if (para && para.length > 200) {
      // Take first 600 words as voice sample
      const words = para.split(/\s+/);
      const sample = words.slice(0, 600).join(' ');
      if (sample.length > 200) {
        samples.push(sample);
      }
    }
  }

  return samples.join('\n\n---\n\n');
}

/**
 * Build persona-enhanced system prompt
 */
function buildPersonaSystemPrompt(
  basePrompt: string,
  personaProfile: any,
  voiceReference?: string
): string {
  if (!personaProfile && !voiceReference) {
    return basePrompt;
  }

  let personaSection = '';

  if (personaProfile) {
    personaSection += `
## PERSONA VOICE
You are writing as ${personaProfile.name || 'the brand expert'}.
Writing Style: ${personaProfile.voice?.writing_style || 'Clear, conversational'}
Tone: ${personaProfile.voice?.tone || 'Warm but authoritative'}
Worldview: ${personaProfile.voice?.worldview || 'Educational and empowering'}
Philosophy: ${personaProfile.voice?.philosophy || 'Education empowers people'}

${personaProfile.voice?.speech_patterns ? `Speech Patterns: ${personaProfile.voice.speech_patterns}` : ''}
${personaProfile.background ? `Background: ${personaProfile.background}` : ''}
${personaProfile.expertise ? `Expertise: ${personaProfile.expertise.join(', ')}` : ''}

When writing, channel this persona's voice, expertise, and communication style.`;
  }

  if (voiceReference) {
    personaSection += `

## VOICE REFERENCE (Match This Style Exactly):
${voiceReference.substring(0, 2000)}${voiceReference.length > 2000 ? '...' : ''}

Your writing style MUST match the tone, pacing, and voice shown in the VOICE REFERENCE above.`;
  }

  return basePrompt + personaSection;
}

/**
 * Build comprehensive system prompt combining Content Agent rules + Persona + AEO
 */
function buildContentAgentSystemPrompt(
  contentAgentConfig: any,
  personaProfile: any,
  aeoContentType: string,
  contentType: string,
  isLocalPage?: boolean
): string {
  let prompt = `You are the Simple Media Network Content Agent, an expert content writer specializing in ${contentType || 'articles'}.`;

  // Add Content Agent vertical context
  if (contentAgentConfig) {
    const verticalTheme = contentAgentConfig.vertical_theme || 'Financial education';
    const toneGuidelines = contentAgentConfig.tone_guidelines || 'Educational storytelling, clear, friendly, expert tone';
    
    prompt += `\n\n## VERTICAL CONTEXT
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

    // Add safety rules
    if (contentAgentConfig.safety_rules && contentAgentConfig.safety_rules.length > 0) {
      prompt += `\n\n## CONTENT SAFETY RULES (NON-NEGOTIABLE)
You must NOT:
${contentAgentConfig.safety_rules.map((rule: string) => `- ${rule}`).join('\n')}

All content MUST be:
- Informational
- Educational
- Non-prescriptive`;
    }

    // Add storytelling guidelines
    if (contentAgentConfig.storytelling_guidelines) {
      const guidelines = contentAgentConfig.storytelling_guidelines;
      prompt += `\n\n## STORYTELLING GUIDELINES
Use: ${(guidelines.use || []).join(', ')}
Avoid: ${(guidelines.avoid || []).join(', ')}`;
    }
  }

  // Add Persona voice
  if (personaProfile) {
    prompt += `\n\n## PERSONA VOICE
You are writing as ${personaProfile.name || 'the brand expert'}.
Writing Style: ${personaProfile.voice?.writing_style || 'Clear, conversational'}
Tone: ${personaProfile.voice?.tone || 'Warm but authoritative'}
Worldview: ${personaProfile.voice?.worldview || 'Educational and empowering'}
Philosophy: ${personaProfile.voice?.philosophy || 'Education empowers people'}`;
  }

  // Add AEO requirements
  prompt += `\n\n## AEO (ANSWER ENGINE OPTIMIZATION) REQUIREMENTS`;

  if (aeoContentType === 'listicle') {
    prompt += `
Write a premium listicle article optimized for Answer Engine Optimization. Start with a direct answer in the first 100 words explaining what strategies/methods will be covered and why they matter. Each numbered item should answer a specific question or solve a specific problem. Use clear headings, narrative paragraphs, and real examples.`;
  } else if (aeoContentType === 'how-to') {
    prompt += `
Write a comprehensive how-to guide. Start with a direct answer in the first 100 words explaining what the reader will learn and why it matters. Use clear headings (H1, H2, H3), numbered steps, and actionable advice.`;
  } else if (aeoContentType === 'definition') {
    prompt += `
Write a definition article. Start with a direct answer in the first 100 words that clearly defines the topic. Use clear headings, bullet points, and examples.`;
  } else {
    prompt += `
Write an informative article. Start with a direct answer in the first 100 words. Use clear headings (H1, H2, H3), bullet points, and data points where relevant.`;
  }

  prompt += `\n\nCRITICAL: The first 100 words must contain the direct answer to the question/topic. Do not start with fluff or introductions.`;

  // Add local page specific instructions
  if (isLocalPage) {
    prompt += `\n\n## LOCAL PAGE REQUIREMENTS
- This is a local SEO page for a specific city/vertical combination
- Must be unique and not a doorway page (avoid generic templates)
- Include city-specific information naturally
- Add service area information without keyword stuffing
- Include "What happens when you call" section explaining the call process
- Create click-to-call optimized CTAs
- Include local trust cues (neighborhoods, climate considerations, city-specific issues)
- Make content valuable and unique to this location
- Answer-first format: Direct answer about the problem in the specific city in first 100 words`;
  }

  return prompt;
}

async function generateAIContent(params: {
  topic: string;
  title?: string;
  target_audience?: string;
  content_type?: string;
  content_length?: number;
  tone?: string;
  source_url?: string;
  businessContext?: string;
  goals?: string;
  aeo_content_type?: string;
  site_id?: string;
  supabase?: any;
  // Local page parameters
  page_type?: 'article' | 'local_page';
  city?: string;
  state?: string;
  vertical?: string;
  service_areas?: string[];
  local_facts?: {
    neighborhoods?: string[];
    climate_notes?: string;
    common_issues?: string[];
    regulations?: string;
  };
  phone_number?: string;
  call_routing_configured?: boolean;
  // Listicle parameters
  listicle_item_count?: number;
  listicle_subtitle?: string;
  listicle_intro_context?: string;
  listicle_sections?: Array<{ title: string; item_indices: number[] }>;
  listicle_offers?: Array<{ item_number: number; anchor_text: string; url: string; type?: string }>;
  generate_item_images?: boolean;
  listicle_conclusion_cta?: string;
  listicle_disclaimer?: string;
  // Enhanced generation options
  use_deepseek?: boolean;
  editorial_quality?: 'standard' | 'premium';
  question?: string;
  question_analysis?: any;
  answer_format?: any;
  question_templates?: any[];
  vertical?: string;
}): Promise<{ content: string; title: string; excerpt: string }> {
  // Support both DeepSeek and OpenAI (prefer DeepSeek for editorial quality)
  const useDeepSeek = params.use_deepseek !== false; // Default to true
  const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
  const openaiApiKey = Deno.env.get('OPEN_AI_PUBLISHARE_KEY') || 
                       Deno.env.get('OPENAI_API_KEY');
  
  if (useDeepSeek && !deepseekApiKey) {
    console.warn('⚠️  DeepSeek API key not found, falling back to OpenAI');
  }
  
  if (!useDeepSeek && !openaiApiKey) {
    throw new Error('OpenAI API key not configured (OPEN_AI_PUBLISHARE_KEY)');
  }
  
  if (useDeepSeek && !deepseekApiKey && !openaiApiKey) {
    throw new Error('Neither DeepSeek nor OpenAI API key configured');
  }

  // Build AEO-optimized prompt
  const title = params.title || params.topic;
  const aeoType = params.aeo_content_type || detectAEOContentType(params.topic, title);
  
  // AEO Question Optimization: Analyze question if provided
  let questionAnalysis = params.question_analysis;
  let answerFormat = params.answer_format;
  let questionTemplates = params.question_templates || [];
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://vpysqshhafthuxvokwqj.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (params.question && !questionAnalysis && supabaseKey) {
    console.log('🔍 Analyzing question intent...');
    questionAnalysis = await analyzeQuestionIntent(
      params.question,
      params.vertical,
      params.city,
      params.state,
      supabaseUrl,
      supabaseKey
    );
    
    if (questionAnalysis?.question_type && questionAnalysis?.intent) {
      answerFormat = await getOptimalAnswerFormat(
        params.question,
        questionAnalysis.question_type,
        questionAnalysis.intent,
        params.vertical,
        supabaseUrl,
        supabaseKey
      );
    }
  }
  
  // Get question templates if not provided
  if (questionTemplates.length === 0 && supabaseKey) {
    questionTemplates = await getQuestionTemplates(
      params.vertical,
      params.topic,
      params.city,
      params.state,
      supabaseUrl,
      supabaseKey
    );
  }
  
  // Fetch Content Agent config and persona profile if site_id provided
  let contentAgentConfig = null;
  let personaProfile = null;
  
  if (params.site_id && params.supabase) {
    try {
      contentAgentConfig = await getContentAgentConfig(params.supabase, params.site_id);
      personaProfile = await getPersonaProfile(params.supabase, params.site_id);
    } catch (error) {
      console.warn('Failed to fetch Content Agent config or persona profile:', error);
    }
  }
  
  // Fetch local facts if this is a local page
  let localFacts = params.local_facts || {};
  if (params.page_type === 'local_page' && params.city && params.state && params.vertical && params.supabase) {
    try {
      const fetchedFacts = await fetchLocalFacts(params.supabase, params.city, params.state, params.vertical);
      localFacts = { ...localFacts, ...fetchedFacts };
    } catch (error) {
      console.warn('Failed to fetch local facts:', error);
    }
  }
  
  // Extract voice reference from existing articles if available (for editorial consistency)
  let voiceReference: string | undefined;
  if (params.site_id && params.supabase && params.editorial_quality === 'premium') {
    try {
      const { data: existingArticles } = await params.supabase
        .from('articles')
        .select('content')
        .eq('site_id', params.site_id)
        .eq('status', 'published')
        .not('content', 'is', null)
        .order('published_at', { ascending: false })
        .limit(3);
      
      if (existingArticles && existingArticles.length > 0) {
        const bestContent = existingArticles
          .map(a => a.content)
          .filter(c => c && c.length > 500)
          .join('\n\n');
        
        if (bestContent) {
          voiceReference = extractVoiceReference(bestContent, 3);
          console.log('✅ Extracted voice reference from existing content');
        }
      }
    } catch (error) {
      console.warn('Failed to extract voice reference:', error);
    }
  }

  // Build comprehensive system prompt
  let systemPrompt = buildContentAgentSystemPrompt(
    contentAgentConfig,
    personaProfile,
    aeoType,
    params.content_type || 'articles',
    params.page_type === 'local_page' // Pass local page flag
  );
  
  // Enhance with persona and voice reference (like book writer)
  systemPrompt = buildPersonaSystemPrompt(systemPrompt, personaProfile, voiceReference);
  
  const isLocalPage = params.page_type === 'local_page';
  const pageTypeLabel = isLocalPage ? 'local SEO page' : 'article';
  
  const userPrompt = `Write a ${params.content_length || 2000}-word ${pageTypeLabel} about: "${params.topic}"\n\n`;
  
  let fullPrompt = userPrompt;
  
  // Add local page context
  if (isLocalPage) {
    fullPrompt += `LOCAL PAGE CONTEXT:\n`;
    if (params.city && params.state) {
      fullPrompt += `- Location: ${params.city}, ${params.state}\n`;
    }
    if (params.vertical) {
      fullPrompt += `- Service Vertical: ${params.vertical}\n`;
    }
    if (params.service_areas && params.service_areas.length > 0) {
      fullPrompt += `- Service Areas: ${params.service_areas.join(', ')}\n`;
    }
    if (localFacts.neighborhoods && localFacts.neighborhoods.length > 0) {
      fullPrompt += `- Neighborhoods Served: ${localFacts.neighborhoods.join(', ')}\n`;
    }
    if (localFacts.climate_notes) {
      fullPrompt += `- Climate Notes: ${localFacts.climate_notes}\n`;
    }
    if (localFacts.common_issues && localFacts.common_issues.length > 0) {
      fullPrompt += `- Common Issues in This Area: ${localFacts.common_issues.join(', ')}\n`;
    }
    if (localFacts.regulations) {
      fullPrompt += `- Local Regulations: ${localFacts.regulations}\n`;
    }
    if (params.phone_number) {
      fullPrompt += `- Phone Number: ${params.phone_number}\n`;
    }
    fullPrompt += `\n`;
  }
  
  if (params.target_audience) {
    fullPrompt += `Target Audience: ${params.target_audience}\n\n`;
  }
  if (params.businessContext) {
    fullPrompt += `Business Context: ${params.businessContext}\n\n`;
  }
  if (params.goals) {
    fullPrompt += `Goals: ${params.goals}\n\n`;
  }
  if (params.source_url) {
    fullPrompt += `Reference this source for context: ${params.source_url}\n\n`;
  }
  
  // Add question-specific instructions if question analysis available
  if (params.question && questionAnalysis) {
    fullPrompt += `\n\nPRIMARY QUESTION TO ANSWER: "${params.question}"\n`;
    fullPrompt += `Question Type: ${questionAnalysis.question_type || 'what'}\n`;
    fullPrompt += `User Intent: ${questionAnalysis.intent || 'informational'}\n`;
    
    if (questionAnalysis.answer_requirements && questionAnalysis.answer_requirements.length > 0) {
      fullPrompt += `\nAnswer Requirements:\n${questionAnalysis.answer_requirements.map((r: string) => `- ${r}`).join('\n')}\n`;
    }
    
    if (answerFormat) {
      fullPrompt += `\nOptimal Answer Format: ${answerFormat.optimal_format}\n`;
      if (answerFormat.format_guidelines && answerFormat.format_guidelines.length > 0) {
        fullPrompt += `Format Guidelines:\n${answerFormat.format_guidelines.map((g: string) => `- ${g}`).join('\n')}\n`;
      }
      if (answerFormat.required_elements && answerFormat.required_elements.length > 0) {
        fullPrompt += `Required Elements:\n${answerFormat.required_elements.map((e: string) => `- ${e}`).join('\n')}\n`;
      }
    }
    
    if (questionAnalysis.related_questions && questionAnalysis.related_questions.length > 0) {
      fullPrompt += `\nRelated Questions to Address:\n${questionAnalysis.related_questions.slice(0, 5).map((q: string) => `- ${q}`).join('\n')}\n`;
    }
  }
  
  // Editorial Quality Standards (used for both listicle and regular content)
  const editorialQuality = params.editorial_quality || 'premium';
  const isPremium = editorialQuality === 'premium';
  
  // Listicle-specific prompt building
  const isListicle = params.content_type === 'listicle';
  if (isListicle) {
    const itemCount = params.listicle_item_count || 12;
    fullPrompt += `\n\n## LISTICLE FORMAT REQUIREMENTS

You are writing a premium listicle article with ${itemCount} numbered items. This is NOT a generic "top 10" list - it's a comprehensive, editorial-quality special report.

**STRUCTURE:**
1. **Header/Branding**: Start with "[SiteName] Special Report | [Series Name]" (if applicable)
2. **Title**: Use the provided title (should be "[Number] Best Ways to [Achieve Goal]")
3. **Subtitle**: ${params.listicle_subtitle || 'A compelling value proposition explaining why this matters'}
4. **Introduction**: ${params.listicle_intro_context || 'Set up the problem/context. Explain why the "old rules" no longer work and why this matters now.'}
5. **Sections** (if provided): Organize items into logical sections (e.g., "PART I: FINANCIAL & WEALTH STRATEGIES", "PART II: LIFESTYLE & TAX STRATEGIES")
6. **Numbered Items** (${itemCount} total): Each item MUST follow this exact structure:
   - **Item Number and Title** (e.g., "1. Fixed Index Annuities: The 'Income Floor' Strategy")
   - **"The Problem"** section: Clearly articulate the specific problem this strategy solves
   - **"The Solution"** section: Explain the strategy/solution in detail with context
   - **"How it works"** or **"Real Life Example"** section: Include a concrete example with a named person (e.g., "Meet Robert, 67...") or detailed explanation
   - **CTA Link Placeholder**: After each item, include: \`[CTA: ${params.listicle_offers?.find(o => o.item_number === 1)?.anchor_text || 'Get Your Free [Service] →'}]\`
7. **Conclusion**: ${params.listicle_conclusion_cta || 'Summarize key takeaways and include a final CTA'}
8. **Disclaimer**: ${params.listicle_disclaimer || 'Standard financial/legal disclaimer'}

**EACH ITEM REQUIREMENTS:**
- Each item should be 200-400 words
- Use narrative paragraphs, NOT bullet points
- Include specific data, statistics, or numbers
- Tell a story or provide a concrete example
- Make it actionable and valuable
- Write in editorial voice (like The Atlantic or Harvard Business Review)
- Use transitions and build arguments

**SECTION ORGANIZATION:**
${params.listicle_sections && params.listicle_sections.length > 0 
  ? params.listicle_sections.map(s => `- **${s.title}**: Items ${s.item_indices.join(', ')}`).join('\n')
  : 'Organize items into 2-3 logical sections with clear H2 headings (e.g., "PART I: [Theme]", "PART II: [Theme]")'}

**CTA PLACEMENT:**
After each numbered item, include a CTA link. Use this format:
\`[CTA: Anchor Text →]\`

The CTAs will be automatically replaced with the provided affiliate/offer links during post-processing.

**EDITORIAL QUALITY:**
- Write like a premium publication (The Atlantic, Harvard Business Review)
- Use narrative flow, not choppy lists
- Include real examples with named people
- Build arguments and provide context
- Avoid generic "top 10" style fluff
- Make each item valuable enough to stand alone`;
  } else {
    // Editorial Quality Standards (Premium) - isPremium already defined above
    if (isPremium) {
      fullPrompt += `\n\n## EDITORIAL QUALITY STANDARDS (PREMIUM)
Write content that represents the best content on the internet. This means:

**Narrative Flow & Depth:**
- Write in flowing paragraphs with narrative structure
- Use bullet points SPARINGLY - only for truly necessary lists (3-5 items max)
- Prefer embedded lists within paragraphs over standalone bullet sections
- Tell stories, use examples, and provide context
- Build arguments and explanations, don't just list facts

**Editorial Voice:**
- Write like a top-tier publication (think The Atlantic, Harvard Business Review, or top industry blogs)
- Use transitions between ideas ("However", "Moreover", "Consider this", "Here's the thing")
- Vary sentence length and structure for rhythm
- Include editorial insights and analysis, not just information
- Use specific examples and case studies

**Content Structure:**
- Lead with compelling narrative paragraphs
- Use H2 headings for major sections (not just topic labels - make them engaging)
- Use H3 headings for subsections within major ideas
- Embed data points naturally within narrative text
- Use blockquotes or callouts for key insights

**What to AVOID:**
- Long bullet point lists (more than 5 items)
- Over-reliance on numbered lists
- Choppy, list-heavy structure
- Generic "top 10" style content
- Information dumps without narrative flow

**What to INCLUDE:**
- Compelling opening that hooks the reader
- Narrative paragraphs that build understanding
- Embedded examples and stories
- Editorial analysis and insights
- Smooth transitions between ideas
- Thoughtful conclusions that tie everything together`;
    } else {
      fullPrompt += `\n\nRequirements:
- Use markdown format
- Include H1, H2, and H3 headings
- Use bullet points and numbered lists when appropriate
- Include specific data points, statistics, or numbers where relevant
- Write in a ${params.tone || 'professional'} tone
- Make it actionable and valuable for the target audience
- Follow "snackable depth": teach a concept, make it accessible, add one surprising insight, add one historical/legal/practical micro-fact, add one AEO-friendly punchline or analogy`;
    }
  }
  
  // Add local page specific requirements
  if (isLocalPage) {
    fullPrompt += `\n\nLOCAL PAGE SPECIFIC REQUIREMENTS:
- Include a clear "What happens when you call" section explaining the call process
- Add service area information naturally (not keyword-stuffed)
- Include local trust cues (neighborhoods, city-specific issues, climate considerations)
- Create click-to-call optimized CTAs (sticky mobile button placement)
- Include pricing expectations/ranges if applicable (with disclaimers)
- Add local emergency seasonality information if relevant
- Make content unique to this city/vertical combination (avoid generic templates)
- Include answer-first format: Direct answer in first 100 words about the problem in ${params.city || 'this city'}`;
  }

  // Use DeepSeek for better editorial quality (like book writer), fallback to OpenAI
  const useDeepSeekForThis = useDeepSeek && deepseekApiKey;
  const apiUrl = useDeepSeekForThis 
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const apiKey = useDeepSeekForThis ? deepseekApiKey : openaiApiKey;
  const model = useDeepSeekForThis ? 'deepseek-chat' : 'gpt-4-turbo-preview';
  const temperature = isPremium ? 0.8 : 0.7; // Higher temperature for more editorial/creative content
  
  console.log(`🤖 Using ${useDeepSeekForThis ? 'DeepSeek' : 'OpenAI'} for content generation (editorial quality: ${editorialQuality})`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ],
      temperature: temperature,
      max_tokens: params.content_length ? Math.min(Math.floor(params.content_length * 1.5), 6000) : 4000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const apiName = useDeepSeekForThis ? 'DeepSeek' : 'OpenAI';
    throw new Error(`${apiName} API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  // Extract title from content if not provided
  const extractedTitle = title || content.match(/^#\s+(.+)$/m)?.[1] || params.topic;
  
  // Generate excerpt (first 200 chars)
  const excerpt = content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*/g, '')
    .substring(0, 200)
    .trim() + '...';

  return {
    content,
    title: extractedTitle,
    excerpt
  };
}

// ========================================
// MAIN FUNCTION
// ========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       'https://vpysqshhafthuxvokwqj.supabase.co';
    // Get service role key - prioritize environment variable (for service role permissions)
    // then fallback to request headers (for function-to-function calls)
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const apikeyHeader = req.headers.get('apikey');
    const envServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Use service role key from env first (has proper permissions), then from request headers
    // For database operations, use env key (function secret format works)
    // For function-to-function calls, we need JWT format, so prefer bearerToken/apikeyHeader
    const supabaseKey = envServiceKey || 
                       bearerToken ||
                       apikeyHeader ||
                       Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    // For internal function calls, use JWT format if available, otherwise use env key
    // Function secrets (sb_secret_...) don't work for function-to-function calls
    const functionCallKey = bearerToken || apikeyHeader || envServiceKey || '';
    
    console.log(`🔑 Auth check: bearerToken=${!!bearerToken}, apikeyHeader=${!!apikeyHeader}, envKey=${!!envServiceKey}, keyLength=${supabaseKey.length}, keyStart=${supabaseKey.substring(0, 20)}...`);
    
    if (!supabaseKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase API key required. Set SUPABASE_SERVICE_ROLE_KEY in function secrets or pass via Authorization/apikey header.'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create Supabase client - use the key as-is (should be service role key from caller)
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log('✅ Supabase client created successfully');
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to create Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    const body: AgenticContentGenRequest = await req.json();
    
    if (!body.topic) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'topic is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🚀 Starting agentic content generation for: "${body.topic}"`);

    // Test Supabase connection with a simple query
    // Note: This test helps identify if the key has service role permissions
    try {
      console.log('🧪 Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('sites')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('❌ Supabase connection test failed:', {
          message: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        });
        
        // If it's an auth error, provide more helpful message
        if (testError.code === 'PGRST301' || testError.message?.includes('Invalid API key')) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Database connection failed: Invalid API key. The key passed in the request may not have service role permissions. Try setting SUPABASE_SERVICE_ROLE_KEY as a function secret in Supabase dashboard.`,
              debug_info: {
                key_source: bearerToken ? 'bearerToken' : apikeyHeader ? 'apikeyHeader' : 'environment',
                key_length: supabaseKey.length,
                has_env_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
              }
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Database connection failed: ${testError.message}. Code: ${testError.code || 'unknown'}`
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      console.log('✅ Supabase connection test passed');
    } catch (error) {
      console.error('❌ Supabase connection test error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ========================================
    // STEP 1: GENERATE CONTENT
    // ========================================
    console.log('📝 Step 1: Generating content with AI...');
    
    // Check if this is comparison content - if so, use specialized generator
    const isComparisonContent = body.content_type === 'comparison' || 
                                body.aeo_content_type === 'comparison' ||
                                (body.topic.toLowerCase().includes('best ') && body.preferred_service);
    
    let generatedContent: { content: string; title: string; excerpt: string };
    
    if (isComparisonContent && body.preferred_service && body.alternatives && body.alternatives.length > 0) {
      console.log('🎯 Detected comparison content - using comparison-content-generator...');
      
      // Fetch Content Agent config and persona for comparison generator
      let contentAgentConfig = null;
      let personaProfile = null;
      
      if (body.site_id) {
        try {
          contentAgentConfig = await getContentAgentConfig(supabase, body.site_id);
          personaProfile = await getPersonaProfile(supabase, body.site_id);
        } catch (error) {
          console.warn('Failed to fetch Content Agent config or persona profile:', error);
        }
      }
      
      // Call comparison-content-generator
      // CRITICAL: For internal function-to-function calls, use JWT format (functionCallKey)
      // Function secrets don't work for function-to-function calls
      if (!functionCallKey) {
        throw new Error('Service role key required for internal function calls. Ensure SUPABASE_SERVICE_ROLE_KEY is set or pass service role key in Authorization header.');
      }
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                         'https://vpysqshhafthuxvokwqj.supabase.co';
      console.log('🔑 Calling comparison generator:', {
        usingJWT: !!(bearerToken || apikeyHeader),
        usingEnvKey: !!envServiceKey && !(bearerToken || apikeyHeader),
        keyLength: functionCallKey.length,
        keyStart: functionCallKey.substring(0, 20)
      });
      const comparisonResponse = await fetch(`${supabaseUrl}/functions/v1/comparison-content-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${functionCallKey}`,
          'apikey': functionCallKey // Use JWT for function-to-function calls
        },
        body: JSON.stringify({
          topic: body.topic,
          title: body.title,
          preferred_service: body.preferred_service,
          preferred_service_description: body.preferred_service_description,
          alternatives: body.alternatives,
          comparison_criteria: body.comparison_criteria,
          site_id: body.site_id,
          target_audience: body.target_audience,
          content_length: body.content_length,
          editorial_tone: body.editorial_tone,
          conclusion_style: body.conclusion_style,
          content_agent_config: contentAgentConfig,
          persona_profile: personaProfile
        })
      });
      
      if (!comparisonResponse.ok) {
        const errorText = await comparisonResponse.text().catch(() => '');
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText || comparisonResponse.statusText };
        }
        console.error('Comparison generator error:', {
          status: comparisonResponse.status,
          statusText: comparisonResponse.statusText,
          error: errorData
        });
        throw new Error(`Comparison content generator failed: ${errorData.error || comparisonResponse.statusText}`);
      }
      
      const comparisonData = await comparisonResponse.json();
      generatedContent = {
        content: comparisonData.content,
        title: comparisonData.title,
        excerpt: comparisonData.excerpt
      };
      
      console.log(`✅ Comparison content generated (${generatedContent.content.length} chars)`);
    } else {
      // Use standard content generation
      generatedContent = await generateAIContent({
        topic: body.topic,
        title: body.title,
        target_audience: body.target_audience,
        content_type: body.content_type,
        content_length: body.content_length,
        tone: body.tone,
        source_url: body.source_url,
        businessContext: body.businessContext,
        goals: body.goals,
        aeo_content_type: body.aeo_content_type,
        site_id: body.site_id,
        supabase: supabase,
        // Local page parameters
        page_type: body.page_type,
        city: body.city,
        state: body.state,
        vertical: body.vertical,
        service_areas: body.service_areas,
        local_facts: body.local_facts,
        phone_number: body.phone_number,
        call_routing_configured: body.call_routing_configured,
        // AEO Question Optimization
        question: body.question,
        question_analysis: null, // Will be fetched in generateAIContent
        answer_format: null, // Will be fetched in generateAIContent
        question_templates: [], // Will be fetched in generateAIContent
        // Enhanced Generation Options
        use_deepseek: body.use_deepseek !== false, // Default to true
        editorial_quality: body.editorial_quality || 'premium', // Default to premium
        // Listicle parameters
        listicle_item_count: body.listicle_item_count,
        listicle_subtitle: body.listicle_subtitle,
        listicle_intro_context: body.listicle_intro_context,
        listicle_sections: body.listicle_sections,
        listicle_offers: body.listicle_offers,
        generate_item_images: body.generate_item_images,
        listicle_conclusion_cta: body.listicle_conclusion_cta,
        listicle_disclaimer: body.listicle_disclaimer
      } as any);

      console.log(`✅ Content generated (${generatedContent.content.length} chars)`);
    }

    // ========================================
    // STEP 1.5: PROCESS LISTICLE OFFERS (if listicle)
    // ========================================
    if (body.content_type === 'listicle' && body.listicle_offers && body.listicle_offers.length > 0) {
      console.log('🔗 Step 1.5: Inserting listicle offer links...');
      
      let processedContent = generatedContent.content;
      
      // Sort offers by item number
      const sortedOffers = [...body.listicle_offers].sort((a, b) => a.item_number - b.item_number);
      
      // Process each offer
      for (const offer of sortedOffers) {
        // Pattern to find the item (e.g., "1. Title" or "## 1. Title")
        const itemHeaderPattern = new RegExp(
          `(^|\\n)##?\\s*${offer.item_number}\\.\\s+[^\\n]+|^${offer.item_number}\\.\\s+[^\\n]+`,
          'm'
        );
        
        const itemMatch = processedContent.match(itemHeaderPattern);
        if (!itemMatch) {
          console.warn(`⚠️  Could not find item ${offer.item_number} in content`);
          continue;
        }
        
        const itemStartIndex = processedContent.indexOf(itemMatch[0]);
        const itemHeaderEnd = itemStartIndex + itemMatch[0].length;
        
        // Find the end of this item's content (before next item or section)
        const nextItemPattern = new RegExp(
          `\\n(##?\\s*${offer.item_number + 1}\\.|##\\s+[A-Z])`,
          'm'
        );
        const contentAfterItem = processedContent.substring(itemHeaderEnd);
        const nextItemMatch = contentAfterItem.match(nextItemPattern);
        
        const itemContentEnd = nextItemMatch
          ? itemHeaderEnd + contentAfterItem.indexOf(nextItemMatch[0])
          : processedContent.length;
        
        // Extract the item's content section
        const itemSection = processedContent.substring(itemStartIndex, itemContentEnd);
        
        // Check if CTA placeholder exists
        const ctaPlaceholderPattern = /\[CTA:[^\]]*\]/i;
        const hasPlaceholder = ctaPlaceholderPattern.test(itemSection);
        
        // Check if link already exists
        const linkPattern = new RegExp(`\\[${offer.anchor_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');
        const hasLink = linkPattern.test(itemSection);
        
        if (hasLink) {
          console.log(`ℹ️  Item ${offer.item_number} already has link, skipping`);
          continue;
        }
        
        // Find insertion point: after "Real Life Example" or at end of item
        let insertionPoint = itemContentEnd;
        
        // Try to find "Real Life Example" section
        const examplePattern = /(?:Real Life Example|Example:|Case Study:)[^\n]*(?:\n[^\n]+)*/i;
        const exampleMatch = itemSection.match(examplePattern);
        
        if (exampleMatch) {
          // Insert after the example
          const exampleEndInSection = itemSection.indexOf(exampleMatch[0]) + exampleMatch[0].length;
          insertionPoint = itemStartIndex + exampleEndInSection;
        } else {
          // Insert at end of item (before next item)
          insertionPoint = itemContentEnd;
        }
        
        // Create CTA markdown
        const ctaMarkdown = `\n\n[${offer.anchor_text}](${offer.url})\n\n`;
        
        // Insert the CTA
        processedContent = 
          processedContent.substring(0, insertionPoint) +
          ctaMarkdown +
          processedContent.substring(insertionPoint);
        
        console.log(`✅ Inserted CTA for item ${offer.item_number}: ${offer.anchor_text}`);
      }
      
      // Remove any remaining CTA placeholders
      processedContent = processedContent.replace(/\[CTA:[^\]]*\]/gi, '');
      
      generatedContent.content = processedContent;
      console.log(`✅ Listicle offer links processed (${sortedOffers.length} offers)`);
    }

    // ========================================
    // STEP 2: CREATE ARTICLE IN DATABASE
    // ========================================
    console.log('💾 Step 2: Creating article in database...');
    
    // Get default user_id and category
    const { data: users } = await supabase.auth.admin.listUsers();
    const defaultUserId = users?.users?.[0]?.id;
    
    const { data: categories } = await supabase
      .from('article_categories')
      .select('id')
      .limit(1);
    
    // Generate slug - add timestamp if duplicate detected
    let slug = (body.title || body.topic)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check for existing slug and append timestamp if needed
    if (body.content_type === 'listicle') {
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      if (existing) {
        const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
        slug = `${slug}-${timestamp}`;
        console.log(`⚠️  Duplicate slug detected, using: ${slug}`);
      }
    }

    // Generate initial metadata
    const initialMetadata = await generateMetadata({
      title: generatedContent.title,
      excerpt: generatedContent.excerpt,
      slug: slug,
      site_id: body.site_id,
      focus_keyword: (body as any).focus_keyword || undefined,
      supabase: supabase,
    });

    // Determine content strategy category (for internal organization)
    // Priority: strategy.category > content_type > 'general'
    // Strategy category is the actual content category (e.g., 'College Consulting', '529 Plans')
    // content_type is the article type (e.g., 'pillar-page', 'article')
    const strategyCategory = (body as any).category || null;
    const contentType = body.content_type || 'general';
    const contentCategory = strategyCategory || contentType; // Use strategy category if available, otherwise content_type

    const articleData: any = {
      title: generatedContent.title,
      slug: slug,
      content: generatedContent.content,
      excerpt: generatedContent.excerpt,
      category: contentCategory, // Content strategy category (internal) - stores strategy.category or content_type
      category_id: categories?.[0]?.id || null,
      status: 'draft',
      user_id: defaultUserId,
      site_id: body.site_id || null,
      meta_title: generatedContent.title,
      meta_description: generatedContent.excerpt,
      // SEO Metadata
      breadcrumb_title: initialMetadata.breadcrumb_title,
      canonical_url: initialMetadata.canonical_url,
      focus_keyword: initialMetadata.focus_keyword,
      // Social Media Metadata
      og_title: initialMetadata.og_title,
      og_description: initialMetadata.og_description,
      og_image: initialMetadata.og_image,
      twitter_title: initialMetadata.twitter_title,
      twitter_description: initialMetadata.twitter_description,
      twitter_image: initialMetadata.twitter_image,
      // Content Metadata
      persona: (body as any).persona || null,
      tags: (body as any).tags || null,
      scheduled_date: (body as any).scheduled_date || null,
      // Local Page Fields (HomeSimple)
      page_type: body.page_type || 'article',
      city: body.city || null,
      state: body.state || null,
      vertical: body.vertical || null,
      phone_number: body.phone_number || null,
      service_areas: body.service_areas || null,
      call_routing_configured: body.call_routing_configured || false,
    };

    const { data: article, error: insertError } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create article: ${insertError.message}`);
    }

    console.log(`✅ Article created: ${article.id}`);

    // ========================================
    // STEP 2.5: ASSIGN UX CATEGORY (if site_id provided)
    // ========================================
    if (body.site_id && contentCategory) {
      console.log(`📂 Assigning UX category based on content strategy category: "${contentCategory}"...`);
      
      try {
        // Normalize category for mapping lookup (convert "College Consulting" → "college-consulting")
        // Try both the original value and normalized version
        const normalizedCategory = strategyCategory 
          ? strategyCategory.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          : contentCategory.toLowerCase();
        
        // Try to find mapping with original category first, then normalized
        let mapping = null;
        
        // First try: exact match with original category
        const { data: exactMapping } = await supabase
          .from('content_category_ux_mapping')
          .select('ux_category_id')
          .eq('site_id', body.site_id)
          .eq('content_category', contentCategory)
          .eq('is_default', true)
          .maybeSingle();
        
        if (exactMapping?.ux_category_id) {
          mapping = exactMapping;
        } else if (normalizedCategory !== contentCategory) {
          // Second try: normalized version
          const { data: normMapping } = await supabase
            .from('content_category_ux_mapping')
            .select('ux_category_id')
            .eq('site_id', body.site_id)
            .eq('content_category', normalizedCategory)
            .eq('is_default', true)
            .maybeSingle();
          
          if (normMapping?.ux_category_id) {
            mapping = normMapping;
          }
        }

        if (mapping?.ux_category_id) {
          const { error: uxError } = await supabase
            .from('article_ux_categories')
            .insert({
              article_id: article.id,
              ux_category_id: mapping.ux_category_id,
              is_primary: true
            });
          
          if (!uxError) {
            console.log(`✅ UX category assigned`);
          } else {
            console.log(`⚠️  UX category assignment failed: ${uxError.message}`);
          }
        } else {
          console.log(`⚠️  No UX category mapping found for "${contentCategory}" (normalized: "${normalizedCategory}") on site "${body.site_id}"`);
        }
      } catch (error: any) {
        console.log(`⚠️  UX category assignment failed (non-critical): ${error.message}`);
      }
    }

    // ========================================
    // STEP 3: AEO PROCESSING
    // ========================================
    let aeoData: any = {};
    
    if (body.aeo_optimized !== false) {
      console.log('🎯 Step 3: Applying AEO processing...');
      
      const aeoContentType = body.aeo_content_type || 
        detectAEOContentType(body.topic, generatedContent.title);
      
      const validation = validateAnswerFirst(generatedContent.content);
      const structure = extractContentStructure(generatedContent.content);
      const dataPoints = extractDataPoints(generatedContent.content);
      const citations = extractCitations(generatedContent.content);
      
      let schema = null;
      if (body.generate_schema !== false) {
        // For local pages, use schema-generator function (will be enhanced in Phase 1.3)
        if (body.page_type === 'local_page') {
          console.log('🏢 Local page detected - will generate LocalBusiness schema via schema-generator');
          // Note: LocalBusiness schema will be generated by schema-generator function in Phase 1.3
          // For now, generate basic Article schema
          schema = await generateSchema({
            article: { ...article, ...generatedContent },
            site_id: body.site_id,
            content_type: aeoContentType
          });
        } else {
          schema = await generateSchema({
            article: { ...article, ...generatedContent },
            site_id: body.site_id,
            content_type: aeoContentType
          });
        }
      }
      
      const speakableSummary = generateSpeakableSummary(
        generatedContent.content,
        generatedContent.title
      );
      
      const aeoScore = calculateAEOScore({
        answerFirst: validation.valid,
        structure: structure,
        dataPoints: dataPoints.length,
        hasSchema: !!schema
      });

      aeoData = {
        aeo_summary: validation.summary,
        aeo_content_type: aeoContentType,
        content_structure: structure,
        aeo_answer_first: validation.valid,
        data_points: dataPoints,
        citations: citations,
        schema_markup: schema,
        speakable_summary: speakableSummary,
        schema_validated: !!schema
      };

      // Update article with AEO data
      await supabase
        .from('articles')
        .update(aeoData)
        .eq('id', article.id);

      console.log(`✅ AEO processing complete (Score: ${aeoScore})`);
    }

    // ========================================
    // STEP 4: GENERATE IMAGE (OPTIONAL)
    // ========================================
    if (body.generate_image !== false) {
      console.log('🎨 Step 4: Generating featured image...');
      
      try {
        const imageResponse = await fetch(
          `${supabaseUrl}/functions/v1/ai-image-generator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${functionCallKey}`,
              'apikey': functionCallKey, // Use JWT for function-to-function calls
            },
            body: JSON.stringify({
              title: generatedContent.title,
              content: generatedContent.excerpt,
              style: 'professional',
              aspect_ratio: '16:9',
              imageType: 'featured',
              article_id: article.id,
              auto_approve: true
            })
          }
        );

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const imageUrl = imageData.imageUrl || imageData.image_url;
          
          if (!imageUrl) {
            console.error('❌ Image generation returned no URL');
            console.error('Response:', JSON.stringify(imageData, null, 2));
            throw new Error('Image generation failed: No URL returned');
          }
          
          console.log(`✅ Image generated: ${imageUrl}`);
          
          // Update article with featured image URL and regenerate metadata
          if (imageUrl) {
            const updatedMetadata = await generateMetadata({
              title: article.title,
              excerpt: article.excerpt,
              slug: article.slug,
              site_id: article.site_id,
              focus_keyword: article.focus_keyword || undefined,
              featured_image_url: imageUrl,
              supabase: supabase
            });

            await supabase
              .from('articles')
              .update({ 
                featured_image_url: imageUrl,
                featured_image_alt: updatedMetadata.featured_image_alt,
                og_image: imageUrl,
                twitter_image: imageUrl
              })
              .eq('id', article.id);
            console.log('✅ Featured image URL and metadata updated in article');
          }
        } else {
          const errorText = await imageResponse.text();
          console.error(`❌ Image generation failed: ${imageResponse.status} - ${errorText}`);
          // Don't throw - image generation is non-critical
        }
      } catch (error) {
        console.error(`❌ Image generation error: ${error.message}`);
        console.error('Stack:', error.stack);
        // Don't throw - image generation is non-critical
      }
    }

    // ========================================
    // STEP 4.5: GENERATE LISTICLE ITEM IMAGES (if requested)
    // ========================================
    if (body.content_type === 'listicle' && body.generate_item_images && body.listicle_item_count) {
      console.log(`🎨 Step 4.5: Generating images for ${body.listicle_item_count} listicle items...`);
      
      // Extract item titles from content
      const itemPattern = /^(\d+)\.\s+([^\n]+)/gm;
      const items: Array<{ number: number; title: string }> = [];
      let match;
      
      while ((match = itemPattern.exec(generatedContent.content)) !== null) {
        items.push({
          number: parseInt(match[1]),
          title: match[2].trim()
        });
      }
      
      console.log(`📋 Found ${items.length} items in content`);
      
      // Generate images for each item (limit to avoid timeout)
      const maxItemImages = Math.min(items.length, body.listicle_item_count || 12);
      const imagePromises = [];
      
      for (let i = 0; i < maxItemImages; i++) {
        const item = items[i];
        if (!item) continue;
        
        // Generate image for this item
        const imagePromise = fetch(
          `${supabaseUrl}/functions/v1/ai-image-generator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${functionCallKey}`,
              'apikey': functionCallKey,
            },
            body: JSON.stringify({
              title: `${item.number}. ${item.title}`,
              content: `Illustration for: ${item.title}. Part of the article "${generatedContent.title}".`,
              style: 'professional',
              aspect_ratio: '16:9',
              imageType: 'inline',
              article_id: article.id,
              auto_approve: true,
              metadata: {
                listicle_item_number: item.number,
                listicle_item_title: item.title
              }
            })
          }
        ).then(async (response) => {
          if (response.ok) {
            const imageData = await response.json();
            const imageUrl = imageData.imageUrl || imageData.image_url;
            if (imageUrl) {
              console.log(`✅ Generated image for item ${item.number}: ${item.title.substring(0, 50)}...`);
              return { itemNumber: item.number, imageUrl, title: item.title };
            }
          }
          return null;
        }).catch((error) => {
          console.error(`❌ Failed to generate image for item ${item.number}:`, error.message);
          return null;
        });
        
        imagePromises.push(imagePromise);
        
        // Add small delay to avoid rate limiting
        if (i < maxItemImages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Wait for all images (but don't fail if some fail)
      const imageResults = await Promise.all(imagePromises);
      const successfulImages = imageResults.filter(r => r !== null);
      
      console.log(`✅ Generated ${successfulImages.length} item images`);
      
      // Insert images into content (optional - can be done in post-processing)
      // For now, images are generated and stored with metadata, can be inserted later
    }

    // ========================================
    // STEP 5: GENERATE AND INSERT LINKS (OPTIONAL)
    // ========================================
    if (body.generate_links !== false) {
      console.log('🔗 Step 5: Generating and inserting links...');
      
      try {
        // Get link suggestions
        const linkResponse = await fetch(
          `${supabaseUrl}/functions/v1/ai-link-suggestions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${functionCallKey}`,
              'apikey': functionCallKey, // Use JWT for function-to-function calls
            },
            body: JSON.stringify({
              content: generatedContent.content.substring(0, 2000),
              article_id: article.id,
              site_id: body.site_id || article.site_id, // CRITICAL: Pass site_id for correct URL patterns
              max_suggestions: 5
            })
          }
        );

        if (linkResponse.ok) {
          const linkData = await linkResponse.json();
          const suggestions = linkData.suggestions || [];
          
          console.log(`📋 Received ${suggestions.length} link suggestions`);
          
          if (suggestions.length > 0) {
            // Insert links
            const insertLinksResponse = await fetch(
              `${supabaseUrl}/functions/v1/insert-links`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${functionCallKey}`,
                  'apikey': functionCallKey, // Use JWT for function-to-function calls
                },
                body: JSON.stringify({
                  markdown: generatedContent.content,
                  suggestions: suggestions,
                  article_id: article.id
                })
              }
            );

            if (insertLinksResponse.ok) {
              const linksData = await insertLinksResponse.json();
              // Update article with linked content
              const { error: updateError } = await supabase
                .from('articles')
                .update({ content: linksData.markdown })
                .eq('id', article.id);
              
              if (updateError) {
                console.error(`❌ Failed to update article with links: ${updateError.message}`);
              } else {
                console.log(`✅ ${linksData.inserted || 0} links inserted and saved`);
              }
            } else {
              const errorText = await insertLinksResponse.text();
              console.error(`❌ Link insertion failed: ${insertLinksResponse.status} - ${errorText}`);
            }
          } else {
            console.log('ℹ️  No link suggestions returned');
          }
        } else {
          const errorText = await linkResponse.text();
          console.error(`❌ Link suggestions failed: ${linkResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.error(`❌ Link generation error: ${error.message}`);
        console.error('Stack:', error.stack);
        // Don't throw - link generation is non-critical
      }
    }

    // ========================================
    // STEP 6: CONVERT TO HTML (OPTIONAL)
    // ========================================
    if (body.convert_to_html !== false) {
      console.log('📄 Step 6: Converting markdown to HTML...');
      
      try {
        // Get latest article content (may have been updated with links)
        const { data: latestArticle } = await supabase
          .from('articles')
          .select('content')
          .eq('id', article.id)
          .single();
        
        const contentToConvert = latestArticle?.content || article.content;
        
        const htmlResponse = await fetch(
          `${supabaseUrl}/functions/v1/markdown-to-html`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${functionCallKey}`,
              'apikey': functionCallKey, // Use JWT for function-to-function calls
            },
            body: JSON.stringify({
              markdown: contentToConvert,
              article_id: article.id,
              conversionType: 'enhanced',
              styling: 'modern',
              includeCss: false
            })
          }
        );

        if (htmlResponse.ok) {
          const htmlData = await htmlResponse.json();
          const htmlBody = htmlData.html || htmlData.html_body;
          
          if (htmlBody) {
            // Update article with HTML body
            const { error: updateError } = await supabase
              .from('articles')
              .update({ html_body: htmlBody })
              .eq('id', article.id);
            
            if (updateError) {
              console.error(`❌ Failed to save HTML body: ${updateError.message}`);
            } else {
              console.log('✅ HTML conversion complete and saved to article');
            }
          } else {
            console.error('❌ HTML conversion returned no HTML body');
            console.error('Response:', JSON.stringify(htmlData, null, 2));
          }
        } else {
          const errorText = await htmlResponse.text();
          console.error(`❌ HTML conversion failed: ${htmlResponse.status} - ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.error(`❌ HTML conversion error: ${error.message}`);
        console.error('Stack:', error.stack);
        // Don't throw - HTML conversion is non-critical
      }
    }

    // ========================================
    // STEP 7: PUBLISH ARTICLE (OPTIONAL)
    // ========================================
    if (body.auto_publish === true) {
      console.log('📢 Step 7: Publishing article...');
      
      try {
        const { error: publishError } = await supabase
          .from('articles')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', article.id);

        if (publishError) {
          console.log('⚠️  Publishing failed (non-critical):', publishError.message);
        } else {
          console.log('✅ Article published!');
        }
      } catch (error) {
        console.log('⚠️  Publishing failed (non-critical)');
      }
    }

    // ========================================
    // STEP 8: GENERATE SOCIAL MEDIA POSTS (OPTIONAL)
    // ========================================
    if (body.generate_social_posts !== false && (body.auto_publish === true || article.status === 'published')) {
      console.log('📱 Step 8: Generating social media posts...');
      
      try {
        const platforms = body.social_platforms || ['facebook', 'twitter', 'linkedin'];
        
        // Fetch the latest article data (including featured image)
        const { data: latestArticle } = await supabase
          .from('articles')
          .select('*')
          .eq('id', article.id)
          .single();

        const socialResponse = await fetch(
          `${supabaseUrl}/functions/v1/promotion-manager`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${functionCallKey}`,
              'apikey': functionCallKey, // Use JWT for function-to-function calls
            },
            body: JSON.stringify({
              content: {
                title: latestArticle?.title || article.title,
                content: latestArticle?.content || article.content,
                excerpt: latestArticle?.excerpt || generatedContent.excerpt,
                featured_image: latestArticle?.featured_image_url || null,
                category: latestArticle?.category || body.content_type,
                tags: latestArticle?.tags || []
              },
              platforms: platforms,
              promotionType: 'social-media',
              targetAudience: body.target_audience || 'general',
              includeHashtags: true,
              includeCallToAction: true
            })
          }
        );

        if (socialResponse.ok) {
          const socialData = await socialResponse.json();
          console.log(`✅ Social posts generated for ${platforms.length} platform(s)`);
          
          // Store social posts in database (if you have a social_posts table)
          // This would require creating the table first
          
          // If share_to_social is enabled, actually post to platforms via GHL
          if (body.share_to_social === true) {
            console.log('📤 Step 9: Sharing to social platforms via GHL...');
            
            try {
              const ghlPostResponse = await fetch(
                `${supabaseUrl}/functions/v1/ghl-social-poster`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${functionCallKey}`,
                    'apikey': functionCallKey, // Use JWT for function-to-function calls
                  },
                  body: JSON.stringify({
                    article_id: article.id,
                    site_id: body.site_id,
                    profile_name: body.profile_name,
                    platforms: platforms,
                    schedule_hours: body.schedule_hours || 1,
                    include_image: true
                  })
                }
              );

              if (ghlPostResponse.ok) {
                const ghlData = await ghlPostResponse.json();
                console.log(`✅ Posted to ${ghlData.posts_scheduled} platform(s) via GHL`);
                console.log(`   Results:`, ghlData.platform_results);
              } else {
                const errorData = await ghlPostResponse.json().catch(() => ({}));
                console.log(`⚠️  GHL posting failed: ${errorData.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.log('⚠️  GHL posting failed (non-critical)');
            }
          }
        } else {
          console.log('⚠️  Social post generation failed (non-critical)');
        }
      } catch (error) {
        console.log('⚠️  Social post generation failed (non-critical)');
      }
    }

    // ========================================
    // RETURN COMPLETE RESPONSE
    // ========================================
    console.log('✅ Article generation workflow complete!');
    
    // Fetch final article state
    const { data: finalArticle } = await supabase
      .from('articles')
      .select('*')
      .eq('id', article.id)
      .single();
    
    return new Response(
      JSON.stringify({
        article_id: article.id,
        id: article.id,
        title: finalArticle?.title || article.title,
        content: finalArticle?.content || article.content,
        status: finalArticle?.status || article.status,
        published_at: finalArticle?.published_at || null,
        featured_image_url: finalArticle?.featured_image_url || null,
        ...aeoData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Agentic Content Gen Error:', error);
    
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
