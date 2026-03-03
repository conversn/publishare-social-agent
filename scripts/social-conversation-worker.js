#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
const SLACK_BOT_USER_ID = process.env.SLACK_BOT_USER_ID || '';

const PRIMARY_BASE_URL = (process.env.SOCIAL_CHAT_PRIMARY_BASE_URL || 'http://127.0.0.1:11434/v1').replace(/\/$/, '');
const PRIMARY_MODEL = process.env.SOCIAL_CHAT_PRIMARY_MODEL || 'llama3.1:8b';
const PRIMARY_API_KEY = process.env.SOCIAL_CHAT_PRIMARY_API_KEY || '';

const SECONDARY_BASE_URL = (process.env.SOCIAL_CHAT_SECONDARY_BASE_URL || 'http://127.0.0.1:8080/v1').replace(/\/$/, '');
const SECONDARY_MODEL = process.env.SOCIAL_CHAT_SECONDARY_MODEL || 'Qwen2.5-7B-Instruct';
const SECONDARY_API_KEY = process.env.SOCIAL_CHAT_SECONDARY_API_KEY || '';

const ENABLE_DEEPSEEK_FALLBACK = !['0', 'false', 'no'].includes(
  String(process.env.SOCIAL_CHAT_ENABLE_DEEPSEEK_FALLBACK || 'true').toLowerCase()
);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.DEEP_SEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.SOCIAL_CHAT_DEEPSEEK_MODEL || 'deepseek-chat';

const POLL_MS = Number(process.env.SOCIAL_CHAT_POLL_MS || 15000);
const TIMEOUT_MS = Number(process.env.SOCIAL_CHAT_TIMEOUT_MS || 45000);
const REGEN_WAIT_MS = Number(process.env.SOCIAL_CHAT_REGEN_WAIT_MS || 120000);
const REGEN_POLL_MS = Number(process.env.SOCIAL_CHAT_REGEN_POLL_MS || 4000);
const MAX_INPUT_CHARS = Number(process.env.SOCIAL_CHAT_MAX_INPUT_CHARS || 1200);
const CHANNEL_IDS = String(process.env.SOCIAL_CHAT_MONITOR_CHANNEL_IDS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const INCLUDE_IM = !['0', 'false', 'no'].includes(String(process.env.SOCIAL_CHAT_INCLUDE_IM || 'false').toLowerCase());
const TRIGGER_PREFIX = String(process.env.SOCIAL_CHAT_TRIGGER_PREFIX || 'social').trim().toLowerCase();
const WORKER_NAME = process.env.SOCIAL_CHAT_WORKER_NAME || 'social-conversation-worker';
const WARNED_INACCESSIBLE_CHANNELS = new Set();
const APPROVER_IDS = new Set(
  String(process.env.SLACK_SOCIAL_APPROVER_IDS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
);
const ONCE = process.argv.includes('--once');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!SLACK_BOT_TOKEN) {
  console.error('❌ Missing SLACK_BOT_TOKEN');
  process.exit(1);
}
if (CHANNEL_IDS.length === 0 && !INCLUDE_IM) {
  console.error('❌ Set SOCIAL_CHAT_MONITOR_CHANNEL_IDS or SOCIAL_CHAT_INCLUDE_IM=true');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function isJobId(text) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(text || '').trim());
}

