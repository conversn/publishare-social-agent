#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REVIEW_SLACK_WEBHOOK_URL =
  process.env.SOCIAL_REVIEW_SLACK_WEBHOOK_URL ||
  process.env.SLACK_WEBHOOK_URL ||
  '';
const ORCHESTRATOR_SLACK_WEBHOOK_URL =
  process.env.SOCIAL_ORCHESTRATOR_SLACK_WEBHOOK_URL ||
  process.env.SOCIAL_AUDIT_SLACK_WEBHOOK_URL ||
  REVIEW_SLACK_WEBHOOK_URL;
const WORKER_NAME = process.env.ORCHESTRATOR_WORKER_NAME || 'social-orchestrator';
const POLL_MS = Number(process.env.ORCHESTRATOR_POLL_MS || 15000);
const STALE_MINUTES = Number(process.env.ORCHESTRATOR_STALE_MINUTES || 10);
const MAX_AUTO_RETRIES = Number(process.env.ORCHESTRATOR_MAX_AUTO_RETRIES || 2);
const REMIND_APPROVAL_MINUTES = Number(process.env.ORCHESTRATOR_APPROVAL_REMINDER_MINUTES || 120);
const MAX_APPROVAL_REMINDER_AGE_HOURS = Number(process.env.ORCHESTRATOR_MAX_APPROVAL_REMINDER_AGE_HOURS || 24);
const MAX_APPROVAL_REMINDERS_PER_JOB = Number(process.env.ORCHESTRATOR_MAX_APPROVAL_REMINDERS_PER_JOB || 2);
const ONCE = process.argv.includes('--once');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function nowIso() {
  return new Date().toISOString();
}

function asIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function minutesAgoIso(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function shouldRetryError(lastError) {
  const msg = String(lastError || '').toLowerCase();
  if (!msg) return false;
  return (
    msg.includes('publish_failed') ||
    msg.includes('http_status=401') ||
    msg.includes('http_status=403') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('ghl_social_poster')
  );
}

async function notifySlack(title, lines = []) {
  if (!ORCHESTRATOR_SLACK_WEBHOOK_URL) return;
  const text = [title, ...lines].filter(Boolean).join('\n');
  try {
    await fetch(ORCHESTRATOR_SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (_) {
    // best effort
  }
}

async function recordEvent(jobId, eventType, stage, severity, message, payload = {}) {
  await supabase.rpc('record_content_event', {
    p_job_id: jobId,
    p_event_type: eventType,
    p_stage: stage,
    p_severity: severity,
    p_message: message,
    p_payload: payload,
    p_actor: WORKER_NAME,
  });
}

async function logAction(jobId, actionType, status, reason, details = {}) {
  await supabase.rpc('log_orchestrator_action', {
    p_job_id: jobId,
    p_action_type: actionType,
    p_status: status,
    p_reason: reason,
    p_details: details,
    p_actor: WORKER_NAME,
  });
}

async function loadJobs() {
  const { data, error } = await supabase
    .from('content_jobs')
    .select('id,site_id,profile_name,status,approval_status,requires_approval,attempt_count,max_attempts,last_error,created_at,updated_at,started_at,lock_expires_at,available_at,payload')
    .in('status', ['running', 'retryable', 'awaiting_approval', 'failed'])
    .order('updated_at', { ascending: false })
    .limit(250);
  if (error) throw new Error(`load_jobs_failed: ${error.message}`);
  return Array.isArray(data) ? data : [];
}

async function loadRuns(jobIds) {
  if (jobIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('orchestrator_runs')
    .select('*')
    .in('job_id', jobIds);
  if (error) throw new Error(`load_runs_failed: ${error.message}`);
  const map = new Map();
  for (const row of data || []) map.set(row.job_id, row);
  return map;
}

function deriveState(job) {
  if (job.status === 'running') return 'running';
  if (job.status === 'awaiting_approval') return 'waiting_approval';
  if (job.status === 'retryable') return 'retry_scheduled';
  if (job.status === 'failed') return 'escalated';
  return 'monitoring';
}

async function upsertRun(job, existingRun, patch = {}) {
  const payload = {
    job_id: job.id,
    site_id: job.site_id,
    profile_name: job.profile_name || null,
    state: deriveState(job),
    last_seen_status: job.status,
    last_error: job.last_error || null,
    next_action_at: existingRun?.next_action_at || null,
    escalated: !!existingRun?.escalated,
    last_alert_at: existingRun?.last_alert_at || null,
    last_alert_reason: existingRun?.last_alert_reason || null,
    memory: existingRun?.memory || {},
    updated_at: nowIso(),
    ...patch,
  };
  const { error } = await supabase.from('orchestrator_runs').upsert(payload, { onConflict: 'job_id' });
  if (error) throw new Error(`upsert_run_failed(${job.id}): ${error.message}`);
}

async function handleStaleRunning(job, run) {
  if (job.status !== 'running') return false;
  const lockExpiresAt = asIso(job.lock_expires_at);
  const startedAt = asIso(job.started_at);
  const staleLock = !!lockExpiresAt && lockExpiresAt < nowIso();
  const staleRuntime = !!startedAt && startedAt < minutesAgoIso(STALE_MINUTES);
  if (!staleLock && !staleRuntime) return false;

  const { error } = await supabase
    .from('content_jobs')
    .update({
      status: 'retryable',
      available_at: nowIso(),
      lock_token: null,
      lock_expires_at: null,
      last_error: 'orchestrator_auto_unstick_running',
      updated_at: nowIso(),
    })
    .eq('id', job.id)
    .eq('status', 'running');
  if (error) return false;

  await upsertRun(job, run, {
    state: 'retry_scheduled',
    next_action_at: nowIso(),
    memory: { ...(run?.memory || {}), last_auto_unstick_at: nowIso() },
  });
  await logAction(job.id, 'auto_unstick_running', 'applied', 'Recovered stale running lock', {
    stale_lock: staleLock,
    stale_runtime: staleRuntime,
    lock_expires_at: job.lock_expires_at,
    started_at: job.started_at,
  });
  await recordEvent(job.id, 'orchestrator_auto_unstick', 'orchestrator', 'warn', 'Recovered stale running lock', {
    stale_lock: staleLock,
    stale_runtime: staleRuntime,
  });
  await notifySlack('Social Orchestrator: Auto-Unstuck Job', [
    `Site: ${job.site_id}`,
    `Profile: ${job.profile_name || 'N/A'}`,
    `Job: ${job.id}`,
  ]);
  return true;
}

async function handleRetryableFailure(job, run) {
  if (job.status !== 'failed') return false;
  if (!shouldRetryError(job.last_error)) return false;

  const retryCount = Number(run?.retry_count || 0);
  const attempts = Number(job.attempt_count || 0);
  const maxAttempts = Number(job.max_attempts || 3);
  if (retryCount >= MAX_AUTO_RETRIES || attempts >= maxAttempts) {
    if (!run?.escalated) {
      await upsertRun(job, run, {
        state: 'escalated',
        escalated: true,
        last_alert_at: nowIso(),
        last_alert_reason: 'retry_limit_exceeded',
      });
      await logAction(job.id, 'escalate', 'applied', 'Retry budget exceeded', {
        retry_count: retryCount,
        attempt_count: attempts,
        max_attempts: maxAttempts,
        last_error: job.last_error || null,
      });
      await notifySlack('Social Orchestrator: Escalation', [
        `Site: ${job.site_id}`,
        `Profile: ${job.profile_name || 'N/A'}`,
        `Job: ${job.id}`,
        `Reason: Retry budget exceeded`,
        `Last error: ${job.last_error || 'n/a'}`,
      ]);
    }
    return true;
  }

  const delayMinutes = Math.min(15, retryCount + 1);
  const nextAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('content_jobs')
    .update({
      status: 'retryable',
      available_at: nextAt,
      lock_token: null,
      lock_expires_at: null,
      updated_at: nowIso(),
    })
    .eq('id', job.id)
    .eq('status', 'failed');
  if (error) return false;

  await upsertRun(job, run, {
    state: 'retry_scheduled',
    retry_count: retryCount + 1,
    next_action_at: nextAt,
    escalated: false,
    memory: { ...(run?.memory || {}), last_retry_reason: job.last_error || null },
  });
  await logAction(job.id, 'auto_retry_failed', 'applied', 'Scheduled automatic retry after failure', {
    retry_count: retryCount + 1,
    delay_minutes: delayMinutes,
    next_action_at: nextAt,
    last_error: job.last_error || null,
  });
  await recordEvent(job.id, 'orchestrator_retry_scheduled', 'orchestrator', 'warn', 'Scheduled automatic retry', {
    retry_count: retryCount + 1,
    delay_minutes: delayMinutes,
  });
  await notifySlack('Social Orchestrator: Retry Scheduled', [
    `Site: ${job.site_id}`,
    `Profile: ${job.profile_name || 'N/A'}`,
    `Job: ${job.id}`,
    `Retry: ${retryCount + 1}/${MAX_AUTO_RETRIES}`,
    `Reason: ${job.last_error || 'n/a'}`,
  ]);
  return true;
}

async function handleApprovalReminder(job, run) {
  if (job.status !== 'awaiting_approval') return false;
  const createdAt = asIso(job.created_at);
  const maxAgeCutoff = new Date(Date.now() - MAX_APPROVAL_REMINDER_AGE_HOURS * 60 * 60 * 1000).toISOString();
  if (!createdAt || createdAt < maxAgeCutoff) return false;
  const updatedAt = asIso(job.updated_at);
  if (!updatedAt || updatedAt > minutesAgoIso(REMIND_APPROVAL_MINUTES)) return false;

  const alreadyReminded =
    run?.last_alert_reason === 'approval_reminder' &&
    asIso(run?.last_alert_at) &&
    asIso(run?.last_alert_at) > minutesAgoIso(REMIND_APPROVAL_MINUTES);
  if (alreadyReminded) return false;
  const priorReminderCount = Number(run?.memory?.approval_reminder_count || 0);
  if (priorReminderCount >= MAX_APPROVAL_REMINDERS_PER_JOB) return false;

  await upsertRun(job, run, {
    state: 'waiting_approval',
    last_alert_at: nowIso(),
    last_alert_reason: 'approval_reminder',
    memory: {
      ...(run?.memory || {}),
      approval_reminder_count: priorReminderCount + 1,
      last_approval_reminder_at: nowIso(),
    },
  });
  await logAction(job.id, 'approval_reminder', 'applied', 'Approval pending reminder sent', {
    updated_at: job.updated_at,
  });
  await notifySlack('Social Orchestrator: Approval Reminder', [
    `Site: ${job.site_id}`,
    `Profile: ${job.profile_name || 'N/A'}`,
    `Job: ${job.id}`,
    `Status: awaiting_approval`,
  ]);
  return true;
}

async function runTick() {
  const jobs = await loadJobs();
  const runMap = await loadRuns(jobs.map((j) => j.id));
  let changed = 0;

  for (const job of jobs) {
    const run = runMap.get(job.id);
    await upsertRun(job, run);
    if (await handleStaleRunning(job, run)) {
      changed += 1;
      continue;
    }
    if (await handleRetryableFailure(job, run)) {
      changed += 1;
      continue;
    }
    if (await handleApprovalReminder(job, run)) {
      changed += 1;
      continue;
    }
  }

  if (changed > 0) {
    console.log(`orchestrator_tick changes=${changed}`);
  }
}

async function main() {
  console.log(`🚀 ${WORKER_NAME} started`);
  if (ONCE) {
    await runTick();
    return;
  }
  while (true) {
    try {
      await runTick();
    } catch (error) {
      console.error(`⚠️ orchestrator error: ${error instanceof Error ? error.message : String(error)}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((error) => {
  console.error(`💥 orchestrator fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
