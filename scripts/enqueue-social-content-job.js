#!/usr/bin/env node

/**
 * Enqueue a Phase 1 social content job.
 *
 * Example:
 * node scripts/enqueue-social-content-job.js \
 *   --site callready \
 *   --profile "Keenan Shaw" \
 *   --topic "AI outbound playbooks" \
 *   --platform linkedin \
 *   --requires-approval true \
 *   --auto-publish false
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function parseBool(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const siteId = getArg('site');
if (!siteId) {
  console.error('❌ Missing required --site');
  process.exit(1);
}

const profileName = getArg('profile', null);
const topic = getArg('topic', 'growth systems');
const platform = getArg('platform', null);
const articleId = getArg('article-id', null);
const allowNoArticle = parseBool(getArg('allow-no-article', null), false);
const includeImage = parseBool(getArg('include-image', null), true);
const requiresApproval = parseBool(getArg('requires-approval', null), true);
const autoPublish = parseBool(getArg('auto-publish', null), false);
const priority = Number(getArg('priority', 100));
const idempotencyKey = getArg('idempotency-key', `social:${siteId}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`);

if (!articleId && !allowNoArticle) {
  console.error('❌ Missing required --article-id (or set --allow-no-article true for non-publish tests)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const payload = {
    topic,
    auto_publish: autoPublish,
    include_image: includeImage,
    ...(platform ? { platform: String(platform).toLowerCase() } : {}),
    ...(articleId ? { article_id: articleId } : {}),
  };

  const insertBody = {
    idempotency_key: idempotencyKey,
    site_id: siteId,
    profile_name: profileName,
    job_type: 'social_post',
    status: 'queued',
    requires_approval: requiresApproval,
    approval_status: requiresApproval ? 'pending' : 'not_required',
    priority,
    payload,
    scheduled_for: new Date().toISOString(),
    available_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('content_jobs')
    .insert(insertBody)
    .select('id, site_id, profile_name, status, requires_approval, approval_status, idempotency_key, created_at')
    .single();

  if (error) {
    console.error(`❌ enqueue failed: ${error.message}`);
    process.exit(1);
  }

  console.log('✅ enqueued content job');
  console.log(data);
}

run().catch((err) => {
  console.error(`💥 enqueue crashed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
