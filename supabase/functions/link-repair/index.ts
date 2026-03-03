/**
 * Supabase Edge Function: Link Repair
 * 
 * Automatically repairs broken internal links in articles by:
 * - Finding alternative articles with similar content
 * - Removing broken links if no alternative found
 * - Updating link URLs to correct routes
 * 
 * Request Body:
 * {
 *   article_id?: string (optional) - UUID of article to repair
 *   site_id?: string (optional) - Site ID to repair all articles for
 *   repair_all?: boolean (optional, default: false) - Repair all broken links
 *   remove_if_no_match?: boolean (optional, default: true) - Remove links if no alternative found
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   repaired: number - Number of links repaired
 *   removed: number - Number of links removed
 *   failed: number - Number of links that couldn't be repaired
 *   results: Array<{
 *     article_id: string
 *     article_title: string
 *     repairs: Array<{old_url: string, new_url: string, action: string}>
 *   }>
 *   timestamp: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkRepairRequest {
  article_id?: string;
  site_id?: string;
  repair_all?: boolean;
  remove_if_no_match?: boolean;
}

interface LinkRepairResponse {
  success: boolean;
  repaired: number;
  removed: number;
  failed: number;
  results: Array<{
    article_id: string;
    article_title: string;
    repairs: Array<{old_url: string, new_url: string, action: string}>;
  }>;
  timestamp: string;
  error?: string;
}

// Find alternative article by matching keywords in title
async function findAlternativeArticle(
  supabase: any,
  brokenLinkText: string,
  currentArticleId: string,
  siteId: string,
  routePath: string
): Promise<{id: string, slug: string, url: string} | null> {
  // Extract keywords from broken link text
  const keywords = brokenLinkText.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 3);

  if (keywords.length === 0) {
    return null;
  }

  // Search for articles with similar titles
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug')
    .eq('site_id', siteId)
    .eq('status', 'published')
    .neq('id', currentArticleId)
    .limit(10);

  if (!articles || articles.length === 0) {
    return null;
  }

  // Score articles by keyword matches
  const scored = articles.map(article => {
    const titleLower = article.title.toLowerCase();
    const matches = keywords.filter(kw => titleLower.includes(kw)).length;
    return { ...article, score: matches };
  }).filter(a => a.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return null;
  }

  const bestMatch = scored[0];
  return {
    id: bestMatch.id,
    slug: bestMatch.slug,
    url: `${routePath}/${bestMatch.slug}`
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
    const body: LinkRepairRequest = await req.json();

    // Get broken links from validation results
    let brokenLinksQuery = supabase
      .from('link_validation_results')
      .select(`
        article_id,
        link_url,
        link_text,
        articles!inner(id, title, slug, content, html_body, site_id)
      `)
      .eq('is_valid', false)
      .eq('validation_status', 'broken');

    if (body.article_id) {
      brokenLinksQuery = brokenLinksQuery.eq('article_id', body.article_id);
    } else if (body.site_id) {
      brokenLinksQuery = brokenLinksQuery.eq('articles.site_id', body.site_id);
    } else if (!body.repair_all) {
      return new Response(
        JSON.stringify({
          success: false,
          repaired: 0,
          removed: 0,
          failed: 0,
          results: [],
          timestamp: new Date().toISOString(),
          error: 'Must provide article_id, site_id, or set repair_all=true'
        } as LinkRepairResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: brokenLinks, error: linksError } = await brokenLinksQuery;

    if (linksError) {
      throw new Error(`Failed to fetch broken links: ${linksError.message}`);
    }

    if (!brokenLinks || brokenLinks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          repaired: 0,
          removed: 0,
          failed: 0,
          results: [],
          timestamp: new Date().toISOString()
        } as LinkRepairResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get site route paths
    const { data: sites } = await supabase
      .from('sites')
      .select('id, article_route_path');

    const siteRouteMap: Record<string, string> = {};
    if (sites) {
      sites.forEach(site => {
        siteRouteMap[site.id] = site.article_route_path || '/articles';
      });
    }

    let repairedCount = 0;
    let removedCount = 0;
    let failedCount = 0;
    const results: Record<string, {
      article_id: string;
      article_title: string;
      repairs: Array<{old_url: string, new_url: string, action: string}>;
    }> = {};

    // Group by article
    const linksByArticle: Record<string, Array<any>> = {};
    brokenLinks.forEach(link => {
      const articleId = link.article_id;
      if (!linksByArticle[articleId]) {
        linksByArticle[articleId] = [];
      }
      linksByArticle[articleId].push(link);
    });

    // Repair each article
    for (const [articleId, links] of Object.entries(linksByArticle)) {
      const article = links[0].articles;
      const routePath = siteRouteMap[article.site_id] || '/articles';
      let content = article.html_body || article.content || '';
      const isHtml = !!article.html_body;

      if (!results[articleId]) {
        results[articleId] = {
          article_id: articleId,
          article_title: article.title,
          repairs: []
        };
      }

      for (const link of links) {
        // Try to find alternative article
        const alternative = await findAlternativeArticle(
          supabase,
          link.link_text,
          articleId,
          article.site_id,
          routePath
        );

        if (alternative) {
          // Replace broken link with alternative
          const oldUrl = link.link_url;
          const newUrl = alternative.url;
          
          if (isHtml) {
            // Replace in HTML
            const htmlRegex = new RegExp(
              `<a[^>]+href=["']${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]+)<\/a>`,
              'gi'
            );
            content = content.replace(htmlRegex, `<a href="${newUrl}">$1</a>`);
          } else {
            // Replace in markdown
            const markdownRegex = new RegExp(
              `\\[([^\\]]+)\\]\\(${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
              'g'
            );
            content = content.replace(markdownRegex, `[$1](${newUrl})`);
          }

          // Update article
          await supabase
            .from('articles')
            .update({
              [isHtml ? 'html_body' : 'content']: content,
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);

          // Update validation record
          await supabase
            .from('link_validation_results')
            .update({
              link_url: newUrl,
              target_article_id: alternative.id,
              is_valid: true,
              validation_status: 'repaired',
              error_message: null,
              last_validated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('article_id', articleId)
            .eq('link_url', oldUrl);

          results[articleId].repairs.push({
            old_url: oldUrl,
            new_url: newUrl,
            action: 'repaired'
          });
          repairedCount++;
        } else if (body.remove_if_no_match !== false) {
          // Remove broken link
          const oldUrl = link.link_url;
          
          if (isHtml) {
            // Remove from HTML (convert to plain text)
            const htmlRegex = new RegExp(
              `<a[^>]+href=["']${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]+)<\/a>`,
              'gi'
            );
            content = content.replace(htmlRegex, '$1');
          } else {
            // Remove from markdown (convert to plain text)
            const markdownRegex = new RegExp(
              `\\[([^\\]]+)\\]\\(${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
              'g'
            );
            content = content.replace(markdownRegex, '$1');
          }

          // Update article
          await supabase
            .from('articles')
            .update({
              [isHtml ? 'html_body' : 'content']: content,
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);

          // Delete validation record
          await supabase
            .from('link_validation_results')
            .delete()
            .eq('article_id', articleId)
            .eq('link_url', oldUrl);

          results[articleId].repairs.push({
            old_url: oldUrl,
            new_url: '',
            action: 'removed'
          });
          removedCount++;
        } else {
          results[articleId].repairs.push({
            old_url: link.link_url,
            new_url: '',
            action: 'failed'
          });
          failedCount++;
        }
      }
    }

    const response: LinkRepairResponse = {
      success: true,
      repaired: repairedCount,
      removed: removedCount,
      failed: failedCount,
      results: Object.values(results),
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Link Repair Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        repaired: 0,
        removed: 0,
        failed: 0,
        results: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LinkRepairResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});




