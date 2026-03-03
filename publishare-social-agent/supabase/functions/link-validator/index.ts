/**
 * Supabase Edge Function: Link Validator
 * 
 * Validates internal links in articles to ensure they point to existing, published articles.
 * Can validate a single article, all articles for a site, or all articles.
 * 
 * Request Body:
 * {
 *   article_id?: string (optional) - UUID of article to validate
 *   site_id?: string (optional) - Site ID to validate all articles for
 *   validate_all?: boolean (optional, default: false) - Validate all articles
 *   repair?: boolean (optional, default: false) - Automatically repair broken links
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   validated: number - Number of articles validated
 *   links_checked: number - Total links checked
 *   broken_links: number - Number of broken links found
 *   repaired: number - Number of links repaired (if repair=true)
 *   results: Array<{
 *     article_id: string
 *     article_title: string
 *     broken_links: Array<{url: string, text: string, error: string}>
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

interface LinkValidatorRequest {
  article_id?: string;
  site_id?: string;
  validate_all?: boolean;
  repair?: boolean;
}

interface LinkValidatorResponse {
  success: boolean;
  validated: number;
  links_checked: number;
  broken_links: number;
  repaired: number;
  results: Array<{
    article_id: string;
    article_title: string;
    broken_links: Array<{url: string, text: string, error: string}>;
  }>;
  timestamp: string;
  error?: string;
}

// Extract internal links from markdown or HTML
function extractLinks(content: string, isHtml: boolean = false): Array<{url: string, text: string}> {
  const links: Array<{url: string, text: string}> = [];
  
  if (isHtml) {
    // Extract from HTML
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({ url: match[1], text: match[2] });
    }
  } else {
    // Extract from markdown
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      links.push({ url: match[2], text: match[1] });
    }
  }
  
  return links;
}

// Check if URL is an internal link
function isInternalLink(url: string): boolean {
  // Internal links start with / and don't have http/https
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('http');
}

// Extract slug from URL
function extractSlugFromUrl(url: string, routePath: string): string | null {
  // Remove route path prefix (e.g., /articles/ or /library/)
  if (url.startsWith(routePath + '/')) {
    return url.substring(routePath.length + 1);
  }
  // Also handle URLs that start with just the route path
  if (url.startsWith(routePath)) {
    const rest = url.substring(routePath.length);
    return rest.startsWith('/') ? rest.substring(1) : rest;
  }
  return null;
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
    const body: LinkValidatorRequest = await req.json();

    // Determine which articles to validate
    let articlesQuery = supabase
      .from('articles')
      .select('id, title, slug, content, html_body, site_id, status');

    if (body.article_id) {
      articlesQuery = articlesQuery.eq('id', body.article_id);
    } else if (body.site_id) {
      articlesQuery = articlesQuery.eq('site_id', body.site_id);
    } else if (!body.validate_all) {
      return new Response(
        JSON.stringify({
          success: false,
          validated: 0,
          links_checked: 0,
          broken_links: 0,
          repaired: 0,
          results: [],
          timestamp: new Date().toISOString(),
          error: 'Must provide article_id, site_id, or set validate_all=true'
        } as LinkValidatorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Only validate published articles
    articlesQuery = articlesQuery.eq('status', 'published');

    const { data: articles, error: articlesError } = await articlesQuery;

    if (articlesError) {
      throw new Error(`Failed to fetch articles: ${articlesError.message}`);
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          validated: 0,
          links_checked: 0,
          broken_links: 0,
          repaired: 0,
          results: [],
          timestamp: new Date().toISOString()
        } as LinkValidatorResponse),
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

    // Get all published article slugs for validation
    const { data: allPublishedArticles } = await supabase
      .from('articles')
      .select('id, slug, site_id')
      .eq('status', 'published');

    const slugMap: Record<string, Record<string, string>> = {}; // site_id -> slug -> article_id
    if (allPublishedArticles) {
      allPublishedArticles.forEach(article => {
        if (!slugMap[article.site_id]) {
          slugMap[article.site_id] = {};
        }
        slugMap[article.site_id][article.slug] = article.id;
      });
    }

    let linksChecked = 0;
    let brokenLinksCount = 0;
    let repairedCount = 0;
    const results: Array<{
      article_id: string;
      article_title: string;
      broken_links: Array<{url: string, text: string, error: string}>;
    }> = [];

    // Validate each article
    for (const article of articles) {
      const content = article.html_body || article.content || '';
      const isHtml = !!article.html_body;
      const links = extractLinks(content, isHtml);
      const routePath = siteRouteMap[article.site_id] || '/articles';
      
      const brokenLinks: Array<{url: string, text: string, error: string}> = [];
      const validationRecords: Array<{
        article_id: string;
        link_url: string;
        link_text: string;
        target_article_id: string | null;
        is_valid: boolean;
        validation_status: string;
        error_message: string | null;
        last_validated_at: string;
      }> = [];

      for (const link of links) {
        linksChecked++;
        
        // Skip external links
        if (!isInternalLink(link.url)) {
          continue;
        }

        const slug = extractSlugFromUrl(link.url, routePath);
        if (!slug) {
          brokenLinks.push({
            url: link.url,
            text: link.text,
            error: `Invalid URL format for route path ${routePath}`
          });
          validationRecords.push({
            article_id: article.id,
            link_url: link.url,
            link_text: link.text,
            target_article_id: null,
            is_valid: false,
            validation_status: 'broken',
            error_message: `Invalid URL format`,
            last_validated_at: new Date().toISOString()
          });
          brokenLinksCount++;
          continue;
        }

        // Check if article exists
        const targetArticleId = slugMap[article.site_id]?.[slug];
        if (!targetArticleId) {
          brokenLinks.push({
            url: link.url,
            text: link.text,
            error: `Article with slug "${slug}" not found`
          });
          validationRecords.push({
            article_id: article.id,
            link_url: link.url,
            link_text: link.text,
            target_article_id: null,
            is_valid: false,
            validation_status: 'broken',
            error_message: `Article with slug "${slug}" not found`,
            last_validated_at: new Date().toISOString()
          });
          brokenLinksCount++;
        } else {
          // Valid link
          validationRecords.push({
            article_id: article.id,
            link_url: link.url,
            link_text: link.text,
            target_article_id: targetArticleId,
            is_valid: true,
            validation_status: 'valid',
            error_message: null,
            last_validated_at: new Date().toISOString()
          });
        }
      }

      // Upsert validation records
      if (validationRecords.length > 0) {
        for (const record of validationRecords) {
          await supabase
            .from('link_validation_results')
            .upsert({
              article_id: record.article_id,
              link_url: record.link_url,
              link_text: record.link_text,
              target_article_id: record.target_article_id,
              is_valid: record.is_valid,
              validation_status: record.validation_status,
              error_message: record.error_message,
              last_validated_at: record.last_validated_at,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'article_id,link_url'
            });
        }
      }

      if (brokenLinks.length > 0) {
        results.push({
          article_id: article.id,
          article_title: article.title,
          broken_links: brokenLinks
        });
      }
    }

    // If repair is requested, call link-repair function
    if (body.repair && brokenLinksCount > 0) {
      try {
        const repairResponse = await fetch(
          `${supabaseUrl}/functions/v1/link-repair`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              article_id: body.article_id,
              site_id: body.site_id,
              repair_all: body.validate_all
            })
          }
        );

        if (repairResponse.ok) {
          const repairData = await repairResponse.json();
          repairedCount = repairData.repaired || 0;
        }
      } catch (repairError) {
        console.error('Repair failed:', repairError);
      }
    }

    const response: LinkValidatorResponse = {
      success: true,
      validated: articles.length,
      links_checked: linksChecked,
      broken_links: brokenLinksCount,
      repaired: repairedCount,
      results,
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
    console.error('Link Validator Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        validated: 0,
        links_checked: 0,
        broken_links: 0,
        repaired: 0,
        results: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LinkValidatorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});




