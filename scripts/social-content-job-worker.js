#!/usr/bin/env node

/**
 * Phase 1 social content worker (beta scaffold)
 *
 * Flow:
 * 1) claim_next_content_job RPC
 * 2) prepare_context
 * 3) generate_copy
 * 4) generate_image (optional)
 * 5) policy_gate
 * 6) publish (stub)
 * 7) finalize_content_job RPC
 *
 * This worker is intentionally conservative:
 * - never posts directly to social APIs
 * - writes artifacts/events for auditing
 * - uses retries + backoff via content_jobs
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const DEFAULT_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const LLM_BASE_URL = (process.env.SOCIAL_LLM_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/$/, '');
const LLM_API_KEY =
  process.env.SOCIAL_LLM_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.OPEN_AI_PUBLISHARE_KEY ||
  '';
const LLM_MODEL = process.env.SOCIAL_LLM_MODEL || 'llama3.1:8b';
const OPENAI_FALLBACK_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPEN_AI_PUBLISHARE_KEY ||
  '';
const OPENAI_FALLBACK_MODEL = process.env.SOCIAL_OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';
const ENABLE_OPENAI_FALLBACK = !['0', 'false', 'no'].includes(
  String(process.env.SOCIAL_ENABLE_OPENAI_FALLBACK || 'true').toLowerCase()
);
const LLM_TIMEOUT_MS = Number(process.env.SOCIAL_LLM_TIMEOUT_MS || 120000);
const LLM_MAX_TOKENS = Number(process.env.SOCIAL_LLM_MAX_TOKENS || 260);
const LLM_MAX_ATTEMPTS = Number(process.env.SOCIAL_LLM_MAX_ATTEMPTS || 1);
const LLM_CONTEXT_MAX_CHARS = Number(process.env.SOCIAL_LLM_CONTEXT_MAX_CHARS || 700);
const PUBLISH_TIMEOUT_MS = Number(process.env.SOCIAL_PUBLISH_TIMEOUT_MS || 45000);
const REQUIRE_AI_COPY = !['0', 'false', 'no'].includes(
  String(process.env.SOCIAL_REQUIRE_AI_COPY || 'true').toLowerCase()
);
const GENERIC_BANNED_PHRASES = [
  'most teams overcomplicate',
  'if you want predictable growth',
  'take control of your',
  'are you ready to elevate',
  'without the overwhelm',
];
const REVIEW_SLACK_WEBHOOK_URL =
  process.env.SOCIAL_REVIEW_SLACK_WEBHOOK_URL ||
  process.env.SLACK_DB_WEBOOK_URL ||
  process.env.SLACK_WEBHOOK_URL ||
  process.env.SLACK_RPM_WEBHOOK_URL ||
  process.env.SLACK_LEADS_WEBHOOK_URL ||
  '';
const AUDIT_SLACK_WEBHOOK_URL =
  process.env.SOCIAL_AUDIT_SLACK_WEBHOOK_URL ||
  REVIEW_SLACK_WEBHOOK_URL;
const ENABLE_AUDIT_SLACK_NOTIFICATIONS = !['0', 'false', 'no'].includes(
  String(process.env.SOCIAL_ENABLE_AUDIT_SLACK_NOTIFICATIONS || 'true').toLowerCase()
);
const WORKER_NAME = process.env.CONTENT_WORKER_NAME || 'social-beta-worker';
const POLL_INTERVAL_MS = Number(process.env.CONTENT_WORKER_POLL_MS || 4000);
const LOCK_MINUTES = Number(process.env.CONTENT_WORKER_LOCK_MINUTES || 3);
const ONCE = process.argv.includes('--once');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!DEFAULT_SUPABASE_URL) fail('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
if (!DEFAULT_SERVICE_KEY) fail('Missing SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SERVICE_KEY);

function nowIso() {
  return new Date().toISOString();
}

function hashJson(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function recordEvent(jobId, type, stage, severity, message, payload = {}) {
  const { error } = await supabase.rpc('record_content_event', {
    p_job_id: jobId,
    p_event_type: type,
    p_stage: stage || null,
    p_severity: severity || 'info',
    p_message: message || null,
    p_payload: payload,
    p_actor: WORKER_NAME,
  });
  if (error) {
    console.error(`⚠️ event log failed for job ${jobId}: ${error.message}`);
  }
}

async function saveArtifact(job, stage, artifactType, content) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: latest, error: latestError } = await supabase
      .from('content_artifacts')
      .select('version')
      .eq('job_id', job.id)
      .eq('stage', stage)
      .eq('artifact_type', artifactType)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      throw new Error(`artifact_version_lookup_failed(${stage}/${artifactType}): ${latestError.message}`);
    }

    const payload = {
      job_id: job.id,
      site_id: job.site_id,
      stage,
      artifact_type: artifactType,
      version: (latest?.version || 0) + 1,
      content_hash: hashJson(content),
      content,
      created_at: nowIso(),
    };

    const { error } = await supabase.from('content_artifacts').insert(payload);
    if (!error) return;

    const message = String(error.message || '');
    const isUniqueCollision = message.includes('duplicate key value violates unique constraint');
    if (!isUniqueCollision || attempt === 2) {
      throw new Error(`artifact_insert_failed(${stage}/${artifactType}): ${error.message}`);
    }
  }
}

async function logPublishAttempt(job, payload) {
  try {
    await supabase.rpc('log_content_publish_attempt', {
      p_job_id: job.id,
      p_platform: String(payload.platform || 'unknown'),
      p_post_intent: String(payload.post_intent || 'native'),
      p_success: !!payload.success,
      p_http_status: payload.http_status ?? null,
      p_remote_post_id: payload.remote_post_id ?? null,
      p_remote_payload: payload.remote_payload || {},
      p_error_message: payload.error_message ?? null,
      p_attempt_no: Number(job.attempt_count || 1),
    });
  } catch (_) {
    // best effort audit logging
  }
}

async function notifyAuditSlack(title, lines = []) {
  if (!ENABLE_AUDIT_SLACK_NOTIFICATIONS || !AUDIT_SLACK_WEBHOOK_URL) return;
  const text = [title, ...lines].filter(Boolean).join('\n');
  try {
    await fetch(AUDIT_SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (_) {
    // best effort
  }
}

function truncateLine(value, max = 220) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

function resolvePublishTitle(topic, fallback = 'Untitled') {
  const v = String(topic || '').trim();
  return v || fallback;
}

function buildPublishAuditLines(job, context, copyText, publish = {}) {
  const payload = job.payload || {};
  const postIntent = String(payload.post_intent || 'native').toLowerCase();
  const topic = resolvePublishTitle(
    payload.topic || payload.title || payload.headline || payload.article_title || payload.subject,
    'Untitled social post'
  );
  const request = publish.request || {};
  const result = publish.result || {};
  const platformResults = Array.isArray(result.platform_results) ? result.platform_results : [];
  const requestedPlatforms = Array.isArray(request.platforms) && request.platforms.length > 0
    ? request.platforms
    : (Array.isArray(payload.platforms) ? payload.platforms : []);
  const destinationKey = String(request.destination_channel_key || payload.destination_channel_key || '').trim();
  const destinationId = String(request.destination_channel_id || payload.destination_channel_id || '').trim();
  const profileName = job.profile_name || context.editorial?.profile_name || result?.resolved_editorial_profile || 'N/A';

  const lines = [
    `Site: ${job.site_id}`,
    `Profile: ${profileName}`,
    `Job ID: ${job.id}`,
    `Type: ${postIntent}`,
    `Title: ${truncateLine(topic, 140)}`,
    `Channels: ${requestedPlatforms.length > 0 ? requestedPlatforms.join(', ') : 'auto'}`,
    `Destination Channel Key: ${destinationKey || 'auto'}`,
    `Destination Channel ID: ${destinationId || 'auto'}`,
    `Schedule Hours: ${Number.isFinite(Number(request.schedule_hours)) ? Number(request.schedule_hours) : 'n/a'}`,
  ];

  if (platformResults.length > 0) {
    lines.push('Platform Results:');
    for (const item of platformResults) {
      const platform = String(item?.platform || 'unknown');
      const ok = !!item?.success;
      const scheduledAt = String(item?.scheduled_at || '').trim();
      const remotePostId = String(item?.post_id || '').trim();
      const errorText = String(item?.error || '').trim();
      const delivery = ok
        ? (scheduledAt ? `scheduled at ${scheduledAt}` : 'published')
        : `failed (${errorText || 'unknown error'})`;
      const idSuffix = remotePostId ? ` | post_id=${remotePostId}` : '';
      lines.push(`- ${platform}: ${delivery}${idSuffix}`);
    }
  } else if (result && Object.keys(result).length > 0) {
    lines.push(`Poster Response: ${truncateLine(JSON.stringify(result), 350)}`);
  }

  const preview = truncateLine(copyText, 400);
  if (preview) {
    lines.push(`Post Preview: ${preview}`);
  }

  return lines;
}

async function loadLatestSocialCopy(jobId) {
  const { data, error } = await supabase
    .from('content_artifacts')
    .select('id, version, content, created_at')
    .eq('job_id', jobId)
    .eq('artifact_type', 'social_copy')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`load_latest_social_copy_failed: ${error.message}`);
  }
  const text = String(data?.content?.text || '').trim();
  return text
    ? { text, version: Number(data?.version || 1), artifact_id: data?.id || null, created_at: data?.created_at || null }
    : null;
}

function buildReviewUrl(jobId) {
  const explicit = String(process.env.SOCIAL_REVIEW_BASE_URL || '').trim();
  if (explicit) {
    const normalized = explicit.replace(/\/$/, '');
    if (normalized.includes('{job_id}')) {
      return normalized.replace('{job_id}', jobId);
    }
    return normalized;
  }

  // Fallback to Supabase project root (stable route).
  // Example DEFAULT_SUPABASE_URL: https://<project-ref>.supabase.co
  const match = String(DEFAULT_SUPABASE_URL || '').match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const projectRef = match?.[1];
  if (projectRef) {
    return `https://supabase.com/dashboard/project/${projectRef}/editor?schema=public&table=content_jobs&filter=id:eq:${jobId}`;
  }

  return DEFAULT_SUPABASE_URL || '';
}

function escapeSlack(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function chunkText(text, maxLen) {
  const src = String(text || '');
  if (src.length <= maxLen) return [src];
  const chunks = [];
  let i = 0;
  while (i < src.length) {
    chunks.push(src.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks.slice(0, 8);
}

async function notifyReviewer(job, context, copyText) {
  if (!REVIEW_SLACK_WEBHOOK_URL) {
    await recordEvent(job.id, 'review_notify_skipped', 'publish', 'warn', 'Slack webhook not configured');
    return;
  }

  const reviewUrl = job.review_url || buildReviewUrl(job.id);
  const approveCmd =
    `node scripts/approve-content-job.js --job ${job.id}`;
  const tableFilter = `id = ${job.id}`;
  const sqlJob = `select * from public.content_jobs where id = '${job.id}';`;
  const sqlCopy = `select content->>'text' as post_copy from public.content_artifacts where job_id = '${job.id}' and artifact_type = 'social_copy' order by version desc limit 1;`;
  const persona = context.personas?.[0]?.personas || null;
  const personaName = persona?.display_name || persona?.name || context.editorial?.profile_name || 'Unknown Persona';
  const fullCopy = String(copyText || '').trim();
  const copyChunks = chunkText(fullCopy, 2600);
  const wasTruncated = fullCopy.length > copyChunks.join('').length;
  const copyBlocks = copyChunks.map((chunk, idx) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Post Copy${copyChunks.length > 1 ? ` (${idx + 1}/${copyChunks.length})` : ''}:*\n>${escapeSlack(chunk).replace(/\n/g, '\n>')}`,
    },
  }));
  if (wasTruncated) {
    copyBlocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_Copy truncated in Slack message. Use SQL snippet below to fetch full body._',
        },
      ],
    });
  }
  const actionValue = JSON.stringify({ job_id: job.id, site_id: job.site_id });
  const regenValue = JSON.stringify({ job_id: job.id, site_id: job.site_id, reason: 'Regenerate requested from Slack' });

  const message = {
    text: `Review needed: ${job.site_id} / ${job.profile_name || 'social profile'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'Social Content Approval Required', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Site:*\n${escapeSlack(job.site_id)}` },
          { type: 'mrkdwn', text: `*Profile:*\n${escapeSlack(job.profile_name || 'N/A')}` },
          { type: 'mrkdwn', text: `*Job ID:*\n${escapeSlack(job.id)}` },
          { type: 'mrkdwn', text: `*Persona:*\n${escapeSlack(personaName)}` },
        ],
      },
      ...copyBlocks,
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Review URL:* ${escapeSlack(reviewUrl)}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Table Filter (copy/paste):*\n\`${escapeSlack(tableFilter)}\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*SQL (job row):*\n\`${escapeSlack(sqlJob)}\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*SQL (full post copy):*\n\`${escapeSlack(sqlCopy)}\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Approve Command:*\n\`${escapeSlack(approveCmd)}\``,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            style: 'primary',
            text: { type: 'plain_text', text: 'Approve' },
            action_id: 'social_approve',
            value: actionValue,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Edit & Approve' },
            action_id: 'social_edit_approve',
            value: actionValue,
          },
          {
            type: 'button',
            style: 'danger',
            text: { type: 'plain_text', text: 'Reject' },
            action_id: 'social_reject',
            value: actionValue,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Request Edit' },
            action_id: 'social_request_edit',
            value: actionValue,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Regenerate' },
            action_id: 'social_regenerate',
            value: regenValue,
          },
          {
            type: 'static_select',
            action_id: 'social_regenerate_reason',
            placeholder: { type: 'plain_text', text: 'Regenerate with reason' },
            options: [
              {
                text: { type: 'plain_text', text: 'Too generic' },
                value: JSON.stringify({ job_id: job.id, reason: 'Too generic' }),
              },
              {
                text: { type: 'plain_text', text: 'Wrong tone' },
                value: JSON.stringify({ job_id: job.id, reason: 'Wrong tone' }),
              },
              {
                text: { type: 'plain_text', text: 'Too long or dense' },
                value: JSON.stringify({ job_id: job.id, reason: 'Too long or dense' }),
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch(REVIEW_SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`slack_notify_failed(${response.status}): ${body.slice(0, 500)}`);
  }

  const { error } = await supabase
    .from('content_jobs')
    .update({
      notified_at: nowIso(),
      reviewer_channel: 'slack',
      review_url: reviewUrl,
      updated_at: nowIso(),
    })
    .eq('id', job.id);

  if (error) {
    const msg = String(error.message || '');
    if (msg.includes("column 'notified_at'") || msg.includes('column "notified_at"')) {
      await recordEvent(job.id, 'review_notify_tracking_skipped', 'publish', 'warn', 'Tracking columns missing; run migration 20260225000005');
    } else {
      throw new Error(`notify_tracking_update_failed: ${error.message}`);
    }
  }

  await recordEvent(job.id, 'review_notified', 'publish', 'info', 'Reviewer notified via Slack', {
    channel: 'slack',
    review_url: reviewUrl,
  });
}

async function notifyReviewerFailure(job, reason, details = {}) {
  if (!REVIEW_SLACK_WEBHOOK_URL) return;
  const reviewUrl = job.review_url || buildReviewUrl(job.id);
  const message = {
    text: `Regeneration blocked: ${job.site_id} / ${job.profile_name || 'social profile'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'Social Regeneration Blocked', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Site:*\n${escapeSlack(job.site_id)}` },
          { type: 'mrkdwn', text: `*Profile:*\n${escapeSlack(job.profile_name || 'N/A')}` },
          { type: 'mrkdwn', text: `*Job ID:*\n${escapeSlack(job.id)}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Reason:*\n${escapeSlack(reason || 'unknown')}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Review URL:* ${escapeSlack(reviewUrl)}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Details:*\n\`${escapeSlack(JSON.stringify(details).slice(0, 1400))}\`` },
      },
    ],
  };
  await fetch(REVIEW_SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
}

async function loadContext(siteId) {
  const [editorialRes, personaRes] = await Promise.all([
    supabase
      .from('brand_editorial_config')
      .select('site_id, profile_name, editorial_voice, image_style_prompt, daily_themes, framework_ids, persona_id, require_approval, enable_auto_publish, linkedin_agent_instructions, platform_agent_instructions')
      .eq('site_id', siteId)
      .eq('enabled', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('site_persona_assignments')
      .select('site_id, role_key, is_primary, personas:persona_id(id,name,display_name)')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(10),
  ]);

  if (editorialRes.error) throw new Error(`load_editorial_failed: ${editorialRes.error.message}`);
  if (personaRes.error) throw new Error(`load_personas_failed: ${personaRes.error.message}`);

  return {
    editorial: editorialRes.data || null,
    personas: personaRes.data || [],
  };
}

async function loadDestinationChannels(siteId, profileName, platform) {
  const normalizedPlatform = String(platform || '').toLowerCase().trim();
  if (!siteId || !profileName || !normalizedPlatform) return [];
  const { data, error } = await supabase
    .from('social_destination_channels')
    .select('id,site_id,profile_name,platform,channel_key,channel_label,ghl_location_id,ghl_channel_id,is_default,enabled,updated_at')
    .eq('site_id', siteId)
    .eq('profile_name', profileName)
    .ilike('platform', normalizedPlatform)
    .eq('enabled', true)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) {
    throw new Error(`destination_channel_lookup_failed: ${error.message}`);
  }
  return Array.isArray(data) ? data : [];
}

async function resolveDestinationChannel(job, context) {
  const payload = job.payload || {};
  const platform = resolveTargetPlatform(payload) || 'linkedin';
  const profileName = String(job.profile_name || context.editorial?.profile_name || '').trim();
  const requestedKey = String(payload.destination_channel_key || '').trim();

  const candidates = await loadDestinationChannels(job.site_id, profileName, platform);
  if (candidates.length === 0) {
    return null;
  }

  if (requestedKey) {
    const requestedKeyLower = requestedKey.toLowerCase();
    const match = candidates.find((c) => String(c.channel_key || '').toLowerCase() === requestedKeyLower);
    if (!match) {
      const available = candidates.map((c) => c.channel_key).filter(Boolean).join(', ');
      throw new Error(`routing_error: destination_channel_key_not_found (${requestedKey}) available=[${available}]`);
    }
    return match;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const defaults = candidates.filter((c) => c.is_default === true);
  if (defaults.length === 1) {
    return defaults[0];
  }

  const keys = candidates.map((c) => c.channel_key).filter(Boolean).join(', ');
  throw new Error(`routing_error: ambiguous_destination_channel platform=${platform} keys=[${keys}] set payload.destination_channel_key`);
}

function resolveTargetPlatform(payload) {
  if (!payload || typeof payload !== 'object') return '';
  if (payload.platform) return String(payload.platform).toLowerCase();
  if (Array.isArray(payload.platforms) && payload.platforms.length > 0) {
    return String(payload.platforms[0] || '').toLowerCase();
  }
  return '';
}

function shouldUseKeenanLinkedinInstructions(job, context, payload) {
  const isCallReady = String(job.site_id || '').toLowerCase() === 'callready';
  const profile = String(job.profile_name || context.editorial?.profile_name || '').toLowerCase();
  const isKeenan = profile.includes('keenan shaw');
  const isLinkedIn = resolveTargetPlatform(payload) === 'linkedin';
  const hasInstructions = !!String(context.editorial?.linkedin_agent_instructions || '').trim();
  return isCallReady && isKeenan && isLinkedIn && hasInstructions;
}

function containsGenericBoilerplate(text, phrases = GENERIC_BANNED_PHRASES) {
  const value = String(text || '').toLowerCase();
  return phrases.find((phrase) => value.includes(String(phrase).toLowerCase())) || null;
}

function findForbiddenPhrases(text, phrases = GENERIC_BANNED_PHRASES) {
  const value = String(text || '').toLowerCase();
  return phrases.filter((phrase) => value.includes(String(phrase).toLowerCase()));
}

function resolveForbiddenPhrases(promptPack) {
  const fromPack = promptPack?.hard_constraints?.forbidden_phrases;
  if (!Array.isArray(fromPack) || fromPack.length === 0) return GENERIC_BANNED_PHRASES;
  return fromPack
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);
}

function findMarkdownAnnotation(text) {
  const value = String(text || '');
  const checks = [
    { name: 'code_fence', pattern: /```/ },
    { name: 'inline_code', pattern: /`[^`\n]+`/ },
    { name: 'markdown_link', pattern: /\[[^\]]+\]\([^)]+\)/ },
    { name: 'heading', pattern: /^#{1,6}\s+/m },
    { name: 'bold', pattern: /(^|[\s(])(\*\*|__)[^\n]+(\*\*|__)([\s).,!?:]|$)/ },
    { name: 'italic', pattern: /(^|[\s(])(\*|_)[^\n]+(\*|_)([\s).,!?:]|$)/ },
  ];
  const hit = checks.find((c) => c.pattern.test(value));
  return hit ? hit.name : null;
}

function sanitizeMarkdownAnnotation(text) {
  let cleaned = String(text || '');
  cleaned = cleaned.replace(/```[\s\S]*?```/g, ' ');
  cleaned = cleaned.replace(/`([^`\n]+)`/g, '$1');
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/(^|[\s(])\*([^\n*]+)\*([\s).,!?:]|$)/g, '$1$2$3');
  cleaned = cleaned.replace(/(^|[\s(])_([^\n_]+)_([\s).,!?:]|$)/g, '$1$2$3');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

function sanitizeSocialMetaPreamble(text) {
  const source = String(text || '').trim();
  if (!source) return source;

  const normalized = source.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const first = String(lines[0] || '').trim();
  const second = String(lines[1] || '').trim();
  const introLinePatterns = [
    /^here(?:'s| is)\s+(?:my|a|the)?\s*(?:attempt|attempts|draft|drafts|take|version|post)\b/i,
    /^here(?:'s| is)\s+.*\bsocial post\b/i,
    /^here\s+are\s+my\s+(?:attempts|drafts|options)\b/i,
  ];
  const labelLinePatterns = [
    /^(?:social\s+)?(?:post|draft)\s*:/i,
    /^(?:social\s+)?post\s*\d+(?:\s*\([^)]*\))?\s*:?\s*$/i,
    /^post\s*\d+(?:\s*\([^)]*\))?\s*:?\s*$/i,
    /^example\s+post(?:\s*\d+)?\s*:?\s*$/i,
  ];
  if ([...introLinePatterns, ...labelLinePatterns].some((rx) => rx.test(first))) {
    lines.shift();
  }

  // Common two-line pattern: explanatory sentence then a post label line.
  if ([...introLinePatterns, ...labelLinePatterns].some((rx) => rx.test(second))) {
    lines.splice(0, 2);
  }

  // Remove any remaining leading meta/label/blank lines.
  while (
    lines.length > 0 &&
    (
      !String(lines[0] || '').trim() ||
      introLinePatterns.some((rx) => rx.test(String(lines[0] || '').trim())) ||
      labelLinePatterns.some((rx) => rx.test(String(lines[0] || '').trim()))
    )
  ) {
    lines.shift();
  }

  let cleaned = lines.join('\n').trim();
  cleaned = cleaned.replace(/^(?:social\s+)?(?:post|draft)\s*:\s*/i, '').trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

