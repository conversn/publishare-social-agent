#!/usr/bin/env node

/**
 * Approve a queued content job for publish stage.
 *
 * Usage:
 *   node scripts/approve-content-job.js --job <job_id>
 */

const { createClient } = require('@supabase/supabase-js');

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

const jobId = getArg('job');
if (!jobId) {
  console.error('❌ Missing --job <job_id>');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE URL/key env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('approve_content_job', {
    p_job_id: jobId,
    p_actor: 'manual-review',
  });
  if (error) {
    console.error(`❌ approve failed: ${error.message}`);
    process.exit(1);
  }
  const { error: auditError } = await supabase.rpc('log_content_review_action', {
    p_job_id: jobId,
    p_action: 'approve',
    p_actor: 'manual-review',
    p_actor_user_id: null,
    p_channel: 'cli',
    p_reason: 'Approved from CLI script',
    p_metadata: { source: 'scripts/approve-content-job.js' },
  });
  if (auditError) {
    console.warn(`⚠️ review audit log failed: ${auditError.message}`);
  }
  console.log('✅ approved');
  console.log({
    id: data.id,
    site_id: data.site_id,
    status: data.status,
    approval_status: data.approval_status,
    available_at: data.available_at,
  });
}

run().catch((err) => {
  console.error(`💥 approve crashed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
