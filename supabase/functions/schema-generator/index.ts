/**
 * Supabase Edge Function: Schema Generator
 * 
 * Generates schema.org JSON-LD markup for articles.
 * 
 * Request Body:
 * {
 *   article_id: string (required)
 *   site_id?: string (optional)
 *   schema_types?: string[] (optional) - ['Article', 'HowTo', 'FAQ', 'Speakable']
 *   regenerate?: boolean (optional, default: false)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   schemas: JSONLD[]
 *   speakable_schema?: JSONLD
 *   validated: boolean
 *   timestamp: string
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SchemaGeneratorRequest {
  article_id: string;
  site_id?: string;
  schema_types?: string[];
  regenerate?: boolean;
  // LocalBusiness parameters (for local pages)
  local_business_data?: {
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    phone?: string;
    service_areas?: string[];
    business_hours?: any;
    price_range?: string;
  };
}

interface SchemaGeneratorResponse {
  success: boolean;
  schemas: any[];
  speakable_schema?: any;
  validated: boolean;
  timestamp: string;
  error?: string;
}

function detectSchemaType(content: string, aeoContentType?: string, pageType?: string): string {
  // Check if this is a local page
  if (pageType === 'local_page') {
    return 'LocalBusiness';
  }
  
  // Use AEO content type if available
  if (aeoContentType === 'how-to') return 'HowTo';
  if (aeoContentType === 'definition') return 'Article';
  if (aeoContentType === 'comparison') return 'Article';
  
  // Auto-detect from content
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('step') && lowerContent.includes('how to')) {
    return 'HowTo';
  }
  if (lowerContent.includes('question') && lowerContent.includes('answer')) {
    return 'FAQPage';
  }
  
  return 'Article';
}

function generateArticleSchema(article: any, siteConfig?: any): any {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.aeo_summary || article.excerpt || article.meta_description,
    datePublished: article.created_at || new Date().toISOString(),
    dateModified: article.updated_at || article.created_at || new Date().toISOString(),
  };
  
  if (article.featured_image_url) {
    schema.image = article.featured_image_url;
  }
  
  if (article.author_id) {
    schema.author = {
      '@type': 'Person',
      name: 'Author' // Would fetch from authors table in production
    };
  }
  
  // Add publisher/organization if site config available
  if (siteConfig) {
    schema.publisher = {
      '@type': 'Organization',
      name: siteConfig.name || siteConfig.site_id,
      logo: siteConfig.logo_url ? {
        '@type': 'ImageObject',
        url: siteConfig.logo_url
      } : undefined
    };
  }
  
  return schema;
}

function generateHowToSchema(article: any): any {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: article.title,
    description: article.aeo_summary || article.excerpt,
  };
  
  // Extract steps from content (simplified - would be more sophisticated in production)
  const content = article.content || '';
  const stepMatches = content.match(/^\d+\.\s+(.+)$/gm);
  if (stepMatches) {
    schema.step = stepMatches.map((match, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: match.replace(/^\d+\.\s+/, '')
    }));
  }
  
  return schema;
}

function generateLocalBusinessSchema(
  article: any,
  localBusinessData?: {
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    phone?: string;
    service_areas?: string[];
    business_hours?: any;
    price_range?: string;
  }
): any {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: localBusinessData?.name || article.title,
    description: article.aeo_summary || article.excerpt || article.meta_description,
  };
  
  // Add address if provided
  if (localBusinessData?.address) {
    const addr = localBusinessData.address;
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: addr.street || '',
      addressLocality: addr.city || article.city || '',
      addressRegion: addr.state || article.state || '',
      postalCode: addr.zip || '',
      addressCountry: 'US'
    };
  } else if (article.city && article.state) {
    // Use article city/state if address not provided
    schema.address = {
      '@type': 'PostalAddress',
      addressLocality: article.city,
      addressRegion: article.state,
      addressCountry: 'US'
    };
  }
  
  // Add phone number
  if (localBusinessData?.phone || article.phone_number) {
    schema.telephone = localBusinessData?.phone || article.phone_number;
  }
  
  // Add service areas
  if (localBusinessData?.service_areas && localBusinessData.service_areas.length > 0) {
    schema.areaServed = localBusinessData.service_areas.map((area: string) => ({
      '@type': 'City',
      name: area
    }));
  } else if (article.service_areas && article.service_areas.length > 0) {
    schema.areaServed = article.service_areas.map((area: string) => ({
      '@type': 'City',
      name: area
    }));
  }
  
  // Add business hours if provided
  if (localBusinessData?.business_hours) {
    schema.openingHoursSpecification = localBusinessData.business_hours;
  }
  
  // Add price range if provided
  if (localBusinessData?.price_range) {
    schema.priceRange = localBusinessData.price_range;
  }
  
  // Add URL (canonical URL or article URL)
  if (article.canonical_url) {
    schema.url = article.canonical_url;
  }
  
  // Add image if available
  if (article.featured_image_url) {
    schema.image = article.featured_image_url;
  }
  
  return schema;
}

function generateServiceAreaSchema(serviceAreas: string[]): any {
  if (!serviceAreas || serviceAreas.length === 0) {
    return null;
  }
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    areaServed: serviceAreas.map((area: string) => ({
      '@type': 'City',
      name: area
    }))
  };
}

function generateSpeakableSchema(article: any): any {
  const speakableText = article.speakable_summary || article.aeo_summary || article.excerpt || '';
  
  if (!speakableText || speakableText.length < 100) {
    return null;
  }
  
  return {
    '@context': 'https://schema.org',
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.prose > p:first-of-type'],
    xpath: ['/html/head/title', '/html/body/h1']
  };
}

async function validateSchema(schema: any): Promise<boolean> {
  // Basic validation
  if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
    return false;
  }
  
  if (!schema['@type']) {
    return false;
  }
  
  // Additional validation could be added here
  // In production, could call schema.org validator API
  
  return true;
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
    const body: SchemaGeneratorRequest = await req.json();
    
    if (!body.article_id) {
      return new Response(
        JSON.stringify({
          success: false,
          schemas: [],
          validated: false,
          timestamp: new Date().toISOString(),
          error: 'article_id is required'
        } as SchemaGeneratorResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Fetch article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', body.article_id)
      .single();
    
    if (articleError || !article) {
      return new Response(
        JSON.stringify({
          success: false,
          schemas: [],
          validated: false,
          timestamp: new Date().toISOString(),
          error: `Article not found: ${articleError?.message || 'Unknown error'}`
        } as SchemaGeneratorResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Check if schema already exists and regenerate flag
    if (!body.regenerate && article.schema_markup) {
      return new Response(
        JSON.stringify({
          success: true,
          schemas: Array.isArray(article.schema_markup) ? article.schema_markup : [article.schema_markup],
          validated: article.schema_validated || false,
          timestamp: new Date().toISOString()
        } as SchemaGeneratorResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Fetch site configuration if site_id provided
    let siteConfig = null;
    if (body.site_id || article.site_id) {
      const siteId = body.site_id || article.site_id;
      const { data: site } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();
      
      siteConfig = site;
    }
    
    // Determine schema types to generate
    const requestedTypes = body.schema_types || [];
    const detectedType = detectSchemaType(
      article.content || '', 
      article.aeo_content_type,
      article.page_type
    );
    const schemaTypes = requestedTypes.length > 0 ? requestedTypes : [detectedType];
    
    // Generate schemas
    const schemas: any[] = [];
    
    for (const schemaType of schemaTypes) {
      let schema: any;
      
      switch (schemaType) {
        case 'LocalBusiness':
          schema = generateLocalBusinessSchema(article, body.local_business_data);
          break;
        case 'HowTo':
          schema = generateHowToSchema(article);
          break;
        case 'Article':
        default:
          schema = generateArticleSchema(article, siteConfig);
          break;
      }
      
      schemas.push(schema);
    }
    
    // Generate ServiceArea schema if this is a local page with service areas
    if (article.page_type === 'local_page' && article.service_areas && article.service_areas.length > 0) {
      const serviceAreaSchema = generateServiceAreaSchema(article.service_areas);
      if (serviceAreaSchema) {
        schemas.push(serviceAreaSchema);
      }
    }
    
    // Generate speakable schema
    const speakableSchema = generateSpeakableSchema(article);
    if (speakableSchema) {
      schemas.push(speakableSchema);
    }
    
    // Validate schemas
    let allValid = true;
    for (const schema of schemas) {
      const isValid = await validateSchema(schema);
      if (!isValid) {
        allValid = false;
        break;
      }
    }
    
    // Save to database
    const schemaToSave = schemas.length === 1 ? schemas[0] : schemas;
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        schema_markup: schemaToSave,
        schema_validated: allValid
      })
      .eq('id', body.article_id);
    
    if (updateError) {
      console.error('Error saving schema to database:', updateError);
    }
    
    const response: SchemaGeneratorResponse = {
      success: true,
      schemas,
      speakable_schema: speakableSchema || undefined,
      validated: allValid,
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
    console.error('Schema Generator Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        schemas: [],
        validated: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      } as SchemaGeneratorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