function findSocialMetaPreamble(text) {
  const source = String(text || '').trim();
  if (!source) return null;
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const first = String(lines[0] || '').trim();
  const second = String(lines[1] || '').trim();
  const introLinePatterns = [
    /^here(?:'s| is)\s+(?:my|a|the)?\s*(?:attempt|attempts|draft|drafts|take|version|post)\b/i,
    /^here(?:'s| is)\s+.*\bsocial post\b/i,
    /^here\s+are\s+my\s+(?:attempts|drafts|options)\b/i,
  ];
  const labelLinePatterns = [
    /^(?:social\s+)?(?:post|draft)\s*:/i,
    /^(?:social\s+)?post\s*\d+(?:\s*\([^)]*\))?\s*:?\s*$/i,
    /^post\s*\d+(?:\s*\([^)]*\))?\s*:?\s*$/i,
    /^example\s+post(?:\s*\d+)?\s*:?\s*$/i,
  ];
  if (introLinePatterns.some((rx) => rx.test(first))) return 'intro_attempt';
  if (labelLinePatterns.some((rx) => rx.test(first))) return 'label_social_post';
  if (introLinePatterns.some((rx) => rx.test(second)) || labelLinePatterns.some((rx) => rx.test(second))) {
    return 'line2_social_post_label';
  }
  if (/^\s*(?:post|draft)\s*2\b/i.test(source)) return 'multi_option_output';
  return null;
}

