/**
 * Article Metadata Enhancer
 * 
 * Post-processing function to generate missing metadata for existing articles.
 * Fixes:
 * - html_body (converts markdown to HTML)
 * - breadcrumb_title
 * - canonical_url
 * - focus_keyword
 * - og_metadata (og_title, og_description, og_image)
 * - twitter_metadata (twitter_title, twitter_description, twitter_image)
 * - featured_image_alt
 * 
 * Usage:
 * POST /functions/v1/article-metadata-enhancer
 * {
 *   article_id?: string,  // Process single article
 *   site_id?: string,     // Process all articles for site
 *   limit?: number        // Max articles to process (default: 100)
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generate comprehensive SEO and social media metadata
 */
function generateMetadata(params: {
  title: string;
  excerpt: string;
  slug: string;
  site_id?: string;
  focus_keyword?: string;
  featured_image_url?: string;
}): {
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
} {
  // Generate breadcrumb title (shorter version, 40-60 chars)
  const breadcrumbTitle = params.title.length > 60 
    ? params.title.substring(0, 57) + '...'
    : params.title;

  // Generate canonical URL
  const siteDomain = params.site_id === 'rateroots' 
    ? 'https://rateroots.com'
    : params.site_id === 'seniorsimple'
    ? 'https://seniorsimple.org'
    : params.site_id === 'mortgagesimple'
    ? 'https://mortgagesimple.org'
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

async function enhanceArticle(supabase: any, supabaseUrl: string, supabaseKey: string, article: any): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = [];
  const updates: any = {};
  let updatedCount = 0;

  try {
    // Generate metadata
    const metadata = generateMetadata({
      title: article.title,
      excerpt: article.excerpt || article.title,
      slug: article.slug || article.id,
      site_id: article.site_id,
      focus_keyword: article.focus_keyword || undefined,
      featured_image_url: article.featured_image_url || undefined
    });

    // Update missing metadata fields
    if (!article.breadcrumb_title) {
      updates.breadcrumb_title = metadata.breadcrumb_title;
      updatedCount++;
    }
    if (!article.canonical_url) {
      updates.canonical_url = metadata.canonical_url;
      updatedCount++;
    }
    if (!article.focus_keyword) {
      updates.focus_keyword = metadata.focus_keyword;
      updatedCount++;
    }
    if (!article.og_title) {
      updates.og_title = metadata.og_title;
      updatedCount++;
    }
    if (!article.og_description) {
      updates.og_description = metadata.og_description;
      updatedCount++;
    }
    if (!article.og_image && article.featured_image_url) {
      updates.og_image = metadata.og_image;
      updatedCount++;
    }
    if (!article.twitter_title) {
      updates.twitter_title = metadata.twitter_title;
      updatedCount++;
    }
    if (!article.twitter_description) {
      updates.twitter_description = metadata.twitter_description;
      updatedCount++;
    }
    if (!article.twitter_image && article.featured_image_url) {
      updates.twitter_image = metadata.twitter_image;
      updatedCount++;
    }
    if (!article.featured_image_alt && article.featured_image_url) {
      updates.featured_image_alt = metadata.featured_image_alt;
      updatedCount++;
    }

    // Convert markdown to HTML if html_body is missing
    if (!article.html_body && article.content) {
      try {
        const htmlResponse = await fetch(
          `${supabaseUrl}/functions/v1/markdown-to-html`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              markdown: article.content,
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
            updates.html_body = htmlBody;
            updatedCount++;
          }
        } else {
          errors.push(`HTML conversion failed: ${htmlResponse.status}`);
        }
      } catch (error) {
        errors.push(`HTML conversion error: ${error.message}`);
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('articles')
        .update(updates)
        .eq('id', article.id);

      if (updateError) {
        errors.push(`Database update failed: ${updateError.message}`);
        return { success: false, updated: 0, errors };
      }
    }

    return { success: true, updated: updatedCount, errors };

  } catch (error) {
    errors.push(`Enhancement failed: ${error.message}`);
    return { success: false, updated: 0, errors };
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
    const body = await req.json().catch(() => ({}));
    
    const articleId = body.article_id;
    const siteId = body.site_id;
    const limit = body.limit || 100;

    let articles: any[] = [];

    if (articleId) {
      // Process single article
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch article: ${error.message}`);
      }

      if (data) {
        articles = [data];
      }
    } else if (siteId) {
      // Process all articles for site
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('site_id', siteId)
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      articles = data || [];
    } else {
      // Process all articles (with limit)
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch articles: ${error.message}`);
      }

      articles = data || [];
    }

    console.log(`📝 Processing ${articles.length} articles...`);

    const results = [];
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const article of articles) {
      const result = await enhanceArticle(supabase, supabaseUrl, supabaseKey, article);
      results.push({
        article_id: article.id,
        title: article.title,
        ...result
      });

      if (result.success) {
        totalUpdated += result.updated;
      } else {
        totalErrors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: articles.length,
        total_updated_fields: totalUpdated,
        total_errors: totalErrors,
        results: results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});