function parseLimit(raw, fallback = 10, max = 25) {
  const n = Number(raw || '');
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

function normalizeText(text) {
  return String(text || '')
    .replace(/<@[A-Z0-9]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitForSlack(text, maxLen = 3200) {
  const src = String(text || '');
  if (src.length <= maxLen) return [src];
  const out = [];
  let i = 0;
  while (i < src.length) {
    out.push(src.slice(i, i + maxLen));
    i += maxLen;
  }
  return out;
}

function truncateText(value, max = 44) {
  const v = String(value || '').trim();
  if (v.length <= max) return v;
  return `${v.slice(0, Math.max(1, max - 1))}…`;
}

function statusEmoji(status, approvalStatus) {
  const s = String(status || '').toLowerCase();
  const a = String(approvalStatus || '').toLowerCase();
  if (s === 'failed' || a === 'rejected') return '🔴';
  if (s === 'awaiting_approval' || a === 'pending') return '🟡';
  if (s === 'running' || s === 'retryable') return '🟠';
  if (s === 'completed' || a === 'approved') return '🟢';
  return '⚪';
}

function inferPostIntent(payload) {
  const raw = String(payload?.post_intent || '').trim().toLowerCase();
  if (raw === 'native' || raw === 'promotion') return raw;
  return payload?.article_id ? 'promotion' : 'native';
}

function inferJobTitle(payload) {
  const title =
    payload?.topic ||
    payload?.title ||
    payload?.headline ||
    payload?.post_title ||
    payload?.article_title ||
    payload?.subject ||
    '';
  if (title) return String(title).trim();
  const text = String(payload?.context || payload?.raw_context || '').trim();
  if (!text) return 'Untitled';
  const first = text.split('\n').map((s) => s.trim()).find(Boolean) || 'Untitled';
  return truncateText(first, 64);
}

function extractIntent(messageText) {
  const text = normalizeText(messageText).toLowerCase();
  if (!text) return { tool: 'help', args: {} };

  const words = text.split(/\s+/);
  const maybeId = words.find((w) => isJobId(w));
  const maybeRef = words.find((w) => /^[0-9a-f-]{6,}$/i.test(w)) || '';

  const hasSlashPrefix = text.startsWith('/social');
  const hasPlainPrefix = text.startsWith(`${TRIGGER_PREFIX} `) || text === TRIGGER_PREFIX;
  if (hasSlashPrefix || hasPlainPrefix) {
    const parts = hasSlashPrefix
      ? text.split(/\s+/).slice(1)
      : text === TRIGGER_PREFIX
        ? ['help']
        : text.split(/\s+/).slice(1);
    const verb = parts[0] || 'help';
    if (verb === 'health') return { tool: 'health', args: {} };
    if (verb === 'send' && parts[2] === 'for' && parts[3] === 'approval') {
      return { tool: 'show_for_approval', args: { jobRef: parts[1] || '' } };
    }
    if (verb === 'review') return { tool: 'show_for_approval', args: { jobRef: parts[1] || '' } };
    if (verb === 'jobs') {
      const statusArg = parts[1] || 'active';
      const inferredLimit = /^\d+$/.test(statusArg) ? statusArg : parts[2];
      const status = /^\d+$/.test(statusArg) ? 'active' : statusArg;
      const sortArg = parts.find((p) => p === 'priority' || p === 'recent' || p === 'oldest') || '';
      return { tool: 'jobs', args: { status, limit: parseLimit(inferredLimit, 20, 50), sort: sortArg || 'recent' } };
    }
    if (verb === 'policy-check' || verb === 'policy_check' || verb === 'policy') return { tool: 'policy_check', args: { jobRef: parts[1] || '' } };
    if (verb === 'queue') return { tool: 'queue', args: { limit: parseLimit(parts[1], 10, 25) } };
    if (verb === 'next') return { tool: 'next', args: {} };
    if (verb === 'status') return { tool: 'status', args: { jobRef: parts[1] || '' } };
    if (verb === 'approve') return { tool: 'approve', args: { jobRef: parts[1] || '' } };
    if (verb === 'reject') return { tool: 'reject', args: { jobRef: parts[1] || '', reason: parts.slice(2).join(' ') || '' } };
    if (verb === 'regen' || verb === 'regenerate') return { tool: 'regen', args: { jobRef: parts[1] || '', reason: parts.slice(2).join(' ') || '' } };
    if (verb === 'retry-failed' || verb === 'retry_failed') return { tool: 'retry_failed', args: { limit: parseLimit(parts[1], 10, 25) } };
    if (verb === 'help') return { tool: 'help', args: {} };
    return { tool: 'chat', args: {} };
  }

  if (text.includes('queue') || text.includes('awaiting approval') || text.includes('what needs approval')) {
    return { tool: 'queue', args: { limit: parseLimit(words.find((w) => /^\d+$/.test(w)), 10, 25) } };
  }
  if (text.includes('list jobs') || text.includes('show jobs') || text === 'jobs') {
    return {
      tool: 'jobs',
      args: {
        status: 'active',
        limit: parseLimit(words.find((w) => /^\d+$/.test(w)), 20, 50),
        sort: words.includes('priority') ? 'priority' : 'recent',
      },
    };
  }
  if (text.includes('health') || text.includes('status of agent') || text.includes('system health')) {
    return { tool: 'health', args: {} };
  }
  if ((text.startsWith('send ') && text.includes(' for approval')) || text.startsWith('review ')) {
    return { tool: 'show_for_approval', args: { jobRef: maybeRef || '' } };
  }
  if (text.includes('policy-check') || text.includes('policy check')) {
    return { tool: 'policy_check', args: { jobRef: maybeRef || '' } };
  }
  if (text.includes('next')) return { tool: 'next', args: {} };
  if (text.includes('status') || text.includes('job')) {
    if (maybeRef) return { tool: 'status', args: { jobRef: maybeRef } };
  }
  if (text.includes('failed') && (text.includes('why') || text.includes('error') || text.includes('explain'))) {
    if (maybeRef) return { tool: 'explain_failure', args: { jobRef: maybeRef } };
  }
  if (text.includes('approve') && maybeRef) return { tool: 'approve', args: { jobRef: maybeRef } };
  if ((text.includes('reject') || text.includes('decline')) && maybeRef) return { tool: 'reject', args: { jobRef: maybeRef, reason: '' } };
  if ((text.includes('regen') || text.includes('regenerate')) && maybeRef) return { tool: 'regen', args: { jobRef: maybeRef, reason: '' } };
  if (text.includes('retry failed') || text.includes('retry-failed')) {
    return { tool: 'retry_failed', args: { limit: parseLimit(words.find((w) => /^\d+$/.test(w)), 10, 25) } };
  }
  if (text === 'help' || text.includes('commands')) return { tool: 'help', args: {} };
  return { tool: 'chat', args: {} };
}

function isAuthorizedForMutation(userId) {
  if (APPROVER_IDS.size === 0) return true;
  return APPROVER_IDS.has(String(userId || '').trim());
}

async function resolveJobId(jobRef) {
  const ref = String(jobRef || '').trim();
  if (!ref) {
    return { ok: false, error: 'missing_job_ref' };
  }
  if (isJobId(ref)) {
    return { ok: true, jobId: ref };
  }
  if (!/^[0-9a-f-]{6,}$/i.test(ref)) {
    return { ok: false, error: 'invalid_job_ref' };
  }
  const refLower = ref.toLowerCase();
  const { data, error } = await supabase
    .from('content_jobs')
    .select('id,status,updated_at')
    .order('updated_at', { ascending: false })
    .limit(300);
  if (error) {
    return { ok: false, error: `job_ref_lookup_failed: ${error.message}` };
  }
  const matches = (data || []).filter((r) => String(r.id || '').toLowerCase().startsWith(refLower)).slice(0, 3);
  if (matches.length === 0) {
    return { ok: false, error: 'job_not_found_for_ref' };
  }
  if (matches.length > 1) {
    return { ok: false, error: `ambiguous_job_ref: ${matches.map((r) => r.id).join(', ')}` };
  }
  return { ok: true, jobId: matches[0].id };
}

async function slackApi(method, body = null, query = null) {
  const url = new URL(`https://slack.com/api/${method}`);
  if (query && typeof query === 'object') {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  const response = await fetch(url.toString(), {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(`slack_${method}_failed: ${data?.error || `http_${response.status}`}`);
  }
  return data;
}

async function getCursor(source) {
  const { data, error } = await supabase
    .from('social_agent_cursors')
    .select('cursor')
    .eq('source', source)
    .maybeSingle();
  if (error) throw new Error(`load_cursor_failed(${source}): ${error.message}`);
  return data?.cursor || null;
}

async function setCursor(source, cursor) {
  const { error } = await supabase
    .from('social_agent_cursors')
    .upsert({ source, cursor: String(cursor), updated_at: nowIso() }, { onConflict: 'source' });
  if (error) throw new Error(`save_cursor_failed(${source}): ${error.message}`);
}

async function upsertThread({ workspaceId, channelId, threadTs, userId, lastSeenTs }) {
  const payload = {
    workspace_id: workspaceId,
    channel_id: channelId,
    thread_ts: threadTs,
    user_id: userId,
    last_seen_ts: lastSeenTs,
    updated_at: nowIso(),
  };
  const { data, error } = await supabase
    .from('social_agent_threads')
    .upsert(payload, { onConflict: 'workspace_id,channel_id,thread_ts,user_id' })
    .select('id,state')
    .single();
  if (error) throw new Error(`upsert_thread_failed: ${error.message}`);
  return { id: data.id, state: data.state || {} };
}

async function mergeThreadState(threadId, patch = {}) {
  const { data: row, error: loadError } = await supabase
    .from('social_agent_threads')
    .select('state')
    .eq('id', threadId)
    .maybeSingle();
  if (loadError) throw new Error(`load_thread_state_failed: ${loadError.message}`);
  const next = { ...(row?.state || {}), ...patch };
  const { error } = await supabase
    .from('social_agent_threads')
    .update({ state: next, updated_at: nowIso() })
    .eq('id', threadId);
  if (error) throw new Error(`save_thread_state_failed: ${error.message}`);
  return next;
}

function coerceIntentFromThreadFeedback(cleanText, threadState) {
  const activeJobId = String(threadState?.active_job_id || '').trim();
  if (!activeJobId || !isJobId(activeJobId)) return null;
  const t = String(cleanText || '').toLowerCase().trim();
  if (!t) return null;
  if (t.startsWith('/social') || t.startsWith(`${TRIGGER_PREFIX} `) || t === TRIGGER_PREFIX) return null;

  if (/\bapprove\b/.test(t)) {
    return { tool: 'approve', args: { jobRef: activeJobId } };
  }
  if (/\b(reject|decline)\b/.test(t)) {
    return { tool: 'reject', args: { jobRef: activeJobId, reason: cleanText } };
  }
  if (/\b(regen|regenerate|rewrite|revise|edit|change|remove|add)\b/.test(t)) {
    return { tool: 'regen', args: { jobRef: activeJobId, reason: cleanText } };
  }
  // Default threaded feedback on active review becomes regen request.
  return { tool: 'regen', args: { jobRef: activeJobId, reason: cleanText } };
}

async function insertMessage(threadId, role, content, metadata = {}, slackEventTs = null, userId = null) {
  const row = {
    thread_id: threadId,
    role,
    content: String(content || ''),
    metadata,
    slack_event_ts: slackEventTs || null,
    user_id: userId || null,
    created_at: nowIso(),
  };
  const { data, error } = await supabase
    .from('social_agent_messages')
    .upsert(row, { onConflict: 'thread_id,role,slack_event_ts', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`insert_message_failed: ${error.message}`);
  return data?.id || null;
}

async function logToolCall(threadId, messageId, toolName, toolInput, status, toolOutput = null, errorMessage = null) {
  const row = {
    thread_id: threadId,
    message_id: messageId,
    tool_name: toolName,
    tool_input: toolInput || {},
    tool_output: toolOutput,
    status,
    error_message: errorMessage,
    created_at: nowIso(),
  };
  const { error } = await supabase.from('social_agent_tool_calls').insert(row);
  if (error) {
    console.error(`⚠️ log_tool_call_failed: ${error.message}`);
  }
}

async function loadRecentMessages(threadId, limit = 12) {
  const { data, error } = await supabase
    .from('social_agent_messages')
    .select('role,content,created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`load_recent_messages_failed: ${error.message}`);
  return (data || []).reverse();
}

async function loadLatestSocialCopy(jobId) {
  const { data, error } = await supabase
    .from('content_artifacts')
    .select('content,version,created_at')
    .eq('job_id', jobId)
    .eq('artifact_type', 'social_copy')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`load_social_copy_failed: ${error.message}`);
  return {
    text: String(data?.content?.text || '').trim(),
    version: Number(data?.version || 0),
    created_at: data?.created_at || null,
  };
}

async function waitForRegeneratedCopy(jobId, previousVersion = 0, timeoutMs = REGEN_WAIT_MS, pollMs = REGEN_POLL_MS) {
  const deadline = Date.now() + Math.max(5000, Number(timeoutMs || 0));
  const baseline = Number(previousVersion || 0);
  while (Date.now() < deadline) {
    const latest = await loadLatestSocialCopy(jobId);
    if (latest.text && Number(latest.version || 0) > baseline) {
      return { ok: true, copy: latest };
    }
    await sleep(Math.max(1000, Number(pollMs || 0)));
  }
  return { ok: false, copy: null };
}

async function runTool(tool, args = {}, actor = {}) {
  const actorId = String(actor.userId || '').trim();
  const isMutation = ['approve', 'reject', 'regen', 'retry_failed'].includes(tool);
  if (isMutation && !isAuthorizedForMutation(actorId)) {
    return {
      ok: false,
      text: `🔒 Not authorized for ${tool}. Ask an approved operator to run this action.`,
      payload: { tool, args, actor_user_id: actorId, denied: true },
      code: 'unauthorized',
    };
  }

  if (tool === 'help') {
    return {
      ok: true,
      text: [
        '📘 Social conversation commands:',
        '- "health"',
        '- "jobs [status] [limit]"',
        '- "send <job_id_or_prefix> for approval"',
        '- "review <job_id_or_prefix>"',
        '- "what needs approval?"',
        '- "next approval"',
        '- "status <job_id>"',
        '- "policy-check <job_id>"',
        '- "why failed <job_id>"',
        '- "approve <job_id>"',
        '- "reject <job_id> <reason>"',
        '- "regen <job_id> <reason>"',
        '- "retry-failed 5"',
      ].join('\n'),
      payload: { tool, args },
    };
  }

  if (tool === 'show_for_approval') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) {
      return { ok: true, text: `🟡 Provide a valid job id or unique prefix. Error: ${resolved.error}`, payload: null };
    }
    const jobId = resolved.jobId;
    const { data: job, error: jobError } = await supabase
      .from('content_jobs')
      .select('id,site_id,profile_name,status,approval_status,payload,updated_at')
      .eq('id', jobId)
      .maybeSingle();
    if (jobError) throw new Error(`show_for_approval_job_failed: ${jobError.message}`);
    if (!job) return { ok: true, text: `⚪ Job ${jobId} not found.`, payload: null };

    const copy = await loadLatestSocialCopy(jobId);
    if (!copy.text) {
      return {
        ok: true,
        text: `⚪ No social_copy artifact found for ${jobId}.`,
        payload: { jobId, has_copy: false },
      };
    }
    return {
      ok: true,
      text: [
        `📝 Approval review: ${jobId}`,
        `🌐 Site/Profile: ${job.site_id} / ${job.profile_name || 'N/A'}`,
        `📌 Status: ${job.status}/${job.approval_status || 'n/a'}`,
        `🧾 Copy version: v${copy.version || '?'} (${copy.created_at || 'n/a'})`,
        'Use:',
        `• social approve ${String(jobId).slice(0, 8)}`,
        `• social reject ${String(jobId).slice(0, 8)} <reason>`,
        `• social regen ${String(jobId).slice(0, 8)} <reason>`,
      ].join('\n'),
      payload: { jobId, copy_text: copy.text, copy_version: copy.version, job },
    };
  }

  if (tool === 'jobs') {
    const status = String(args.status || 'active').toLowerCase();
    const limit = parseLimit(args.limit, 20, 50);
    const sort = String(args.sort || 'recent').toLowerCase();
    const q = supabase
      .from('content_jobs')
      .select('id,site_id,profile_name,status,approval_status,scheduled_for,created_at,updated_at,payload')
      .limit(limit);

    if (status === 'pending') {
      q.eq('status', 'awaiting_approval');
    } else if (status === 'failed') {
      q.eq('status', 'failed');
    } else if (status === 'queued') {
      q.eq('status', 'queued');
    } else if (status === 'running') {
      q.eq('status', 'running');
    } else if (status === 'completed') {
      q.eq('status', 'completed');
    } else if (status === 'active') {
      q.in('status', ['queued', 'running', 'awaiting_approval', 'retryable', 'failed']);
    } else if (status === 'all' || status === 'recent') {
      // no extra filter
    } else {
      return {
        ok: true,
        text: '🟡 Invalid jobs status filter. Use: active | pending | failed | queued | running | completed | all',
        payload: { status, limit },
      };
    }

    if (sort === 'oldest') {
      q.order('updated_at', { ascending: true });
    } else {
      q.order('updated_at', { ascending: false });
    }

    const { data, error } = await q;
    if (error) throw new Error(`jobs_query_failed: ${error.message}`);
    if (!data || data.length === 0) {
      return { ok: true, text: `⚪ No jobs found for filter "${status}".`, payload: { status, limit, count: 0 } };
    }

    const statusRank = (r) => {
      const s = String(r.status || '').toLowerCase();
      const a = String(r.approval_status || '').toLowerCase();
      if (s === 'awaiting_approval' || a === 'pending') return 1;
      if (s === 'failed') return 2;
      if (s === 'retryable') return 3;
      if (s === 'running') return 4;
      if (s === 'queued') return 5;
      if (s === 'completed') return 6;
      return 9;
    };

    const sorted = sort === 'priority'
      ? [...data].sort((a, b) => {
          const ra = statusRank(a);
          const rb = statusRank(b);
          if (ra !== rb) return ra - rb;
          const ta = Date.parse(a.updated_at || a.created_at || '') || 0;
          const tb = Date.parse(b.updated_at || b.created_at || '') || 0;
          return ta - tb; // oldest first for same rank
        })
      : data;

    const lines = sorted.map((r, i) => {
      const shortId = String(r.id).slice(0, 8);
      const intent = inferPostIntent(r.payload || {});
      const title = truncateText(inferJobTitle(r.payload || {}), 52);
      const queuedAt = String(r.scheduled_for || r.created_at || r.updated_at || '').slice(0, 16).replace('T', ' ');
      const icon = statusEmoji(r.status, r.approval_status);
      return [
        `${i + 1}. ${icon} id: ${r.id} (${shortId})`,
        `   📝 title: ${title}`,
        `   🌐 site/profile: ${r.site_id} / ${truncateText(r.profile_name || 'N/A', 28)}`,
        `   🎯 intent: ${intent}`,
        `   📌 status: ${r.status}/${r.approval_status || 'n/a'}`,
        `   🗓 queued: ${queuedAt}`,
      ].join('\n');
    });
    return {
      ok: true,
      text: [
        `📋 Jobs (${status}, showing ${sorted.length}, sort=${sort}):`,
        ...lines,
        '🧭 Drill down:',
        '• social status <job_id_or_prefix>',
        '• social policy-check <job_id_or_prefix>',
      ].join('\n'),
      payload: { status, limit, sort, count: sorted.length, jobs: sorted },
    };
  }

  if (tool === 'policy_check') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) {
      return { ok: true, text: `🟡 Provide a valid job id or unique prefix. Error: ${resolved.error}`, payload: { error: resolved.error } };
    }
    const jobId = resolved.jobId;
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id,job_type,status,approval_status,payload')
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw new Error(`policy_check_query_failed: ${error.message}`);
    if (!data) return { ok: true, text: `⚪ Job ${jobId} not found.`, payload: null };

    const payload = data.payload || {};
    const postIntentRaw = String(payload.post_intent || '').trim().toLowerCase();
    const articleId = String(payload.article_id || '').trim();
    const inferredIntent = postIntentRaw || (articleId ? 'promotion' : 'native');
    const requiresArticle = (data.job_type || 'social_post') === 'social_post' && inferredIntent === 'promotion';
    const eligible = !requiresArticle || !!articleId;

    return {
      ok: true,
      text: [
        '🧪 Policy check',
        `🆔 ${jobId}`,
        `🏷 job_type: ${data.job_type || 'social_post'}`,
        `🎯 post_intent: ${inferredIntent}${postIntentRaw ? '' : ' (inferred)'}`,
        `🔗 article_id: ${articleId || 'none'}`,
        `${eligible ? '🟢' : '🔴'} approval eligible: ${eligible ? 'yes' : 'no (promotion requires article_id)'}`,
      ].join('\n'),
      payload: { jobId, inferred_intent: inferredIntent, article_id: articleId || null, eligible },
    };
  }

  if (tool === 'health') {
    const checks = [];
    const testMessages = [{ role: 'user', content: 'Reply with OK only.' }];

    const primary = await chatCompletionRequest({
      baseUrl: PRIMARY_BASE_URL,
      apiKey: PRIMARY_API_KEY,
      model: PRIMARY_MODEL,
      messages: testMessages,
    });
    checks.push({
      provider: 'ollama_primary',
      ok: !!primary.ok,
      detail: primary.ok ? 'reachable' : String(primary.reason || 'unreachable'),
      model: PRIMARY_MODEL,
      base_url: PRIMARY_BASE_URL,
    });

    const secondary = await chatCompletionRequest({
      baseUrl: SECONDARY_BASE_URL,
      apiKey: SECONDARY_API_KEY,
      model: SECONDARY_MODEL,
      messages: testMessages,
    });
    checks.push({
      provider: 'llama_cpp_secondary',
      ok: !!secondary.ok,
      detail: secondary.ok ? 'reachable' : String(secondary.reason || 'unreachable'),
      model: SECONDARY_MODEL,
      base_url: SECONDARY_BASE_URL,
    });

    const deepseekEnabled = ENABLE_DEEPSEEK_FALLBACK && !!DEEPSEEK_API_KEY;
    let deepseek = { ok: false, reason: deepseekEnabled ? 'unreachable' : 'disabled_no_api_key' };
    if (deepseekEnabled) {
      deepseek = await deepseekChat(testMessages);
    }
    checks.push({
      provider: 'deepseek_fallback',
      ok: !!deepseek.ok,
      detail: deepseek.ok ? 'reachable' : String(deepseek.reason || 'unreachable'),
      model: DEEPSEEK_MODEL,
      enabled: deepseekEnabled,
    });

    const { data: recentErrors, error: recentErrorsError } = await supabase
      .from('social_agent_tool_calls')
      .select('created_at,tool_name,error_message')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(5);
    if (recentErrorsError) {
      throw new Error(`health_recent_errors_failed: ${recentErrorsError.message}`);
    }

    const healthyPrimary = checks[0]?.ok;
    const healthySecondary = checks[1]?.ok;
    const summary = healthyPrimary || healthySecondary ? 'healthy' : 'degraded';
    const lines = [
      `${summary === 'healthy' ? '🟢' : '🟠'} Social agent health: ${summary}`,
      `${checks[0].ok ? '🟢' : '🔴'} ollama_primary (${PRIMARY_MODEL}): ${checks[0].ok ? 'ok' : `error (${checks[0].detail})`}`,
      `${checks[1].ok ? '🟢' : '🔴'} llama_cpp_secondary (${SECONDARY_MODEL}): ${checks[1].ok ? 'ok' : `error (${checks[1].detail})`}`,
      `${checks[2].ok ? '🟢' : '⚪'} deepseek_fallback (${DEEPSEEK_MODEL}): ${checks[2].ok ? 'ok' : (checks[2].detail === 'disabled_no_api_key' ? 'disabled (no api key)' : `error (${checks[2].detail})`)}`,
    ];
    if (Array.isArray(recentErrors) && recentErrors.length > 0) {
      lines.push('🔎 Recent tool errors:');
      for (const row of recentErrors) {
        lines.push(`🔸 ${row.created_at} | ${row.tool_name} | ${row.error_message || 'unknown'}`);
      }
    } else {
      lines.push('✅ Recent tool errors: none');
    }

    return {
      ok: true,
      text: lines.join('\n'),
      payload: { checks, recent_errors: recentErrors || [] },
    };
  }

  if (tool === 'queue') {
    const limit = parseLimit(args.limit, 10, 25);
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id,site_id,profile_name,status,updated_at')
      .eq('requires_approval', true)
      .eq('approval_status', 'awaiting_approval')
      .order('updated_at', { ascending: true })
      .limit(limit);
    if (error) throw new Error(`queue_query_failed: ${error.message}`);
    if (!data || data.length === 0) {
      return { ok: true, text: '⚪ No jobs are currently awaiting approval.', payload: { count: 0 } };
    }
    const lines = data.map((r, i) => `${i + 1}. ${r.id} | ${r.site_id} | ${r.profile_name || 'N/A'} | ${r.status}`);
    return { ok: true, text: `🟡 Awaiting approval (${data.length} shown):\n${lines.join('\n')}`, payload: { count: data.length, jobs: data } };
  }

  if (tool === 'next') {
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id,site_id,profile_name,status,approval_status,last_error,updated_at')
      .eq('requires_approval', true)
      .eq('approval_status', 'awaiting_approval')
      .order('updated_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`next_query_failed: ${error.message}`);
    if (!data) return { ok: true, text: '⚪ No jobs are currently awaiting approval.', payload: null };
    return {
      ok: true,
      text: [
        '🟡 Next approval job:',
        `Job: ${data.id}`,
        `Site: ${data.site_id}`,
        `Profile: ${data.profile_name || 'N/A'}`,
        `Status: ${data.status} (${data.approval_status})`,
        `Updated: ${data.updated_at}`,
        `Approve: /social approve ${data.id}`,
      ].join('\n'),
      payload: data,
    };
  }

  if (tool === 'status') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) return { ok: true, text: `Provide a valid job id or unique prefix. Error: ${resolved.error}`, payload: null };
    const jobId = resolved.jobId;
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id,site_id,profile_name,status,approval_status,requires_approval,last_error,attempt_count,updated_at')
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw new Error(`status_query_failed: ${error.message}`);
    if (!data) return { ok: true, text: `⚪ Job ${jobId} not found.`, payload: null };
    return {
      ok: true,
      text: [
        `${statusEmoji(data.status, data.approval_status)} Job status`,
        `Job: ${data.id}`,
        `Site: ${data.site_id}`,
        `Profile: ${data.profile_name || 'N/A'}`,
        `Status: ${data.status}`,
        `Approval: ${data.approval_status}`,
        `Requires approval: ${data.requires_approval ? 'yes' : 'no'}`,
        `Attempt count: ${data.attempt_count || 0}`,
        `Last error: ${data.last_error || 'none'}`,
      ].join('\n'),
      payload: data,
    };
  }

  if (tool === 'explain_failure') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) return { ok: true, text: `Provide a valid job id or unique prefix. Error: ${resolved.error}`, payload: null };
    const jobId = resolved.jobId;
    const { data, error } = await supabase
      .from('content_job_trace')
      .select('created_at,source,action,stage,severity,message,details')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(8);
    if (error) throw new Error(`trace_query_failed: ${error.message}`);
    if (!data || data.length === 0) {
      return { ok: true, text: `⚪ No trace rows found for ${jobId}.`, payload: null };
    }
    const head = data[0];
    const lines = data.map((r, i) => `${i + 1}. ${r.created_at} | ${r.stage}/${r.action} | ${r.severity} | ${r.message}`);
    return {
      ok: true,
      text: [
        `🔍 Failure trace for ${jobId}:`,
        `Latest: ${head.stage}/${head.action} (${head.severity})`,
        ...lines,
      ].join('\n'),
      payload: data,
    };
  }

  if (tool === 'approve') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) {
      return { ok: true, text: '🟡 Provide a valid job id. Example: approve ba63f499-9ed3-48f3-b73a-b90a1c5f4284', payload: null };
    }
    const jobId = resolved.jobId;
    const actorName = String(actor.userName || actorId || WORKER_NAME);
    const { error } = await supabase.rpc('approve_content_job', {
      p_job_id: jobId,
      p_actor: `slack-conversation:${actorName}`,
    });
    if (error) {
      return { ok: false, text: `🔴 Approve failed for ${jobId}: ${error.message}`, payload: { jobId, error: error.message } };
    }
    try {
      await supabase.rpc('log_content_review_action', {
        p_job_id: jobId,
        p_action: 'approve',
        p_actor: actorName,
        p_actor_user_id: actorId || null,
        p_channel: 'slack_conversation',
        p_reason: 'Approved from conversation worker',
        p_metadata: { source: 'social_conversation' },
      });
    } catch (_) {
      // best effort
    }
    return { ok: true, text: `🟢 Approved job ${jobId}. Re-queued for publish.`, payload: { jobId } };
  }

  if (tool === 'reject') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) {
      return { ok: true, text: '🟡 Provide a valid job id. Example: reject ba63f499-9ed3-48f3-b73a-b90a1c5f4284 wrong tone', payload: null };
    }
    const jobId = resolved.jobId;
    const reason = String(args.reason || '').trim() || 'Rejected from conversation worker';
    const actorName = String(actor.userName || actorId || WORKER_NAME);
    const { error } = await supabase.rpc('reject_content_job', {
      p_job_id: jobId,
      p_actor: `slack-conversation:${actorName}`,
      p_reason: reason,
    });
    if (error) {
      return { ok: false, text: `🔴 Reject failed for ${jobId}: ${error.message}`, payload: { jobId, error: error.message } };
    }
    try {
      await supabase.rpc('log_content_review_action', {
        p_job_id: jobId,
        p_action: 'reject',
        p_actor: actorName,
        p_actor_user_id: actorId || null,
        p_channel: 'slack_conversation',
        p_reason: reason,
        p_metadata: { source: 'social_conversation' },
      });
    } catch (_) {
      // best effort
    }
    return { ok: true, text: `🟢 Rejected job ${jobId}. Reason: ${reason}`, payload: { jobId, reason } };
  }

  if (tool === 'regen') {
    const resolved = await resolveJobId(args.jobRef);
    if (!resolved.ok) {
      return { ok: true, text: '🟡 Provide a valid job id. Example: regen ba63f499-9ed3-48f3-b73a-b90a1c5f4284 make it tighter', payload: null };
    }
    const jobId = resolved.jobId;
    const reason = String(args.reason || '').trim() || 'Regenerate requested from conversation worker';
    const previousCopy = await loadLatestSocialCopy(jobId);
    const actorName = String(actor.userName || actorId || WORKER_NAME);
    const { error } = await supabase.rpc('request_edit_content_job', {
      p_job_id: jobId,
      p_actor: `slack-conversation:${actorName}`,
      p_reason: reason,
    });
    if (error) {
      return { ok: false, text: `🔴 Regenerate failed for ${jobId}: ${error.message}`, payload: { jobId, error: error.message } };
    }
    try {
      await supabase.rpc('log_content_review_action', {
        p_job_id: jobId,
        p_action: 'regenerate',
        p_actor: actorName,
        p_actor_user_id: actorId || null,
        p_channel: 'slack_conversation',
        p_reason: reason,
        p_metadata: { source: 'social_conversation' },
      });
    } catch (_) {
      // best effort
    }
    return {
      ok: true,
      text: `🟢 Regeneration requested for ${jobId}. Reason: ${reason}`,
      payload: { jobId, reason, previous_copy_version: Number(previousCopy?.version || 0) },
    };
  }

  if (tool === 'retry_failed') {
    const limit = parseLimit(args.limit, 10, 25);
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id,site_id,profile_name')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`retry_failed_list_failed: ${error.message}`);
    if (!data || data.length === 0) {
      return { ok: true, text: '⚪ No failed jobs found to retry.', payload: { count: 0 } };
    }
    const jobIds = data.map((r) => r.id);
    const { error: updateError } = await supabase
      .from('content_jobs')
      .update({
        status: 'queued',
        last_error: null,
        updated_at: nowIso(),
      })
      .in('id', jobIds);
    if (updateError) throw new Error(`retry_failed_update_failed: ${updateError.message}`);
    const lines = data.map((r, i) => `${i + 1}. ${r.id} | ${r.site_id} | ${r.profile_name || 'N/A'}`);
    return { ok: true, text: `🟢 Re-queued ${data.length} failed job(s):\n${lines.join('\n')}`, payload: { count: data.length, jobs: data } };
  }

  return { ok: false, text: `Unknown tool: ${tool}`, payload: { tool, args } };
}