function compactGenerationContext(payload) {
  const raw = String(payload?.context || payload?.raw_context || '').trim();
  if (!raw) return '';
  // Keep the most recent guidance and cap length so local models respond faster.
  const lines = raw
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
  const tail = lines.slice(-8).join('\n');
  if (tail.length <= LLM_CONTEXT_MAX_CHARS) return tail;
  return tail.slice(-LLM_CONTEXT_MAX_CHARS);
}

async function chatCompletionRequest({ baseUrl, apiKey, model, messages, timeoutMs, maxTokens }) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  let raw = '';
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: maxTokens,
        stream: false,
        messages,
      }),
    });
    raw = await response.text();
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return { ok: false, reason: `timeout_${timeoutMs}ms` };
    }
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeoutId);
  }

  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch (_) {
    parsed = {};
  }

  if (!response.ok) {
    return { ok: false, reason: parsed?.error?.message || `http_${response.status}` };
  }

  const text = String(parsed?.choices?.[0]?.message?.content || '').trim();
  if (!text) return { ok: false, reason: 'empty_output' };
  return { ok: true, text };
}

async function loadPromptPack(job, platform) {
  const profileName = job.profile_name || null;
  try {
    const { data, error } = await supabase.rpc('resolve_agent_prompt_pack', {
      p_site_id: job.site_id,
      p_profile_name: profileName,
      p_platform: platform || null,
      p_purpose: 'social_post',
    });
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('function public.resolve_agent_prompt_pack') && msg.includes('does not exist')) {
        return null;
      }
      throw new Error(`prompt_pack_resolve_failed: ${error.message}`);
    }
    if (!data || !data.id) return null;

    const { data: examples, error: exError } = await supabase
      .from('agent_prompt_examples')
      .select('label,input_context,output_text')
      .eq('prompt_pack_id', data.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (exError) {
      throw new Error(`prompt_pack_examples_failed: ${exError.message}`);
    }

    return {
      ...data,
      examples: examples || [],
    };
  } catch (error) {
    throw error;
  }
}

