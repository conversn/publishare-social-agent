// =====================================================
// SEO GSC Ingest Edge Function
// Purpose: Ingest URLs from GSC API or manual input
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { IngestRequest, ApiResponse } from '../seo-shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IngestResult {
  alert_id: string;
  urls_added: number;
  urls_skipped: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: IngestRequest = await req.json();

    // Validate request
    if (!payload.site_id || !payload.issue_type || !payload.urls) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing required fields: site_id, issue_type, urls',
        },
        400
      );
    }

    if (!Array.isArray(payload.urls) || payload.urls.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: 'urls must be a non-empty array',
        },
        400
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📥 Ingesting ${payload.urls.length} URLs for ${payload.site_id}`);

    // Create alert record
    const { data: alert, error: alertError } = await supabase
      .from('seo_alerts')
      .insert({
        site_id: payload.site_id,
        source: payload.source || 'manual',
        issue_type: payload.issue_type,
        detected_at: new Date().toISOString(),
        raw_payload: payload.raw_payload || null,
        url_count: 0, // Will be updated by trigger
      })
      .select()
      .single();

    if (alertError) {
      console.error('Failed to create alert:', alertError);
      return jsonResponse(
        {
          success: false,
          error: `Failed to create alert: ${alertError.message}`,
        },
        500
      );
    }

    console.log(`✅ Created alert ${alert.id}`);

    // Insert affected URLs (batch insert with conflict handling)
    const urlRecords = payload.urls.map((url) => ({
      alert_id: alert.id,
      url: normalizeUrl(url),
      status: 'pending' as const,
    }));

    const { data: insertedUrls, error: urlError } = await supabase
      .from('seo_affected_urls')
      .upsert(urlRecords, {
        onConflict: 'alert_id,url',
        ignoreDuplicates: true,
      })
      .select();

    if (urlError) {
      console.error('Failed to insert URLs:', urlError);
      return jsonResponse(
        {
          success: false,
          error: `Failed to insert URLs: ${urlError.message}`,
        },
        500
      );
    }

    const urlsAdded = insertedUrls?.length || 0;
    const urlsSkipped = payload.urls.length - urlsAdded;

    console.log(`✅ Inserted ${urlsAdded} URLs, skipped ${urlsSkipped} duplicates`);

    const result: IngestResult = {
      alert_id: alert.id,
      urls_added: urlsAdded,
      urls_skipped: urlsSkipped,
    };

    return jsonResponse<IngestResult>({
      success: true,
      data: result,
      metadata: {
        site_id: payload.site_id,
        issue_type: payload.issue_type,
        source: payload.source || 'manual',
      },
    });
  } catch (error) {
    console.error('❌ Ingest error:', error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =====================================================
// Helper Functions
// =====================================================

function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Normalize: lowercase hostname, remove fragment, sort params (optional)
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url; // Return as-is if invalid
  }
}

// =====================================================
// GSC API Integration (Phase 3)
// =====================================================

export async function fetchGSCIssues(
  siteUrl: string,
  accessToken: string
): Promise<{ issueType: string; affectedUrls: string[] }[]> {
  // GSC API endpoint for indexing issues
  const apiUrl = `https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`;

  // Note: This is a simplified example. Full GSC integration requires:
  // 1. OAuth flow to get access token
  // 2. Token refresh logic
  // 3. Pagination for large result sets
  // 4. Rate limiting
  // 5. Error handling

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteUrl,
      inspectionUrl: siteUrl, // Example - would iterate through URLs
    }),
  });

  if (!response.ok) {
    throw new Error(`GSC API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform GSC response to our format
  // This is a placeholder - actual implementation depends on GSC API response structure
  return [
    {
      issueType: 'alternate_with_proper_canonical',
      affectedUrls: [],
    },
  ];
}

// =====================================================
// Scheduled Cron Handler (for automated ingestion)
// =====================================================

// To use this as a cron job, deploy with:
// supabase functions deploy seo-gsc-ingest --schedule="0 2 * * *"
// This runs daily at 2 AM UTC

export async function scheduledIngest() {
  console.log('🕐 Running scheduled GSC ingest...');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all sites with GSC credentials
  const { data: credentials } = await supabase
    .from('seo_gsc_credentials')
    .select('*');

  if (!credentials || credentials.length === 0) {
    console.log('No GSC credentials found');
    return;
  }

  // Process each site
  for (const cred of credentials) {
    try {
      console.log(`Processing site: ${cred.site_id}`);

      // Check if token needs refresh
      const tokenExpiry = new Date(cred.token_expires_at);
      if (tokenExpiry < new Date()) {
        console.log('Token expired, refreshing...');
        // TODO: Implement token refresh
      }

      // Fetch issues from GSC
      const issues = await fetchGSCIssues(cred.site_url, cred.access_token);

      // Ingest each issue type
      for (const issue of issues) {
        if (issue.affectedUrls.length === 0) continue;

        // Create ingest request
        const ingestPayload: IngestRequest = {
          site_id: cred.site_id,
          source: 'cron',
          issue_type: issue.issueType,
          urls: issue.affectedUrls,
        };

        console.log(`Ingesting ${issue.affectedUrls.length} URLs for ${issue.issueType}`);
        // Process via same logic as manual ingest
      }

      // Update last_used_at
      await supabase
        .from('seo_gsc_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', cred.id);
    } catch (error) {
      console.error(`Failed to process site ${cred.site_id}:`, error);
    }
  }

  console.log('✅ Scheduled ingest complete');
}



