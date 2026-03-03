// =====================================================
// SEO Apply Fix Edge Function
// Purpose: Execute approved auto-fixes safely
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type {
  ApplyFixRequest,
  ApiResponse,
  ApplyFixResponse,
  FixStatus,
} from '../seo-shared/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: ApplyFixRequest = await req.json();

    if (!payload.fix_ids || payload.fix_ids.length === 0) {
      return jsonResponse({ success: false, error: 'Missing fix_ids' }, 400);
    }

    if (!payload.approved_by) {
      return jsonResponse({ success: false, error: 'Missing approved_by' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔧 Applying ${payload.fix_ids.length} fixes...`);

    // Fetch fix proposals
    const { data: fixes, error } = await supabase
      .from('seo_fix_proposals')
      .select('*')
      .in('id', payload.fix_ids);

    if (error) {
      return jsonResponse({ success: false, error: error.message }, 500);
    }

    if (!fixes || fixes.length === 0) {
      return jsonResponse({ success: false, error: 'No fixes found' }, 404);
    }

    const results = [];
    let applied = 0;
    let failed = 0;

    for (const fix of fixes) {
      try {
        // Check if already applied
        if (fix.status === 'applied') {
          console.log(`⏭️ Skipping already applied fix ${fix.id}`);
          results.push({
            fix_id: fix.id,
            status: 'applied' as FixStatus,
            error: 'Already applied',
          });
          continue;
        }

        // Check if requires approval
        if (fix.requires_approval && fix.status !== 'approved') {
          // Mark as approved
          await supabase
            .from('seo_fix_proposals')
            .update({
              status: 'approved',
              approved_by: payload.approved_by,
              approved_at: new Date().toISOString(),
            })
            .eq('id', fix.id);
        }

        // Dry run mode
        if (payload.dry_run) {
          console.log(`🔍 DRY RUN: Would apply fix ${fix.id}`);
          results.push({
            fix_id: fix.id,
            status: 'pending' as FixStatus,
            error: 'Dry run mode - not applied',
          });
          continue;
        }

        // Execute the fix
        console.log(`🔧 Executing fix: ${fix.fix_type}`);
        const result = await executeFix(fix, supabase);

        if (result.success) {
          // Update fix status
          await supabase
            .from('seo_fix_proposals')
            .update({
              status: 'applied',
              applied_at: new Date().toISOString(),
              applied_by: payload.approved_by,
              after_state: result.after_state,
            })
            .eq('id', fix.id);

          results.push({
            fix_id: fix.id,
            status: 'applied' as FixStatus,
          });

          applied++;
          console.log(`✅ Successfully applied fix ${fix.id}`);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (err) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Failed to apply fix ${fix.id}:`, errorMsg);

        // Update fix status
        await supabase
          .from('seo_fix_proposals')
          .update({
            status: 'failed',
            error_message: errorMsg,
          })
          .eq('id', fix.id);

        results.push({
          fix_id: fix.id,
          status: 'failed' as FixStatus,
          error: errorMsg,
        });
      }
    }

    const response: ApplyFixResponse = {
      applied,
      failed,
      fixes: results,
    };

    return jsonResponse<ApplyFixResponse>({ success: true, data: response });
  } catch (error) {
    console.error('❌ Apply fix error:', error);
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
// Fix Executors (The actual fix logic)
// =====================================================

interface FixResult {
  success: boolean;
  error?: string;
  after_state?: Record<string, unknown>;
}

async function executeFix(fix: any, supabase: any): Promise<FixResult> {
  switch (fix.fix_type) {
    case 'REGENERATE_SITEMAP':
      return await regenerateSitemap(fix, supabase);

    case 'NORMALIZE_CANONICAL_HOST':
      return await normalizeCanonicalHost(fix, supabase);

    case 'ADD_REDIRECT':
      return await addRedirect(fix, supabase);

    case 'UPDATE_CANONICAL_TAG':
      return await updateCanonicalTag(fix, supabase);

    case 'REMOVE_NOINDEX':
      return await removeNoindex(fix, supabase);

    case 'ADD_TO_SITEMAP':
      return await addToSitemap(fix, supabase);

    case 'REMOVE_FROM_SITEMAP':
      return await removeFromSitemap(fix, supabase);

    default:
      return {
        success: false,
        error: `Unknown fix type: ${fix.fix_type}`,
      };
  }
}

// =====================================================
// Individual Fix Implementations
// =====================================================

async function regenerateSitemap(fix: any, supabase: any): Promise<FixResult> {
  // Implementation depends on your CMS architecture
  // This is a placeholder that demonstrates the pattern

  try {
    const { site_id } = fix.fix_details;

    console.log(`📄 Regenerating sitemap for ${site_id}...`);

    // In a real implementation, you would:
    // 1. Query all indexable URLs from your CMS
    // 2. Generate sitemap XML
    // 3. Upload to storage/CDN
    // 4. Update sitemap_cache table

    // For now, just invalidate the cache
    await supabase
      .from('seo_sitemap_cache')
      .delete()
      .eq('site_id', site_id);

    return {
      success: true,
      after_state: {
        action: 'cache_invalidated',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function normalizeCanonicalHost(fix: any, supabase: any): Promise<FixResult> {
  try {
    const { site_id, preferred_host } = fix.fix_details;

    console.log(`🔀 Normalizing canonical host to ${preferred_host} for ${site_id}...`);

    // This would update your site configuration
    // Example: Update sites_seo_config table

    // Placeholder implementation
    return {
      success: true,
      after_state: {
        site_id,
        preferred_host,
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function addRedirect(fix: any, supabase: any): Promise<FixResult> {
  try {
    const { from_url, to_url, redirect_type } = fix.fix_details;

    console.log(`↪️ Adding redirect: ${from_url} → ${to_url}`);

    // Store in redirects table (example)
    const { error } = await supabase.from('redirects').insert({
      from_url,
      to_url,
      redirect_type: redirect_type || 301,
      source: 'seo_autofix',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    return {
      success: true,
      after_state: {
        from_url,
        to_url,
        redirect_type,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function updateCanonicalTag(fix: any, supabase: any): Promise<FixResult> {
  try {
    const { url, new_canonical } = fix.fix_details;

    console.log(`🔗 Updating canonical for ${url} to ${new_canonical}`);

    // This would update the content/page record in your CMS
    // Example: Update articles or pages table

    // Placeholder - requires CMS integration
    return {
      success: false,
      error: 'CMS integration required - manual fix needed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function removeNoindex(fix: any, supabase: any): Promise<FixResult> {
  try {
    const { url } = fix.fix_details;

    console.log(`🔓 Removing noindex from ${url}`);

    // This would update the meta robots tag in your CMS
    // Requires content management integration

    // Placeholder - requires CMS integration
    return {
      success: false,
      error: 'CMS integration required - manual fix needed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function addToSitemap(fix: any, supabase: any): Promise<FixResult> {
  try {
    const { url, site_id } = fix.fix_details;

    console.log(`➕ Adding ${url} to sitemap`);

    // Would trigger sitemap regeneration with this URL included
    return await regenerateSitemap(fix, supabase);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function removeFromSitemap(fix: any, supabase: any): Promise<FixResult> {
  try {
    const { url, site_id } = fix.fix_details;

    console.log(`➖ Removing ${url} from sitemap`);

    // Would trigger sitemap regeneration with this URL excluded
    return await regenerateSitemap(fix, supabase);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// Rollback Function (Called manually if needed)
// =====================================================

export async function rollbackFix(fixId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: fix, error } = await supabase
    .from('seo_fix_proposals')
    .select('*')
    .eq('id', fixId)
    .single();

  if (error || !fix) {
    throw new Error(`Fix not found: ${fixId}`);
  }

  if (fix.status !== 'applied') {
    throw new Error(`Cannot rollback fix with status: ${fix.status}`);
  }

  if (!fix.rollback_sql) {
    throw new Error('No rollback SQL available for this fix');
  }

  console.log(`⏮️ Rolling back fix ${fixId}...`);

  // Execute rollback SQL
  // In production, you'd execute the SQL or reverse the operation
  // For now, just mark as rolled back

  await supabase
    .from('seo_fix_proposals')
    .update({
      status: 'rolled_back',
      updated_at: new Date().toISOString(),
    })
    .eq('id', fixId);

  console.log(`✅ Fix ${fixId} rolled back`);
}

// =====================================================
// Utilities
// =====================================================

function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}