function scoreQualityRubric(job, context, text) {
  const raw = String(text || '').trim();
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const words = raw.split(/\s+/).filter(Boolean);
  const avgLineLen = lines.length ? lines.reduce((n, l) => n + l.length, 0) / lines.length : raw.length;
  const hasNumbers = /\d/.test(raw);
  const hasSpecificNouns = /\b(529|ira|medicare|annuity|underwriting|home equity|contractor|college)\b/i.test(raw);
  const hasCTA = /\b(comment|dm|reply|book|apply|download|start|visit)\b/i.test(raw);
  const clichéHits = (raw.match(/\b(game[-\s]?changer|unlock|ultimate|revolutionary|synergy)\b/gi) || []).length;
  const hasClaimLanguage = /\bguarantee|guaranteed|always|never\b/i.test(raw);

  const specificity = Math.max(1, Math.min(5, (hasNumbers ? 3 : 2) + (hasSpecificNouns ? 2 : 0)));
  const novelty = Math.max(1, 5 - Math.min(4, clichéHits));
  const credibility = Math.max(1, 5 - (hasClaimLanguage ? 2 : 0));
  const cta = hasCTA ? 4 : 2;
  const readability = avgLineLen <= 95 ? 5 : avgLineLen <= 130 ? 4 : avgLineLen <= 170 ? 3 : 2;
  const total = specificity + novelty + credibility + cta + readability;

  const site = String(job.site_id || '').toLowerCase();
  const minBySite = {
    callready: 18,
    parentsimple: 16,
    seniorsimple: 16,
    homesimple: 15,
  };
  const minTotal = minBySite[site] || 15;

  return {
    scores: { specificity, novelty, credibility, cta, readability },
    total,
    min_total: minTotal,
    passed: total >= minTotal,
    context: {
      profile_name: job.profile_name || context.editorial?.profile_name || null,
      site_id: job.site_id,
      lines: lines.length,
      words: words.length,
      avg_line_len: Math.round(avgLineLen),
    },
  };
}

async function chooseFramework(siteId, frameworkIds = []) {
  const hasIds = Array.isArray(frameworkIds) && frameworkIds.length > 0;

  // Schema variant A: site_id + framework_key/framework_name/prompt_template
  try {
    let query = supabase
      .from('social_writing_frameworks')
      .select('id, framework_key, framework_name, prompt_template')
      .eq('site_id', siteId)
      .eq('is_active', true);
    if (hasIds) query = query.in('id', frameworkIds);
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const pick = data[Math.floor(Math.random() * data.length)];
      return {
        id: pick.id,
        framework_key: pick.framework_key || pick.framework_name || 'framework',
        framework_name: pick.framework_name || pick.framework_key || 'Framework',
        prompt_template: pick.prompt_template || null,
      };
    }
  } catch (_) {
    // Fall through to variant B
  }

  // Schema variant B: global frameworks with name/prompt_text
  let fallbackQuery = supabase
    .from('social_writing_frameworks')
    .select('id, name, prompt_text, description')
    .eq('is_active', true);
  if (hasIds) fallbackQuery = fallbackQuery.in('id', frameworkIds);
  const { data: fallbackData, error: fallbackError } = await fallbackQuery;
  if (fallbackError) throw new Error(`load_frameworks_failed: ${fallbackError.message}`);
  if (!fallbackData || fallbackData.length === 0) return null;
  const pick = fallbackData[Math.floor(Math.random() * fallbackData.length)];
  return {
    id: pick.id,
    framework_key: pick.name || 'framework',
    framework_name: pick.name || 'Framework',
    prompt_template: pick.prompt_text || null,
  };
}

function generateTemplateCopy(job, context, framework) {
  const payload = job.payload || {};
  const persona = context.personas?.[0]?.personas || null;
  const voice = context.editorial?.editorial_voice || 'Clear, practical, educational.';
  const topic = payload.topic || payload.title || 'practical growth system';
  const frameworkLabel = framework?.framework_name || framework?.framework_key || 'Direct';
  const personaName = persona?.display_name || persona?.name || context.editorial?.profile_name || 'Brand Team';

  if (payload.seed_copy && typeof payload.seed_copy === 'string') return payload.seed_copy;

  if (shouldUseKeenanLinkedinInstructions(job, context, payload)) {
    return [
      `How I simplify ${topic} so teams stop burning cycles.`,
      ``,
      `Most operators overbuild before they fix one bottleneck.`,
      ``,
      `What changed output for us:`,
      `- Remove one manual step this week`,
      `- Assign one clear owner per stage`,
      `- Review one KPI weekly for 90 days`,
      ``,
      `If you run a B2B agency, this is the fastest way to build predictable pipeline.`,
      ``,
      `Comment "SYSTEM" and I will send the checklist.`,
    ].join('\n');
  }

  return [
    `Most teams overcomplicate ${topic}.`,
    `${personaName} breaks it down with a ${frameworkLabel} structure:`,
    `1) Identify the highest-friction bottleneck.`,
    `2) Replace manual steps with one repeatable workflow.`,
    `3) Track one metric weekly until it compounds.`,
    `If you want predictable growth, optimize systems before adding noise.`,
    `#${job.site_id} #automation #growth`,
    `Voice guideline: ${voice}`,
  ].join('\n');
}