async function chatCompletionRequest({ baseUrl, apiKey, model, messages }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 450,
        stream: false,
        messages,
      }),
    });
    const raw = await response.text();
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
  } catch (err) {
    if (err && err.name === 'AbortError') return { ok: false, reason: `timeout_${TIMEOUT_MS}ms` };
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

async function deepseekChat(messages) {
  if (!ENABLE_DEEPSEEK_FALLBACK || !DEEPSEEK_API_KEY) {
    return { ok: false, reason: 'deepseek_disabled' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0.2,
        max_tokens: 450,
        messages,
      }),
    });
    const raw = await response.text();
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
  } catch (err) {
    if (err && err.name === 'AbortError') return { ok: false, reason: `timeout_${TIMEOUT_MS}ms` };
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

async function runModelFallback(messages) {
  const tries = [
    { provider: 'ollama_primary', fn: () => chatCompletionRequest({ baseUrl: PRIMARY_BASE_URL, apiKey: PRIMARY_API_KEY, model: PRIMARY_MODEL, messages }) },
    { provider: 'llama_cpp_secondary', fn: () => chatCompletionRequest({ baseUrl: SECONDARY_BASE_URL, apiKey: SECONDARY_API_KEY, model: SECONDARY_MODEL, messages }) },
    { provider: 'deepseek_fallback', fn: () => deepseekChat(messages) },
  ];
  for (const attempt of tries) {
    if (attempt.provider === 'deepseek_fallback' && (!ENABLE_DEEPSEEK_FALLBACK || !DEEPSEEK_API_KEY)) {
      continue;
    }
    const result = await attempt.fn();
    if (result.ok) return { ok: true, provider: attempt.provider, text: result.text };
  }
  return { ok: false, provider: null, text: 'I could not generate a response right now. Try `/social queue 10` or `/social status <job_id>`.' };
}

function shouldProcessMessage(msg, botUserId, includeIm = false) {
  if (!msg || msg.subtype) return false;
  if (msg.bot_id) return false;
  if (botUserId && msg.user === botUserId) return false;

  const text = String(msg.text || '');
  const normalized = normalizeText(text).toLowerCase();
  const mention = botUserId ? text.includes(`<@${botUserId}>`) : false;
  const prefix = normalized.startsWith(`${TRIGGER_PREFIX} `) || normalized === TRIGGER_PREFIX;
  const socialSlash = normalized.startsWith('/social');
  const isIm = String(msg.channel_type || '') === 'im';

  return mention || prefix || socialSlash || (includeIm && isIm);
}

async function postReply(channel, threadTs, text) {
  await slackApi('chat.postMessage', {
    channel,
    text: String(text || '').slice(0, 3900),
    thread_ts: threadTs || undefined,
    mrkdwn: false,
  });
}

async function resolveBotUserId() {
  if (SLACK_BOT_USER_ID) return SLACK_BOT_USER_ID;
  const auth = await slackApi('auth.test');
  return String(auth?.user_id || '');
}

function buildAssistantPrompt(userMessage, toolContext) {
  return [
    {
      role: 'system',
      content: [
        'You are the Social Orchestrator assistant for internal operations.',
        'Be concise, direct, and practical.',
        'Never claim an action happened unless it is in provided tool results.',
        'Prefer actionable next steps.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `User message: ${userMessage}`,
        '',
        'Tool context:',
        toolContext || 'No tool context available.',
      ].join('\n'),
    },
  ];
}

async function processMessage(workspaceId, channelId, botUserId, msg) {
  const threadTs = String(msg.thread_ts || msg.ts);
  const userId = String(msg.user || '');
  const sourceText = String(msg.text || '').slice(0, MAX_INPUT_CHARS);
  const cleanText = normalizeText(sourceText);

  const thread = await upsertThread({
    workspaceId,
    channelId,
    threadTs,
    userId: userId || 'unknown',
    lastSeenTs: msg.ts,
  });
  const threadId = thread.id;

  const userMessageId = await insertMessage(threadId, 'user', cleanText, {
    source: 'slack_poll',
    channel_id: channelId,
    thread_ts: threadTs,
    worker: WORKER_NAME,
  }, msg.ts, userId);

  let intent = extractIntent(cleanText);
  if (intent.tool === 'chat') {
    const coerced = coerceIntentFromThreadFeedback(cleanText, thread.state || {});
    if (coerced) intent = coerced;
  }
  let toolResult = null;
  let toolError = null;
  if (intent.tool !== 'chat') {
    try {
      toolResult = await runTool(intent.tool, intent.args || {}, {
        userId,
        userName: String(msg.username || ''),
      });
      await logToolCall(
        threadId,
        userMessageId,
        intent.tool,
        intent.args || {},
        toolResult.ok ? 'ok' : 'error',
        toolResult.payload || null,
        toolResult.ok ? null : (toolResult.text || toolResult.code || 'tool_failed')
      );
    } catch (err) {
      toolError = err instanceof Error ? err.message : String(err);
      await logToolCall(threadId, userMessageId, intent.tool, intent.args || {}, 'error', null, toolError);
    }
  }

  let replyText = '';
  if (toolResult && intent.tool !== 'chat') {
    replyText = toolResult.text;
    if (intent.tool === 'show_for_approval' && toolResult.ok && toolResult?.payload?.jobId) {
      await mergeThreadState(threadId, {
        active_job_id: toolResult.payload.jobId,
        review_mode: 'approval',
        last_reviewed_at: nowIso(),
      });
    }
    if (['approve', 'reject'].includes(intent.tool) && toolResult.ok) {
      await mergeThreadState(threadId, {
        review_mode: 'closed',
      });
    }
    if (intent.tool === 'regen' && toolResult.ok) {
      await mergeThreadState(threadId, {
        review_mode: 'approval',
        last_feedback_at: nowIso(),
      });
    }
    if (intent.tool === 'show_for_approval' && toolResult.ok && toolResult?.payload?.copy_text) {
      const copyText = String(toolResult.payload.copy_text || '').trim();
      const chunks = splitForSlack(copyText, 2800);
      await insertMessage(threadId, 'assistant', replyText, {
        source: 'slack_poll',
        worker: WORKER_NAME,
        intent: intent.tool,
      }, null, botUserId);
      await postReply(channelId, threadTs, replyText);
      for (let i = 0; i < chunks.length; i += 1) {
        const part = `📄 Post copy ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}\n${chunks[i]}`;
        await insertMessage(threadId, 'assistant', part, {
          source: 'slack_poll',
          worker: WORKER_NAME,
          intent: 'show_for_approval_copy',
        }, null, botUserId);
        await postReply(channelId, threadTs, part);
      }
      return;
    }
    if (intent.tool === 'regen' && toolResult.ok && toolResult?.payload?.jobId) {
      const jobId = String(toolResult.payload.jobId);
      const previousVersion = Number(toolResult?.payload?.previous_copy_version || 0);
      const waitingLine = `⏳ Watching for regenerated draft in this thread (up to ${Math.round(REGEN_WAIT_MS / 1000)}s)...`;
      const initialText = `${replyText}\n${waitingLine}`;
      await insertMessage(threadId, 'assistant', initialText, {
        source: 'slack_poll',
        worker: WORKER_NAME,
        intent: 'regen_waiting',
      }, null, botUserId);
      await postReply(channelId, threadTs, initialText);

      const regenerated = await waitForRegeneratedCopy(jobId, previousVersion, REGEN_WAIT_MS, REGEN_POLL_MS);
      if (!regenerated.ok || !regenerated.copy?.text) {
        const timeoutText = `🟡 Regeneration still processing for ${jobId}. Run \`social send ${jobId.slice(0, 8)} for approval\` in this thread in ~1-2 minutes.`;
        await insertMessage(threadId, 'assistant', timeoutText, {
          source: 'slack_poll',
          worker: WORKER_NAME,
          intent: 'regen_timeout',
        }, null, botUserId);
        await postReply(channelId, threadTs, timeoutText);
        return;
      }

      const copyText = String(regenerated.copy.text || '').trim();
      const copyChunks = splitForSlack(copyText, 2800);
      const header = [
        `📝 Updated draft ready: ${jobId}`,
        `🧾 Copy version: v${regenerated.copy.version || '?'} (${regenerated.copy.created_at || 'n/a'})`,
        'Use:',
        `• social approve ${jobId.slice(0, 8)}`,
        `• social reject ${jobId.slice(0, 8)} <reason>`,
        `• social regen ${jobId.slice(0, 8)} <reason>`,
      ].join('\n');
      await insertMessage(threadId, 'assistant', header, {
        source: 'slack_poll',
        worker: WORKER_NAME,
        intent: 'regen_ready',
      }, null, botUserId);
      await postReply(channelId, threadTs, header);
      for (let i = 0; i < copyChunks.length; i += 1) {
        const part = `📄 Post copy ${copyChunks.length > 1 ? `(${i + 1}/${copyChunks.length})` : ''}\n${copyChunks[i]}`;
        await insertMessage(threadId, 'assistant', part, {
          source: 'slack_poll',
          worker: WORKER_NAME,
          intent: 'regen_copy',
        }, null, botUserId);
        await postReply(channelId, threadTs, part);
      }
      await mergeThreadState(threadId, {
        active_job_id: jobId,
        review_mode: 'approval',
        last_reviewed_at: nowIso(),
      });
      return;
    }
  } else {
    const recent = await loadRecentMessages(threadId, 10);
    const briefHistory = recent
      .slice(-6)
      .map((m) => `${m.role}: ${String(m.content || '').slice(0, 320)}`)
      .join('\n');
    const toolContext = toolError
      ? `Tool error: ${toolError}`
      : toolResult
        ? `${toolResult.text}\n\nPayload: ${JSON.stringify(toolResult.payload || {}).slice(0, 800)}`
        : 'No direct tool call executed.';
    const messages = buildAssistantPrompt(
      cleanText,
      `${toolContext}\n\nRecent thread history:\n${briefHistory}`
    );
    const llm = await runModelFallback(messages);
    replyText = llm.text;
    await logToolCall(
      threadId,
      userMessageId,
      'chat_model',
      { intent: intent.tool, args: intent.args || {} },
      llm.ok ? 'ok' : 'error',
      { provider: llm.provider },
      llm.ok ? null : 'all_model_fallbacks_failed'
    );
  }

  await insertMessage(threadId, 'assistant', replyText, {
    source: 'slack_poll',
    worker: WORKER_NAME,
    intent: intent.tool,
  }, null, botUserId);

  await postReply(channelId, threadTs, replyText);
}

async function processChannel(workspaceId, botUserId, channelId) {
  const source = `slack:${channelId}`;
  const oldest = await getCursor(source);
  let history;
  try {
    history = await slackApi('conversations.history', null, {
      channel: channelId,
      inclusive: false,
      oldest: oldest || undefined,
      limit: 60,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('channel_not_found') || msg.includes('not_in_channel')) {
      if (!WARNED_INACCESSIBLE_CHANNELS.has(channelId)) {
        console.warn(`⚠️ skipping channel ${channelId}: ${msg}`);
        WARNED_INACCESSIBLE_CHANNELS.add(channelId);
      }
      return;
    }
    throw err;
  }
  const messages = Array.isArray(history?.messages) ? history.messages : [];
  if (messages.length === 0) return;
  const ordered = messages.slice().sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  let newestTs = oldest;

  for (const msg of ordered) {
    const ts = String(msg.ts || '');
    if (!ts) continue;
    if (!newestTs || Number(ts) > Number(newestTs)) newestTs = ts;
    if (!shouldProcessMessage(msg, botUserId, INCLUDE_IM)) continue;
    try {
      await processMessage(workspaceId, channelId, botUserId, msg);
    } catch (err) {
      console.error(`process_message_failed(${channelId}/${ts}): ${err instanceof Error ? err.message : String(err)}`);
    }
    if (msg.thread_ts === msg.ts && Number(msg.reply_count || 0) > 0) {
      try {
        await processThreadReplies(workspaceId, channelId, botUserId, String(msg.thread_ts));
      } catch (err) {
        console.error(`process_thread_replies_failed(${channelId}/${msg.thread_ts}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  if (newestTs) {
    await setCursor(source, newestTs);
  }
}

async function processThreadReplies(workspaceId, channelId, botUserId, threadTs) {
  const source = `slack:${channelId}:thread:${threadTs}`;
  const oldest = await getCursor(source);
  let replies;
  try {
    replies = await slackApi('conversations.replies', null, {
      channel: channelId,
      ts: threadTs,
      oldest: oldest || undefined,
      inclusive: false,
      limit: 100,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('thread_not_found') || msg.includes('channel_not_found') || msg.includes('not_in_channel')) {
      return;
    }
    throw err;
  }
  const messages = Array.isArray(replies?.messages) ? replies.messages : [];
  if (messages.length === 0) return;
  const ordered = messages
    .filter((m) => String(m.ts || '') !== String(threadTs))
    .sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  let newestTs = oldest;
  for (const msg of ordered) {
    const ts = String(msg.ts || '');
    if (!ts) continue;
    if (!newestTs || Number(ts) > Number(newestTs)) newestTs = ts;
    // In thread mode, process all human replies so natural feedback can drive stateful actions.
    if (msg.subtype || msg.bot_id) continue;
    if (botUserId && msg.user === botUserId) continue;
    try {
      await processMessage(workspaceId, channelId, botUserId, msg);
    } catch (err) {
      console.error(`process_thread_message_failed(${channelId}/${threadTs}/${ts}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (newestTs) {
    await setCursor(source, newestTs);
  }
}

async function resolveChannels() {
  const channels = new Set(CHANNEL_IDS);
  // Always add channels the bot can read to avoid hard failures when configured channels are stale.
  try {
    let publicCursor = null;
    do {
      const res = await slackApi('users.conversations', null, {
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
        cursor: publicCursor || undefined,
      });
      for (const c of res?.channels || []) {
        if (c?.id) channels.add(String(c.id));
      }
      publicCursor = res?.response_metadata?.next_cursor || null;
    } while (publicCursor);
  } catch (err) {
    console.warn(`⚠️ users.conversations unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!INCLUDE_IM) return Array.from(channels);

  let cursor = null;
  do {
    const res = await slackApi('conversations.list', null, {
      types: 'im',
      exclude_archived: true,
      limit: 200,
      cursor: cursor || undefined,
    });
    for (const c of res?.channels || []) {
      if (c?.id) channels.add(String(c.id));
    }
    cursor = res?.response_metadata?.next_cursor || null;
  } while (cursor);
  return Array.from(channels);
}

async function loadActiveReviewThreads(workspaceId, limit = 250) {
  const { data, error } = await supabase
    .from('social_agent_threads')
    .select('channel_id,thread_ts,state,updated_at')
    .eq('workspace_id', workspaceId)
    .filter('state->>review_mode', 'eq', 'approval')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`load_active_review_threads_failed: ${error.message}`);
  const unique = new Map();
  for (const row of data || []) {
    const channelId = String(row.channel_id || '').trim();
    const threadTs = String(row.thread_ts || '').trim();
    if (!channelId || !threadTs) continue;
    const key = `${channelId}:${threadTs}`;
    if (!unique.has(key)) unique.set(key, { channelId, threadTs });
  }
  return Array.from(unique.values());
}

async function tick() {
  const auth = await slackApi('auth.test');
  const workspaceId = String(auth?.team_id || 'unknown');
  const botUserId = await resolveBotUserId();
  const channels = await resolveChannels();
  for (const channelId of channels) {
    await processChannel(workspaceId, botUserId, channelId);
  }
  const activeThreads = await loadActiveReviewThreads(workspaceId);
  for (const t of activeThreads) {
    try {
      await processThreadReplies(workspaceId, t.channelId, botUserId, t.threadTs);
    } catch (err) {
      console.error(`active_thread_sweep_failed(${t.channelId}/${t.threadTs}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function main() {
  if (ONCE) {
    await tick();
    return;
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error(`tick_failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(POLL_MS);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
