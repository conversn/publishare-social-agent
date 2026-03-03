/// <reference lib="deno.ns" />

/**
 * Supabase Edge Function: GHL Social Media Poster
 * 
 * Posts content to social media platforms via GoHighLevel API.
 * Integrates with the existing unified GHL social posting system.
 * 
 * Request Body:
 * {
 *   article_id: string (required) - Article ID to post
 *   site_id?: string - Site ID (will look up config)
 *   profile_name?: string - Profile name (if multiple profiles per site)
 *   platforms?: string[] - Override platforms: ['facebook', 'linkedin', 'twitter', 'instagram']
 *   schedule_hours?: number - Hours to schedule ahead (default: 1)
 *   include_image?: boolean - Include featured image (default: true)
 *   custom_content?: string - Override article content
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   posts_scheduled: number
 *   platform_results: {
 *     platform: string
 *     success: boolean
 *     post_id?: string
 *     scheduled_at?: string
 *     error?: string
 *   }[]
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GHLSocialPosterRequest {
  article_id?: string;
  site_id?: string;
  profile_name?: string;
  platforms?: string[];
  destination_channel_key?: string;
  destination_channel_id?: string;
  post_intent?: 'native' | 'promotion';
  schedule_hours?: number;
  include_image?: boolean;
  custom_image_url?: string;
  custom_content?: string;
}

interface PlatformResult {
  platform: string;
  success: boolean;
  account_id?: string;
  account_name?: string;
  post_id?: string;
  scheduled_at?: string;
  error?: string;
}

interface ResolvedEditorialConfig {
  site_id?: string;
  profile_name?: string;
  platforms: string[];
  default_schedule_hours: number;
  brand_voice?: string;
  image_prompt_style?: string;
  daily_theme?: string;
  framework?: string;
  linkedin_agent_instructions?: string;
  platform_agent_instructions?: Record<string, any>;
  platform_rules: Record<string, any>;
  cta_text?: string;
}

// Strip markdown from content for social media
function stripMarkdown(content: string): string {
  let cleaned = content;
  
  // Remove headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove strikethrough
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
  
  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  
  // Remove links (keep text)
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove images (keep alt text)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
  
  // Remove list markers
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');
  
  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s+/gm, '');
  
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, '');
  
  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  return cleaned;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter(Boolean);
}

function getTodayKeyUTC(): string {
  const day = new Date().getUTCDay();
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[day] || 'monday';
}

function getThemeForDay(themeMap: unknown, dayKey: string): string {
  if (!themeMap || typeof themeMap !== 'object') return '';
  const themes = themeMap as Record<string, unknown>;
  return String(
    themes[dayKey] ||
      themes[dayKey.toLowerCase()] ||
      themes[dayKey.charAt(0).toUpperCase() + dayKey.slice(1)] ||
      ''
  ).trim();
}

function getRotatedFramework(frameworkRotation: unknown): string | undefined {
  const options = toStringArray(frameworkRotation);
  if (options.length === 0) return undefined;
  const dayOfYearUtc = Math.floor(
    (Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) -
      Date.UTC(new Date().getUTCFullYear(), 0, 0)) /
      86400000
  );
  return options[dayOfYearUtc % options.length];
}

function normalizePlatformRules(platformRules: unknown): Record<string, any> {
  if (!platformRules || typeof platformRules !== 'object') return {};
  return platformRules as Record<string, any>;
}

function applyFrameworkLead(framework: string | undefined, body: string): string {
  if (!framework) return body;
  switch (framework.toUpperCase()) {
    case 'PAS':
      return `Problem: ${body}\n\nSolution:`;
    case 'AIDA':
      return `Attention: ${body}\n\nAction:`;
    case 'HORMOZI':
      return `Big result, less time, less effort: ${body}`;
    default:
      return body;
  }
}

function shouldApplyKeenanLinkedinInstructions(
  platform: string,
  config: ResolvedEditorialConfig
): boolean {
  return (
    String(platform || '').toLowerCase() === 'linkedin' &&
    String(config.site_id || '').toLowerCase() === 'callready' &&
    String(config.profile_name || '').toLowerCase().includes('keenan shaw') &&
    String(config.linkedin_agent_instructions || '').trim().length > 0
  );
}

function applyKeenanLinkedinStyle(text: string): string {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  return [
    `How I simplify pipeline so teams stop burning cycles.`,
    ``,
    compact,
    ``,
    `What changed output for us:`,
    `- Remove one manual bottleneck`,
    `- Assign one clear owner per stage`,
    `- Track one KPI weekly`,
    ``,
    `If you run a B2B agency, comment "SYSTEM" and I will share the checklist.`,
  ].join('\n');
}

function resolvePlatformCopy(
  platform: string,
  baseCopy: string,
  articleUrl: string,
  config: ResolvedEditorialConfig
): string {
  const platformRule = config.platform_rules?.[platform] || {};
  const cta = platformRule.cta || config.cta_text || 'Read more';
  const hashtags = Array.isArray(platformRule.hashtags)
    ? platformRule.hashtags.map((tag: string) => String(tag).trim()).filter(Boolean)
    : [];
  const maxLength = Number(platformRule.max_length) || (platform === 'twitter' ? 280 : 1300);

  let text = baseCopy;
  if (config.daily_theme) {
    text = `${config.daily_theme}: ${text}`;
  }
  if (config.brand_voice) {
    text = `${config.brand_voice}\n\n${text}`;
  }
  if (shouldApplyKeenanLinkedinInstructions(platform, config)) {
    text = applyKeenanLinkedinStyle(text);
  }
  text = applyFrameworkLead(config.framework, text);

  const suffixParts = [`${cta}: ${articleUrl}`];
  if (hashtags.length > 0) {
    suffixParts.push(hashtags.join(' '));
  }
  const suffix = suffixParts.join('\n');
  let finalText = `${text}\n\n${suffix}`.trim();

  if (finalText.length > maxLength) {
    const room = Math.max(32, maxLength - suffix.length - 3);
    const truncatedBody = text.slice(0, room).trim();
    finalText = `${truncatedBody}...\n\n${suffix}`;
  }

  return finalText;
}

async function resolveEditorialConfig(
  supabase: any,
  siteId: string,
  profileName?: string
): Promise<ResolvedEditorialConfig> {
  let ghlQuery = supabase
    .from('ghl_social_config')
    .select('*')
    .eq('site_id', siteId)
    .eq('enabled', true);

  if (profileName) {
    ghlQuery = ghlQuery.eq('profile_name', profileName);
  }

  const { data: ghlConfigs, error: ghlConfigError } = await ghlQuery;
  if (ghlConfigError || !ghlConfigs || ghlConfigs.length === 0) {
    throw new Error(
      `No GHL config found for site_id: ${siteId}${profileName ? `, profile: ${profileName}` : ''}`
    );
  }
  const ghlConfig = ghlConfigs[0];

  let editorialQuery = supabase
    .from('brand_editorial_config')
    .select('*')
    .eq('site_id', siteId)
    .eq('enabled', true);

  if (profileName) {
    editorialQuery = editorialQuery.eq('profile_name', profileName);
  }

  const { data: editorialRows } = await editorialQuery.limit(1);
  const editorial = editorialRows?.[0];

  const { data: site } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .maybeSingle();

  const { data: personaRow } = await supabase
    .from('heygen_avatar_config')
    .select('persona_profile')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .maybeSingle();

  const todayKey = getTodayKeyUTC();
  const siteContentAgent = site?.config?.content_agent || {};
  const personaProfile = personaRow?.persona_profile || {};
  const voiceStyle = editorial?.voice_style || {};
  const dailyThemeMap = editorial?.daily_themes || editorial?.daily_theme_map || {};
  const platformRules = normalizePlatformRules(editorial?.platform_rules);

  let frameworkFromIds: string | undefined;
  const frameworkIds = Array.isArray(editorial?.framework_ids)
    ? editorial.framework_ids.map((id: unknown) => String(id)).filter(Boolean)
    : [];
  if (frameworkIds.length > 0) {
    const { data: frameworkRows } = await supabase
      .from('social_writing_frameworks')
      .select('id, framework_key')
      .in('id', frameworkIds)
      .eq('is_active', true);
    frameworkFromIds = getRotatedFramework((frameworkRows || []).map((row: any) => row.framework_key));
  }

  let personaTone = '';
  if (editorial?.persona_id) {
    const { data: personaById } = await supabase
      .from('personas')
      .select('tone_voice, ai_prompt')
      .eq('id', editorial.persona_id)
      .maybeSingle();
    personaTone = personaById?.tone_voice || '';
  }

  const resolved: ResolvedEditorialConfig = {
    site_id: siteId,
    profile_name: editorial?.profile_name || ghlConfig.profile_name,
    platforms:
      toStringArray(editorial?.platforms).length > 0
        ? toStringArray(editorial?.platforms)
        : toStringArray(ghlConfig.platforms).length > 0
          ? toStringArray(ghlConfig.platforms)
          : ['facebook', 'linkedin', 'twitter'],
    default_schedule_hours:
      Number(editorial?.default_schedule_hours) ||
      Number(ghlConfig.default_schedule_hours) ||
      1,
    brand_voice:
      editorial?.editorial_voice ||
      voiceStyle.brand_voice ||
      personaTone ||
      ghlConfig.brand_voice ||
      personaProfile?.voice?.tone ||
      siteContentAgent?.tone_guidelines ||
      '',
    image_prompt_style: editorial?.image_style_prompt || editorial?.image_prompt_style || voiceStyle.image_prompt_style || '',
    daily_theme:
      getThemeForDay(dailyThemeMap, todayKey) ||
      (Array.isArray(ghlConfig.content_themes) ? ghlConfig.content_themes[0] : '') ||
      '',
    framework:
      frameworkFromIds ||
      getRotatedFramework(editorial?.framework_rotation) ||
      getRotatedFramework(site?.config?.social_writing_frameworks) ||
      undefined,
    linkedin_agent_instructions: editorial?.linkedin_agent_instructions || '',
    platform_agent_instructions: editorial?.platform_agent_instructions || {},
    platform_rules: platformRules,
    cta_text: platformRules?.default?.cta || 'Read more'
  };

  // Attach credentials used by poster without exposing them publicly.
  (resolved as any).ghl_api_key = ghlConfig.ghl_api_key;
  (resolved as any).ghl_location_id = ghlConfig.ghl_location_id;

  return resolved;
}

// Get platform account from GHL
async function getPlatformAccount(
  ghlApiKey: string,
  ghlLocationId: string,
  platform: string,
  requestedAccountId?: string
): Promise<any> {
  const platformMap: Record<string, string> = {
    'facebook': 'Facebook',
    'linkedin': 'LinkedIn',
    'twitter': 'Twitter',
    'instagram': 'Instagram'
  };
  
  const platformName = platformMap[platform.toLowerCase()] || platform;
  
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/social-media-posting/${ghlLocationId}/accounts`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`GHL API error: ${response.status}`);
    }
    
    const data = await response.json();
    const accounts = Array.isArray(data?.accounts)
      ? data.accounts
      : Array.isArray(data?.results?.accounts)
        ? data.results.accounts
        : Array.isArray(data)
          ? data
          : [];
    
    const platformAccounts = accounts.filter((acc: any) =>
      acc.platform?.toLowerCase() === platformName.toLowerCase() ||
      acc.name?.toLowerCase().includes(platformName.toLowerCase())
    );

    if (platformAccounts.length === 0) {
      return null;
    }

    const requestedId = String(requestedAccountId || '').trim();
    if (requestedId) {
      const selected = platformAccounts.find((acc: any) => String(acc.id || '').trim() === requestedId);
      if (!selected) {
        const available = platformAccounts.map((acc: any) => String(acc.id || '')).filter(Boolean);
        throw new Error(
          `Requested ${platform} destination_channel_id not found: ${requestedId}. Available: [${available.join(', ')}]`
        );
      }
      return selected;
    }

    return platformAccounts[0];
  } catch (error) {
    console.error(`Error fetching platform account for ${platform}:`, error);
    return null;
  }
}

// Upload image to GHL media library
async function uploadImageToGHL(
  ghlApiKey: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // Download image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image');
    }
    
    const imageBlob = await imageResponse.blob();
    const formData = new FormData();
    formData.append('file', imageBlob, 'image.png');
    
    // Upload to GHL
    const uploadResponse = await fetch(
      'https://services.leadconnectorhq.com/medias/upload-file',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28'
        },
        body: formData
      }
    );
    
    if (!uploadResponse.ok) {
      throw new Error(`GHL upload error: ${uploadResponse.status}`);
    }
    
    const uploadData = await uploadResponse.json();
    return uploadData.url || uploadData.media?.url || null;
  } catch (error) {
    console.error('Error uploading image to GHL:', error);
    return null;
  }
}

// Schedule post to GHL
async function schedulePostToGHL(
  ghlApiKey: string,
  ghlLocationId: string,
  platform: string,
  content: string,
  scheduleHours: number,
  imageUrl?: string,
  destinationChannelId?: string
): Promise<{ success: boolean; account_id?: string; account_name?: string; post_id?: string; scheduled_at?: string; error?: string }> {
  try {
    // Get platform account
    const account = await getPlatformAccount(ghlApiKey, ghlLocationId, platform, destinationChannelId);
    if (!account) {
      return {
        success: false,
        error: `Platform ${platform} not connected in GHL`
      };
    }
    
    // Upload image if provided
    let mediaUrl: string | null = null;
    if (imageUrl) {
      mediaUrl = await uploadImageToGHL(ghlApiKey, imageUrl);
    }
    
    // Calculate schedule time
    const scheduleDate = new Date();
    scheduleDate.setHours(scheduleDate.getHours() + scheduleHours);
    const scheduledTime = scheduleDate.toISOString();
    
    // Prepare payload
    const payload: any = {
      accountIds: [account.id],
      summary: content,
      type: 'post',
      userId: account.oauthId,
      scheduleDate: scheduledTime,
      media: []
    };
    
    // Add media if available
    if (mediaUrl) {
      payload.media = [{
        url: mediaUrl,
        type: 'image/png' // Critical: must be MIME type format
      }];
    }
    
    // Schedule post
    const response = await fetch(
      `https://services.leadconnectorhq.com/social-media-posting/${ghlLocationId}/posts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify(payload)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      account_id: account.id,
      account_name: account.name || account.pageName || account.username || null,
      post_id: data.id || data.postId,
      scheduled_at: scheduledTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
    const body: GHLSocialPosterRequest = await req.json();
    
    const hasCustomContent = typeof body.custom_content === 'string' && body.custom_content.trim().length > 0;
    const requestedIntent = String(body.post_intent || '').toLowerCase();
    const postIntent = (requestedIntent === 'native' || requestedIntent === 'promotion')
      ? requestedIntent
      : 'promotion';

    if (postIntent === 'promotion' && !body.article_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'article_id is required for promotion intent'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📱 Posting ${postIntent} content via GHL (article_id=${body.article_id || 'none'})`);

    // ========================================
    // STEP 1: FETCH ARTICLE
    // ========================================
    let article: any = null;
    if (body.article_id) {
      const { data: articleRow, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', body.article_id)
        .single();

      if (articleError || !articleRow) {
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
      article = articleRow;
    }

    // Determine site_id
    const siteId = body.site_id || article?.site_id;
    if (!siteId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'site_id is required (not found in article or request)'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ========================================
    // STEP 2: RESOLVE CONSOLIDATED EDITORIAL CONFIG
    // ========================================
    let resolvedConfig: ResolvedEditorialConfig;
    try {
      resolvedConfig = await resolveEditorialConfig(supabase, siteId, body.profile_name);
    } catch (configError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: configError instanceof Error ? configError.message : 'Failed to resolve config'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: site } = await supabase
      .from('sites')
      .select('domain, article_route_path')
      .eq('id', siteId)
      .maybeSingle();

    // ========================================
    // STEP 3: PREPARE CONTENT
    // ========================================
    const content = hasCustomContent
      ? String(body.custom_content || '')
      : (article?.excerpt || article?.content?.substring(0, 1000) || article?.title || '');
    if (!content.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No publishable content available (custom_content empty and no article content).'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    const cleanedContent = stripMarkdown(content);
    
    // Add article URL if available
    const siteDomain =
      (site?.domain ? String(site.domain).replace(/^https?:\/\//, '') : `${siteId}.org`) || `${siteId}.org`;
    const articlePath = site?.article_route_path || '/articles';
    const articleUrl = article?.slug
      ? `https://${siteDomain}${articlePath}/${article.slug}`
      : article?.id
        ? `https://${siteDomain}${articlePath}/${article.id}`
        : '';

    // ========================================
    // STEP 4: POST TO PLATFORMS
    // ========================================
    const platforms = body.platforms || resolvedConfig.platforms || ['facebook', 'linkedin', 'twitter'];
    const requestedDestinationChannelId = String(body.destination_channel_id || '').trim();
    const requestedDestinationChannelKey = String(body.destination_channel_key || '').trim();
    const hasExplicitSchedule =
      body.schedule_hours !== undefined &&
      body.schedule_hours !== null &&
      String(body.schedule_hours).trim() !== '';
    const scheduleHours = hasExplicitSchedule
      ? Math.max(0, Number(body.schedule_hours))
      : Math.max(0, Number(resolvedConfig.default_schedule_hours || 1));
    const includeImage = body.include_image !== false;
    
    const platformResults: PlatformResult[] = [];
    
    for (const platform of platforms) {
      console.log(`📤 Posting to ${platform}...`);
      
      const imageUrl = includeImage
        ? (
            postIntent === 'native'
              ? (body.custom_image_url || undefined)
              : (body.custom_image_url || article?.featured_image_url || undefined)
          )
        : undefined;
      
      const result = await schedulePostToGHL(
        (resolvedConfig as any).ghl_api_key,
        (resolvedConfig as any).ghl_location_id,
        platform,
        postIntent === 'native' && hasCustomContent
          ? cleanedContent
          : resolvePlatformCopy(platform, cleanedContent, articleUrl, resolvedConfig),
        scheduleHours,
        imageUrl,
        requestedDestinationChannelId || undefined
      );
      
      platformResults.push({
        platform,
        account_id: result.account_id,
        account_name: result.account_name,
        ...result
      });
      
      if (result.success) {
        console.log(`✅ Posted to ${platform}: ${result.post_id}`);
      } else {
        console.log(`❌ Failed to post to ${platform}: ${result.error}`);
      }
    }

    const successCount = platformResults.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        posts_scheduled: successCount,
        resolved_post_intent: postIntent,
        resolved_editorial_profile: resolvedConfig.profile_name || null,
        resolved_framework: resolvedConfig.framework || null,
        resolved_daily_theme: resolvedConfig.daily_theme || null,
        requested_destination_channel_key: requestedDestinationChannelKey || null,
        requested_destination_channel_id: requestedDestinationChannelId || null,
        platform_results: platformResults
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('GHL Social Poster Error:', error);
    
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