async function generateCopyWithAI(job, context, framework) {
  const payload = job.payload || {};
  const compactContext = compactGenerationContext(payload);
  const persona = context.personas?.[0]?.personas || null;
  const platform = resolveTargetPlatform(payload) || 'linkedin';
  const topic = payload.topic || payload.title || 'practical growth system';
  const frameworkLabel = framework?.framework_name || framework?.framework_key || 'Direct';
  const profileName = job.profile_name || context.editorial?.profile_name || 'Brand Team';
  const personaName = persona?.display_name || persona?.name || profileName;
  const voice = context.editorial?.editorial_voice || 'Clear, practical, educational.';
  const platformInstruction =
    context.editorial?.platform_agent_instructions &&
    typeof context.editorial.platform_agent_instructions === 'object'
      ? context.editorial.platform_agent_instructions[platform] || ''
      : '';
  const keenanLinkedinInstructions = shouldUseKeenanLinkedinInstructions(job, context, payload)
    ? String(context.editorial?.linkedin_agent_instructions || '')
    : '';
  const promptPack = await loadPromptPack(job, platform);
  const forbiddenPhrases = resolveForbiddenPhrases(promptPack);

  const baselineSystemPrompt = [
    'You are a senior social media ghostwriter for growth-focused brands.',
    'Write one complete, publish-ready post only.',
    'No meta commentary. No markdown annotation. No placeholders.',
    'Do not output a headline/subheadline format.',
    'Do not start with a title line followed by explanatory paragraph blocks.',
    'Do not add pre-writing or framing text like "Here is my draft", "Here\'s my attempt", or "Social Post:".',
    'Return exactly one post. Do not provide multiple options or variants.',
    'Plain text only. Do not use markdown syntax like #, **, __, `, or [text](url).',
    'Use clear, specific language and practical details.',
    'Avoid generic filler and vague advice.',
    `Forbidden phrases: ${forbiddenPhrases.join(', ')}.`,
    'Never use any forbidden phrase verbatim.',
    'If no proof metrics are provided, do not invent numbers.',
  ].join('\n');
  const systemPromptBase =
    keenanLinkedinInstructions ||
    String(promptPack?.system_prompt || '').trim() ||
    baselineSystemPrompt;
  const systemPrompt = [
    systemPromptBase,
    'Global enforcement: return only one final social post body.',
    'Global enforcement: no headline/subheadline wrapper and no title label.',
  ].join('\n');
  const writerPrompt =
    String(promptPack?.writer_prompt || '').trim() ||
    'Write one final social post body using short lines, concrete examples, and a clear CTA. Return only the final post text.';
  const plannerPrompt = String(promptPack?.planner_prompt || '').trim();
  const criticPrompt = String(promptPack?.critic_prompt || '').trim();
  const revisionPrompt = String(promptPack?.revision_prompt || '').trim();

  const examplesText = (promptPack?.examples || []).length > 0
    ? [
        'Few-shot examples:',
        ...(promptPack.examples || []).map((ex, idx) =>
          [
            `Example ${idx + 1} (${ex.label || 'sample'}):`,
            `Input Context: ${JSON.stringify(ex.input_context || {})}`,
            `Output: ${String(ex.output_text || '').trim()}`,
          ].join('\n')
        ),
      ].join('\n\n')
    : '';

  const baseUserPrompt = [
    `Site: ${job.site_id}`,
    `Profile: ${profileName}`,
    `Persona: ${personaName}`,
    `Platform: ${platform}`,
    `Topic: ${topic}`,
    `Framework preference: ${frameworkLabel}`,
    `Editorial voice: ${voice}`,
    `Platform instruction: ${platformInstruction || 'none'}`,
    `Additional context: ${compactContext || 'none'}`,
    `Planner guidance: ${plannerPrompt || 'none'}`,
    `Critic guidance: ${criticPrompt || 'none'}`,
    `Revision guidance: ${revisionPrompt || 'none'}`,
    examplesText,
    '',
    'Task:',
    writerPrompt,
  ].join('\n');

  let lastError = 'llm_unknown_error';
  let revisionHint = '';
  let usedProvider = 'local_llama';
  let usedModel = LLM_MODEL;

  for (let attempt = 1; attempt <= LLM_MAX_ATTEMPTS; attempt += 1) {
    const userPrompt = [
      baseUserPrompt,
      revisionHint,
    ].filter(Boolean).join('\n\n');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let completion = await chatCompletionRequest({
      baseUrl: LLM_BASE_URL,
      apiKey: LLM_API_KEY,
      model: LLM_MODEL,
      messages,
      timeoutMs: LLM_TIMEOUT_MS,
      maxTokens: LLM_MAX_TOKENS,
    });

    usedProvider = 'local_llama';
    usedModel = LLM_MODEL;

    if (!completion.ok && ENABLE_OPENAI_FALLBACK && OPENAI_FALLBACK_API_KEY) {
      const fallback = await chatCompletionRequest({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: OPENAI_FALLBACK_API_KEY,
        model: OPENAI_FALLBACK_MODEL,
        messages,
        timeoutMs: LLM_TIMEOUT_MS,
        maxTokens: LLM_MAX_TOKENS,
      });
      if (fallback.ok) {
        completion = fallback;
        usedProvider = 'openai_fallback';
        usedModel = OPENAI_FALLBACK_MODEL;
      } else {
        lastError = `local_${completion.reason};openai_${fallback.reason}`;
        continue;
      }
    } else if (!completion.ok) {
      lastError = `local_${completion.reason}`;
      continue;
    }

    let output = String(completion.text || '').trim();
    if (!output) {
      lastError = 'llm_empty_output';
      continue;
    }
    if (output.length < 80) {
      lastError = 'llm_output_too_short';
      continue;
    }

    const forbiddenHits = findForbiddenPhrases(output, forbiddenPhrases);
    if (forbiddenHits.length > 0) {
      lastError = `llm_contains_forbidden_phrase:${forbiddenHits.join('|')}`;
      revisionHint = [
        'Revision required.',
        `Your previous draft used forbidden phrases: ${forbiddenHits.join(', ')}.`,
        'Rewrite the entire post with the same intent but different wording.',
        'Do not use any forbidden phrase.',
      ].join('\n');
      continue;
    }

    const markdownHit = findMarkdownAnnotation(output);
    if (markdownHit) {
      output = sanitizeMarkdownAnnotation(output);
      const afterSanitizeHit = findMarkdownAnnotation(output);
      if (afterSanitizeHit) {
        lastError = `llm_contains_markdown_annotation:${afterSanitizeHit}`;
        revisionHint = [
          'Revision required.',
          `Your previous draft included markdown annotation (${afterSanitizeHit}).`,
          'Rewrite in plain text only.',
          'Do not use markdown symbols or link formatting.',
        ].join('\n');
        continue;
      }
    }

    output = sanitizeSocialMetaPreamble(output);
    if (/\n\s*(?:post|draft)\s*2\b/i.test(output)) {
      lastError = 'llm_contains_multi_option_output';
      revisionHint = [
        'Revision required.',
        'Return exactly one final post body.',
        'Do not include multiple variants like "Post 1" and "Post 2".',
      ].join('\n');
      continue;
    }
    const metaPreambleHit = findSocialMetaPreamble(output);
    if (metaPreambleHit) {
      lastError = `llm_contains_meta_preamble:${metaPreambleHit}`;
      revisionHint = [
        'Revision required.',
        'Your previous draft included pre-writing or labels before the post.',
        'Return only the final post body. Do not include labels like "Social Post:" or "Here is my draft".',
      ].join('\n');
      continue;
    }

    return {
      text: output,
      provider: usedProvider,
      model: usedModel,
      prompt_pack_id: promptPack?.id || null,
      prompt_pack_name: promptPack?.pack_name || null,
      prompt_pack_version: promptPack?.version || null,
      forbidden_phrases: forbiddenPhrases,
    };
  }

  throw new Error(lastError);
}

async function generateCopy(job, context, framework) {
  const payload = job.payload || {};
  if (payload.seed_copy && typeof payload.seed_copy === 'string') {
    return { text: payload.seed_copy, source: 'seed' };
  }

  try {
    const aiOutput = await generateCopyWithAI(job, context, framework);
    return {
      text: aiOutput.text,
      source: 'ai',
      model: aiOutput.model || LLM_MODEL,
      provider: aiOutput.provider || 'local_llama',
      prompt_pack_id: aiOutput.prompt_pack_id || null,
      prompt_pack_name: aiOutput.prompt_pack_name || null,
      prompt_pack_version: aiOutput.prompt_pack_version || null,
      forbidden_phrases: aiOutput.forbidden_phrases || GENERIC_BANNED_PHRASES,
    };
  } catch (error) {
    return {
      text: generateTemplateCopy(job, context, framework),
      source: 'template_fallback',
      fallback_reason: error instanceof Error ? error.message : String(error),
      forbidden_phrases: GENERIC_BANNED_PHRASES,
    };
  }
}

async function runPolicyGate(job, context, copyText, copyGeneration) {
  const checks = [];
  checks.push({
    policy_name: 'ai_generation_required',
    passed: !REQUIRE_AI_COPY || copyGeneration?.source === 'ai' || copyGeneration?.source === 'seed',
    severity: 'error',
    details: {
      required: REQUIRE_AI_COPY,
      source: copyGeneration?.source || null,
      fallback_reason: copyGeneration?.fallback_reason || null,
    },
  });
  const activeForbiddenPhrases = Array.isArray(copyGeneration?.forbidden_phrases)
    ? copyGeneration.forbidden_phrases
    : GENERIC_BANNED_PHRASES;
  const genericHit = containsGenericBoilerplate(copyText, activeForbiddenPhrases);
  checks.push({
    policy_name: 'min_length_80_chars',
    passed: (copyText || '').length >= 80,
    severity: 'error',
    details: { actual_length: (copyText || '').length, min_required: 80 },
  });
  checks.push({
    policy_name: 'no_generic_boilerplate',
    passed: !genericHit,
    severity: 'error',
    details: { matched_phrase: genericHit, forbidden_phrases: activeForbiddenPhrases },
  });
  const markdownHit = findMarkdownAnnotation(copyText);
  checks.push({
    policy_name: 'no_markdown_annotation',
    passed: !markdownHit,
    severity: 'error',
    details: { matched_annotation: markdownHit },
  });
  const metaPreambleHit = findSocialMetaPreamble(copyText);
  checks.push({
    policy_name: 'no_meta_preamble',
    passed: !metaPreambleHit,
    severity: 'error',
    details: { matched_preamble: metaPreambleHit },
  });
  checks.push({
    policy_name: 'avoid_guarantee_language',
    passed: !/\bguaranteed?\b/i.test(copyText || ''),
    severity: 'warn',
    details: { banned_token: 'guarantee' },
  });

  const rubric = scoreQualityRubric(job, context, copyText);
  checks.push({
    policy_name: 'rubric_min_total_score',
    passed: rubric.passed,
    severity: 'error',
    details: rubric,
  });

  for (const c of checks) {
    const { error } = await supabase.from('content_policy_results').insert({
      job_id: job.id,
      site_id: job.site_id,
      policy_name: c.policy_name,
      passed: c.passed,
      severity: c.severity,
      details: c.details,
    });
    if (error) throw new Error(`policy_insert_failed(${c.policy_name}): ${error.message}`);
  }

  return checks.every((c) => c.passed || c.severity !== 'error');
}

async function generateApprovedImage(job, context, copyText) {
  const payload = job.payload || {};
  const topic = payload.topic || payload.title || 'brand education';
  const articleId = payload.article_id || payload.articleId || null;
  const style = context.editorial?.image_style_prompt || 'clean modern brand image';
  const prompt = payload.image_prompt || `${style}. Topic: ${topic}.`;

  const reqBody = {
    site_id: job.site_id,
    article_id: articleId || undefined,
    title: payload.title || topic,
    content: String(copyText || '').slice(0, 1500),
    prompt,
    style,
    imageType: 'social',
    aspect_ratio: '16:9',
    auto_approve: true,
  };

  const response = await fetch(`${DEFAULT_SUPABASE_URL}/functions/v1/ai-image-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: DEFAULT_SERVICE_KEY,
      Authorization: `Bearer ${DEFAULT_SERVICE_KEY}`,
    },
    body: JSON.stringify(reqBody),
  });

  const raw = await response.text();
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch (_) {
    parsed = { raw };
  }

  if (!response.ok) {
    const message = parsed?.error || `ai_image_generator_http_${response.status}`;
    throw new Error(`approved_image_generation_failed: ${message}`);
  }

  const imageUrl = String(parsed?.imageUrl || parsed?.image_url || parsed?.url || '').trim();
  if (!imageUrl) {
    throw new Error('approved_image_generation_failed: missing_image_url');
  }

  const imageResult = {
    image_url: imageUrl,
    prompt,
    style,
    article_id: articleId,
    generated_at: nowIso(),
    provider_response: parsed,
  };

  await saveArtifact(job, 'generate_image', 'image_result', imageResult);

  const mergedPayload = {
    ...(job.payload || {}),
    generated_image: {
      image_url: imageUrl,
      prompt,
      style,
      generated_at: imageResult.generated_at,
    },
  };
  const { error: payloadUpdateError } = await supabase
    .from('content_jobs')
    .update({ payload: mergedPayload, updated_at: nowIso() })
    .eq('id', job.id);
  if (payloadUpdateError) {
    await recordEvent(job.id, 'image_payload_update_failed', 'generate_image', 'warn', payloadUpdateError.message);
  }

  const syncImageToArticle = String(payload.sync_image_to_article || '').toLowerCase() === 'true';
  if (articleId && syncImageToArticle) {
    const { error: articleUpdateError } = await supabase
      .from('articles')
      .update({
        featured_image_url: imageUrl,
        featured_image_alt: payload.title || topic,
      })
      .eq('id', articleId);
    if (articleUpdateError) {
      await recordEvent(job.id, 'article_image_update_failed', 'generate_image', 'warn', articleUpdateError.message);
    }
  }

  await recordEvent(job.id, 'approved_image_generated', 'generate_image', 'info', 'Generated approved image', {
    image_url: imageUrl,
    article_id: articleId,
  });

  return imageUrl;
}

async function publishViaGhl(job, context, copyText, customImageUrl = null, destinationChannel = null) {
  const payload = job.payload || {};
  const postIntent = String(payload.post_intent || 'native').toLowerCase();
  const articleId = payload.article_id || payload.articleId || null;
  if (postIntent === 'promotion' && !articleId) {
    await logPublishAttempt(job, {
      platform: 'all',
      post_intent: postIntent,
      success: false,
      error_message: 'missing_article_id',
      remote_payload: { reason: 'missing_article_id' },
    });
    return {
      skipped: true,
      reason: 'missing_article_id',
    };
  }

  const platforms = Array.isArray(payload.platforms)
    ? payload.platforms.map((p) => String(p).toLowerCase()).filter(Boolean)
    : payload.platform
      ? [String(payload.platform).toLowerCase()]
      : undefined;

  const hasExplicitSchedule =
    payload.schedule_hours !== undefined &&
    payload.schedule_hours !== null &&
    String(payload.schedule_hours).trim() !== '';
  const defaultHours = Number(context.editorial?.default_schedule_hours ?? 1);
  const scheduleHours = hasExplicitSchedule
    ? Number(payload.schedule_hours)
    : (job.requires_approval === true && job.approval_status === 'approved')
      ? 0
      : defaultHours;

  const body = {
    site_id: job.site_id,
    profile_name: job.profile_name || context.editorial?.profile_name || undefined,
    platforms,
    post_intent: postIntent,
    schedule_hours: Number.isFinite(scheduleHours) ? Math.max(0, scheduleHours) : 1,
    include_image: payload.include_image !== false,
    custom_image_url: customImageUrl || undefined,
    custom_content: copyText,
    destination_channel_key: destinationChannel?.channel_key || payload.destination_channel_key || undefined,
    destination_channel_id: destinationChannel?.ghl_channel_id || payload.destination_channel_id || undefined,
  };
  if (articleId) {
    body.article_id = String(articleId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PUBLISH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${DEFAULT_SUPABASE_URL}/functions/v1/ghl-social-poster`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        apikey: DEFAULT_SERVICE_KEY,
        Authorization: `Bearer ${DEFAULT_SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`publish_failed: timeout_${PUBLISH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch (_) {
    parsed = { raw: text };
  }

  const platformErrors = Array.isArray(parsed?.platform_results)
    ? parsed.platform_results
        .filter((r) => r && r.success === false)
        .map((r) => `${r.platform || 'platform'}: ${r.error || 'unknown error'}`)
    : [];

  if (!response.ok || parsed?.success === false) {
    const message = [
      parsed?.error ? `error=${parsed.error}` : null,
      platformErrors.length > 0 ? `platform_errors=${platformErrors.join(' | ')}` : null,
      parsed?.posts_scheduled === 0 ? 'posts_scheduled=0' : null,
      `http_status=${response.status}`,
    ].filter(Boolean).join('; ');
    if (Array.isArray(parsed?.platform_results) && parsed.platform_results.length > 0) {
      for (const result of parsed.platform_results) {
        await logPublishAttempt(job, {
          platform: String(result?.platform || 'unknown'),
          post_intent: postIntent,
          success: false,
          http_status: response.status,
          error_message: String(result?.error || message),
          remote_payload: result || {},
        });
      }
    } else {
      await logPublishAttempt(job, {
        platform: 'all',
        post_intent: postIntent,
        success: false,
        http_status: response.status,
        error_message: message,
        remote_payload: parsed || {},
      });
    }
    throw new Error(`publish_failed: ${message}`);
  }

  if (Array.isArray(parsed?.platform_results) && parsed.platform_results.length > 0) {
    for (const result of parsed.platform_results) {
      await logPublishAttempt(job, {
        platform: String(result?.platform || 'unknown'),
        post_intent: postIntent,
        success: !!result?.success,
        http_status: response.status,
        remote_post_id: result?.post_id || null,
        error_message: result?.success ? null : String(result?.error || 'unknown error'),
        remote_payload: result || {},
      });
    }
  } else {
    await logPublishAttempt(job, {
      platform: 'all',
      post_intent: postIntent,
      success: true,
      http_status: response.status,
      remote_payload: parsed || {},
    });
  }

  return {
    skipped: false,
    request: body,
    result: parsed,
  };
}

async function markRetry(job, errMsg) {
  const attempt = Number(job.attempt_count || 1);
  const maxAttempts = Number(job.max_attempts || 3);
  const shouldFail = attempt >= maxAttempts;
  const isRoutingError = String(errMsg || '').includes('routing_error:');
  const retryDelayMinutes = Math.min(30, Math.pow(2, attempt));

  const patch = (shouldFail || isRoutingError)
    ? {
        status: 'failed',
        finished_at: nowIso(),
        lock_token: null,
        lock_expires_at: null,
        last_error: errMsg,
        updated_at: nowIso(),
      }
    : {
        status: 'retryable',
        available_at: new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString(),
        lock_token: null,
        lock_expires_at: null,
        last_error: errMsg,
        updated_at: nowIso(),
      };

  const { error } = await supabase.from('content_jobs').update(patch).eq('id', job.id);
  if (error) console.error(`⚠️ failed to mark retry/failed for job ${job.id}: ${error.message}`);
  if (shouldFail || isRoutingError || String(errMsg || '').includes('publish_failed')) {
    await notifyAuditSlack('Social Publish Failure', [
      `Site: ${job.site_id}`,
      `Profile: ${job.profile_name || 'N/A'}`,
      `Job: ${job.id}`,
      `Status: ${shouldFail ? 'failed' : 'retryable'}`,
      `Error: ${errMsg}`,
    ]);
  }
}

async function processJob(job) {
  await recordEvent(job.id, 'stage_started', 'prepare_context', 'info', 'Preparing context');
  const context = await loadContext(job.site_id);
  await saveArtifact(job, 'prepare_context', 'context_snapshot', context);

  const framework = await chooseFramework(job.site_id, context.editorial?.framework_ids || []);
  await recordEvent(
    job.id,
    'framework_selected',
    'prepare_context',
    'info',
    framework ? `Selected ${framework.framework_key}` : 'No framework selected',
    framework || {}
  );

  const isApprovedReplay = job.requires_approval === true && String(job.approval_status || '').toLowerCase() === 'approved';
  let copyGeneration;
  let copyText = '';

  if (isApprovedReplay) {
    const approvedCopy = await loadLatestSocialCopy(job.id);
    if (!approvedCopy?.text) {
      throw new Error(`approved_copy_missing: ${job.id}`);
    }
    copyText = approvedCopy.text;
    copyGeneration = {
      text: copyText,
      source: 'approved_artifact',
      model: null,
      provider: null,
      fallback_reason: null,
    };
    await recordEvent(
      job.id,
      'copy_reused',
      'generate_copy',
      'info',
      'Reused approved social_copy artifact for publish',
      {
        artifact_id: approvedCopy.artifact_id,
        artifact_version: approvedCopy.version,
        artifact_created_at: approvedCopy.created_at,
      }
    );
  } else {
    await recordEvent(job.id, 'stage_started', 'generate_copy', 'info', 'Generating copy');
    copyGeneration = await generateCopy(job, context, framework);
    copyText = copyGeneration.text;
    await recordEvent(
      job.id,
      'copy_generated',
      'generate_copy',
      copyGeneration.source === 'ai' ? 'info' : 'warn',
      `Copy generated via ${copyGeneration.source}`,
      {
        source: copyGeneration.source,
        model: copyGeneration.model || null,
        provider: copyGeneration.provider || null,
        fallback_reason: copyGeneration.fallback_reason || null,
        prompt_pack_id: copyGeneration.prompt_pack_id || null,
        prompt_pack_name: copyGeneration.prompt_pack_name || null,
        prompt_pack_version: copyGeneration.prompt_pack_version || null,
      }
    );
    await saveArtifact(job, 'generate_copy', 'social_copy', {
      text: copyText,
      framework,
      source: copyGeneration.source,
      model: copyGeneration.model || null,
      provider: copyGeneration.provider || null,
      fallback_reason: copyGeneration.fallback_reason || null,
      prompt_pack_id: copyGeneration.prompt_pack_id || null,
      prompt_pack_name: copyGeneration.prompt_pack_name || null,
      prompt_pack_version: copyGeneration.prompt_pack_version || null,
      generated_at: nowIso(),
    });
  }

  if (!job.payload?.skip_image) {
    await recordEvent(job.id, 'stage_started', 'generate_image', 'info', 'Generating image prompt');
    const imagePrompt = {
      prompt: `${context.editorial?.image_style_prompt || 'clean modern brand image'}, topic: ${job.payload?.topic || 'growth systems'}`,
      style: context.editorial?.image_style_prompt || null,
    };
    await saveArtifact(job, 'generate_image', 'image_prompt', imagePrompt);
  } else {
    await recordEvent(job.id, 'stage_skipped', 'generate_image', 'info', 'Image generation skipped by payload flag');
  }

  if (!isApprovedReplay) {
    await recordEvent(job.id, 'stage_started', 'policy_gate', 'info', 'Running policy checks');
    const policyPassed = await runPolicyGate(job, context, copyText, copyGeneration);
    if (!policyPassed) {
      const requiresApprovalForJob = job.requires_approval === true;
      if (requiresApprovalForJob) {
        await recordEvent(
          job.id,
          'policy_flagged_for_review',
          'policy_gate',
          'warn',
          'Policy checks flagged draft; routing to human approval instead of hard-fail',
          {
            source: copyGeneration.source,
            fallback_reason: copyGeneration.fallback_reason || null,
            model: copyGeneration.model || null,
          }
        );
      } else {
        await recordEvent(job.id, 'policy_blocked', 'policy_gate', 'error', 'Policy checks failed, job blocked');
        await notifyReviewerFailure(
          job,
          'Policy gate failed before approval',
          {
            source: copyGeneration.source,
            fallback_reason: copyGeneration.fallback_reason || null,
            model: copyGeneration.model || null,
          }
        );
        await supabase.from('content_jobs').update({
          status: 'failed',
          finished_at: nowIso(),
          lock_token: null,
          lock_expires_at: null,
          last_error: 'policy_gate_failed',
          updated_at: nowIso(),
        }).eq('id', job.id);
        return;
      }
    }
  } else {
    await recordEvent(job.id, 'policy_gate_skipped', 'policy_gate', 'info', 'Skipped policy gate for approved replay publish');
  }

  await recordEvent(job.id, 'stage_started', 'publish', 'info', 'Publish stage (beta stub)');
  const producerType = String(job.producer_type || job.payload?.source_type || '').toLowerCase();
  const forceApproval = producerType === 'notion';
  const requiresApproval = forceApproval ? true : (job.requires_approval === true);
  const approvalStatus = forceApproval ? String(job.approval_status || 'pending') : String(job.approval_status || '');
  const publishAllowed = !requiresApproval || ['approved', 'not_required'].includes(approvalStatus);
  const autoPublishEnabled = !!context.editorial?.enable_auto_publish;

  await saveArtifact(job, 'publish', 'publish_decision', {
    publish_allowed: publishAllowed,
    requires_approval_effective: requiresApproval,
    approval_status_effective: approvalStatus,
    auto_publish_enabled: autoPublishEnabled,
    decision: publishAllowed && autoPublishEnabled ? 'ready_to_publish' : 'awaiting_manual_publish',
  });

  if (publishAllowed && autoPublishEnabled) {
    const destinationChannel = await resolveDestinationChannel(job, context);
    if (destinationChannel) {
      await recordEvent(
        job.id,
        'destination_channel_resolved',
        'publish',
        'info',
        `Resolved destination channel ${destinationChannel.channel_key}`,
        {
          platform: String(destinationChannel.platform || ''),
          channel_key: String(destinationChannel.channel_key || ''),
          ghl_channel_id: String(destinationChannel.ghl_channel_id || ''),
          ghl_location_id: String(destinationChannel.ghl_location_id || ''),
        }
      );
    }
    let customImageUrl = null;
    const includeImage = job.payload?.include_image !== false;
    const postIntent = String(job.payload?.post_intent || 'native').toLowerCase();
    if (includeImage && postIntent === 'native') {
      try {
        customImageUrl = await generateApprovedImage(job, context, copyText);
      } catch (imageError) {
        await recordEvent(
          job.id,
          'approved_image_generation_skipped',
          'generate_image',
          'warn',
          imageError instanceof Error ? imageError.message : String(imageError)
        );
      }
    } else if (includeImage && postIntent === 'promotion') {
      await recordEvent(
        job.id,
        'image_generation_skipped',
        'generate_image',
        'info',
        'Skipped local image generation for promotion intent (will use article OG image)'
      );
    }

    const publish = await publishViaGhl(job, context, copyText, customImageUrl, destinationChannel);
    if (publish.skipped) {
      await recordEvent(
        job.id,
        'publish_skipped',
        'publish',
        'warn',
        'Auto-publish skipped because article_id is missing',
        { reason: publish.reason }
      );
      await saveArtifact(job, 'publish', 'publish_result', {
        skipped: true,
        reason: publish.reason,
        occurred_at: nowIso(),
      });
    } else {
      await recordEvent(job.id, 'publish_sent', 'publish', 'info', 'Posted via ghl-social-poster');
      const platformResults = Array.isArray(publish?.result?.platform_results) ? publish.result.platform_results : [];
      const okCount = platformResults.filter((r) => r && r.success === true).length;
      const failCount = platformResults.filter((r) => r && r.success === false).length;
      const title = failCount > 0
        ? `Social Delivery Update (partial) ✅${okCount} ❌${failCount}`
        : 'Social Delivery Update (success)';
      await notifyAuditSlack(title, buildPublishAuditLines(job, context, copyText, publish));
      await saveArtifact(job, 'publish', 'publish_result', {
        skipped: false,
        occurred_at: nowIso(),
        response: publish.result,
      });
    }
  } else if (!publishAllowed) {
    await recordEvent(job.id, 'approval_required', 'publish', 'info', 'Approval required before publish');
    const { error: waitError } = await supabase
      .from('content_jobs')
      .update({
        status: 'awaiting_approval',
        requires_approval: true,
        approval_status: 'pending',
        lock_token: null,
        lock_expires_at: null,
        updated_at: nowIso(),
      })
      .eq('id', job.id);
    if (waitError) throw new Error(`awaiting_approval_update_failed: ${waitError.message}`);

    // Always send a fresh review message for each newly generated draft.
    await notifyReviewer(job, context, copyText);
    return;
  } else {
    await recordEvent(job.id, 'publish_deferred', 'publish', 'info', 'Deferred: approval or auto publish disabled');
  }

  const { error: finalizeError } = await supabase.rpc('finalize_content_job', {
    p_job_id: job.id,
    p_success: true,
    p_error: null,
  });
  if (finalizeError) throw new Error(`finalize_failed: ${finalizeError.message}`);
}

async function claimNextJob() {
  const { data, error } = await supabase.rpc('claim_next_content_job', {
    p_worker: WORKER_NAME,
    p_lock_minutes: LOCK_MINUTES,
  });
  if (error) throw new Error(`claim_failed: ${error.message}`);
  if (!data || data.length === 0) return null;
  return data[0];
}

async function recoverStaleRunningJobs() {
  const staleBefore = new Date(Date.now() - Math.max(60, LOCK_MINUTES) * 60 * 1000).toISOString();
  const { data: staleJobs, error: staleError } = await supabase
    .from('content_jobs')
    .select('id')
    .eq('status', 'running')
    .lt('lock_expires_at', staleBefore)
    .limit(25);
  if (staleError) {
    console.error(`⚠️ stale-job lookup failed: ${staleError.message}`);
    return 0;
  }
  const jobs = Array.isArray(staleJobs) ? staleJobs : [];
  if (jobs.length === 0) return 0;

  let recovered = 0;
  for (const row of jobs) {
    const jobId = String(row?.id || '');
    if (!jobId) continue;
    const { error: resetError } = await supabase
      .from('content_jobs')
      .update({
        status: 'retryable',
        available_at: nowIso(),
        lock_token: null,
        lock_expires_at: null,
        last_error: 'auto_recovered_stale_running_lock',
        updated_at: nowIso(),
      })
      .eq('id', jobId)
      .eq('status', 'running');
    if (resetError) continue;
    recovered += 1;
    await recordEvent(
      jobId,
      'job_auto_recovered',
      'worker',
      'warn',
      'Recovered stale running job lock after transient failure',
      { worker: WORKER_NAME, stale_before: staleBefore }
    );
  }
  if (recovered > 0) {
    console.log(`♻️ Recovered ${recovered} stale running job(s)`);
  }
  return recovered;
}

async function tick() {
  await recoverStaleRunningJobs();
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`▶️  Processing job ${job.id} (${job.site_id}) attempt ${job.attempt_count}/${job.max_attempts}`);
  try {
    await processJob(job);
    console.log(`✅ Completed job ${job.id}`);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Job ${job.id} failed: ${errMsg}`);
    await recordEvent(job.id, 'job_error', 'worker', 'error', errMsg);
    await markRetry(job, errMsg);
  }
  return true;
}

async function run() {
  console.log(`🚀 ${WORKER_NAME} started`);
  if (ONCE) {
    await tick();
    return;
  }

  while (true) {
    try {
      const didWork = await tick();
      if (!didWork) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    } catch (error) {
      console.error(`⚠️ worker loop error: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

run().catch((err) => {
  console.error(`💥 fatal worker error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
