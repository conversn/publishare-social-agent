/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const encoder = new TextEncoder();

async function hmacSHA256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifySlackSignature(req: Request, rawBody: string, signingSecret: string): Promise<boolean> {
  const timestamp = req.headers.get('x-slack-request-timestamp') || '';
  const slackSig = req.headers.get('x-slack-signature') || '';
  if (!timestamp || !slackSig) return false;

  // 5 min replay window
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const digest = await hmacSHA256(signingSecret, base);
  const expected = `v0=${digest}`;

  if (expected.length !== slackSig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ slackSig.charCodeAt(i);
  }
  return mismatch === 0;
}

function ok(text: string) {
  return new Response(JSON.stringify({ response_type: 'ephemeral', text }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function respondToSlack(responseUrl: string | undefined, text: string): Promise<void> {
  if (!responseUrl) return;
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        replace_original: false,
        text,
      }),
    });
  } catch (_) {
    // Best-effort feedback only
  }
}

async function callSlackApi(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) {
    throw new Error(`slack_api_${method}_failed: ${data?.error || `http_${response.status}`}`);
  }
  return data;
}

async function getLatestSocialCopy(supabase: ReturnType<typeof createClient>, jobId: string): Promise<string> {
  const { data, error } = await supabase
    .from('content_artifacts')
    .select('content,version')
    .eq('job_id', jobId)
    .eq('artifact_type', 'social_copy')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`load_social_copy_failed: ${error.message}`);
  return String(data?.content?.text || '');
}

async function getJobStatusSummary(supabase: ReturnType<typeof createClient>, jobId: string): Promise<string> {
  const { data, error } = await supabase
    .from('content_jobs')
    .select('id,site_id,profile_name,status,approval_status,requires_approval,last_error,updated_at')
    .eq('id', jobId)
    .maybeSingle();
  if (error) throw new Error(`load_job_status_failed: ${error.message}`);
  if (!data) return `Job ${jobId} not found.`;
  const nextActions: string[] = [];
  if (data.approval_status === 'awaiting_approval') {
    nextActions.push(`/social approve ${data.id}`);
    nextActions.push(`/social reject ${data.id} <reason>`);
    nextActions.push(`/social regen ${data.id} <reason>`);
  } else if (data.status === 'failed') {
    nextActions.push('/social retry-failed 1');
  } else {
    nextActions.push('/social queue 10');
  }
  return [
    `Job: ${data.id}`,
    `Site: ${data.site_id}`,
    `Profile: ${data.profile_name || 'N/A'}`,
    `Status: ${data.status}`,
    `Approval: ${data.approval_status}`,
    `Requires Approval: ${data.requires_approval ? 'yes' : 'no'}`,
    `Last Error: ${data.last_error || 'none'}`,
    `Updated: ${data.updated_at}`,
    'Suggested next command(s):',
    ...nextActions.map((x) => `- ${x}`),
  ].join('\n');
}

function commandHelp() {
  return [
    'Social Review slash commands',
    '',
    'Usage:',
    '`/social queue [limit]`',
    '`/social next`',
    '`/social retry-failed [limit]`',
    '`/social status <job_id>`',
    '`/social approve <job_id>`',
    '`/social reject <job_id> [reason]`',
    '`/social regen <job_id> [reason]`',
    '',
    'Examples:',
    '`/social queue 10`',
    '`/social next`',
    '`/social status ba63f499-9ed3-48f3-b73a-b90a1c5f4284`',
    '`/social approve ba63f499-9ed3-48f3-b73a-b90a1c5f4284`',
    '`/social reject ba63f499-9ed3-48f3-b73a-b90a1c5f4284 Off-brand tone`',
    '`/social regen ba63f499-9ed3-48f3-b73a-b90a1c5f4284 Add one concrete client example`',
    '`/social retry-failed 5`',
    '',
    'Notes:',
    '- Default limit is 10 and max is 25 for queue/retry-failed.',
    '- `queue` and `next` focus on jobs awaiting human approval.',
  ].join('\n');
}

function parseLimit(raw: string | undefined, fallback = 10, max = 25): number {
  const n = Number(raw || '');
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

async function listAwaitingApprovalJobs(
  supabase: ReturnType<typeof createClient>,
  limit = 10
): Promise<string> {
  const { count, error: countError } = await supabase
    .from('content_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('requires_approval', true)
    .eq('approval_status', 'awaiting_approval');
  if (countError) throw new Error(`count_awaiting_approval_failed: ${countError.message}`);

  const { data, error } = await supabase
    .from('content_jobs')
    .select('id,site_id,profile_name,status,updated_at')
    .eq('requires_approval', true)
    .eq('approval_status', 'awaiting_approval')
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`list_awaiting_approval_failed: ${error.message}`);
  if (!data || data.length === 0) return 'No jobs are currently awaiting approval.';

  const lines = data.map((row, idx) =>
    `${idx + 1}. ${row.id} | ${row.site_id} | ${row.profile_name || 'N/A'} | ${row.status} | ${row.updated_at}\n   Approve: /social approve ${row.id}\n   Regen: /social regen ${row.id} <reason>`
  );
  return [
    `Awaiting approval: ${count || data.length} total`,
    `Showing up to ${limit}`,
    ...lines,
    'Tip: run /social next for the highest-priority next review item.',
  ].join('\n');
}

async function getNextAwaitingApprovalJob(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const { data, error } = await supabase
    .from('content_jobs')
    .select('id,site_id,profile_name,status,updated_at')
    .eq('requires_approval', true)
    .eq('approval_status', 'awaiting_approval')
    .order('updated_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`next_awaiting_approval_failed: ${error.message}`);
  if (!data) return 'No jobs are currently awaiting approval.';

  return [
    'Next approval job:',
    `Job: ${data.id}`,
    `Site: ${data.site_id}`,
    `Profile: ${data.profile_name || 'N/A'}`,
    `Status: ${data.status}`,
    `Updated: ${data.updated_at}`,
    `Quick approve: /social approve ${data.id}`,
    `Quick regen: /social regen ${data.id} <reason>`,
    `Inspect status: /social status ${data.id}`,
  ].join('\n');
}

async function retryFailedJobs(
  supabase: ReturnType<typeof createClient>,
  actor: string,
  limit = 10
): Promise<string> {
  const { data, error } = await supabase
    .from('content_jobs')
    .select('id,site_id,profile_name,updated_at')
    .eq('status', 'failed')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`list_failed_jobs_failed: ${error.message}`);
  if (!data || data.length === 0) return 'No failed jobs found to retry.\nTry: /social status <job_id>';

  const now = new Date().toISOString();
  const jobIds = data.map((row) => row.id);
  const { error: updateError } = await supabase
    .from('content_jobs')
    .update({
      status: 'queued',
      last_error: null,
      updated_at: now,
    })
    .in('id', jobIds);
  if (updateError) throw new Error(`retry_failed_jobs_update_failed: ${updateError.message}`);

  for (const row of data) {
    try {
      await supabase.rpc('record_content_event', {
        p_job_id: row.id,
        p_event_type: 'retry_queued',
        p_stage: 'prepare_context',
        p_severity: 'info',
        p_actor: actor,
        p_message: 'Job re-queued from /social retry-failed',
        p_payload: { source: 'slack_command' },
      });
    } catch (_) {
      // best-effort event log
    }
  }

  const lines = data.map((row, idx) => `${idx + 1}. ${row.id} | ${row.site_id} | ${row.profile_name || 'N/A'}`);
  return [
    `Re-queued ${data.length} failed job(s):`,
    ...lines,
    'Next step: /social queue 10',
  ].join('\n');
}

async function saveEditedCopyAsArtifact(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  actor: string,
  editedCopy: string
): Promise<number> {
  const { data: job, error: jobError } = await supabase
    .from('content_jobs')
    .select('id,site_id')
    .eq('id', jobId)
    .single();
  if (jobError) throw new Error(`load_job_failed: ${jobError.message}`);

  const { data: latest, error: latestError } = await supabase
    .from('content_artifacts')
    .select('version')
    .eq('job_id', jobId)
    .eq('stage', 'generate_copy')
    .eq('artifact_type', 'social_copy')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error(`load_latest_copy_version_failed: ${latestError.message}`);

  const nextVersion = Number(latest?.version || 0) + 1;
  const content = {
    text: editedCopy,
    source: 'human_edit',
    editor: actor,
    edited_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase.from('content_artifacts').insert({
    job_id: jobId,
    site_id: job.site_id,
    stage: 'generate_copy',
    artifact_type: 'social_copy',
    version: nextVersion,
    content_hash: await crypto.subtle
      .digest('SHA-256', encoder.encode(JSON.stringify(content)))
      .then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')),
    content,
    created_at: new Date().toISOString(),
  });
  if (insertError) throw new Error(`save_edited_copy_failed: ${insertError.message}`);

  await supabase.rpc('record_content_event', {
    p_job_id: jobId,
    p_event_type: 'copy_edited',
    p_stage: 'generate_copy',
    p_severity: 'info',
    p_actor: actor,
    p_message: 'Slack reviewer edited copy before approval',
    p_payload: { source: 'slack_modal', version: nextVersion },
  });

  return nextVersion;
}

async function logReviewAction(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  action: string,
  actor: string,
  actorUserId: string | null,
  reason: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.rpc('log_content_review_action', {
      p_job_id: jobId,
      p_action: action,
      p_actor: actor,
      p_actor_user_id: actorUserId,
      p_channel: 'slack',
      p_reason: reason,
      p_metadata: metadata,
    });
  } catch (_) {
    // best effort audit logging
  }
}

serve(async (req) => {
  let rawBody = '';
  let fallbackResponseUrl = '';
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const signingSecret = Deno.env.get('SLACK_SIGNING_SECRET') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
      return new Response('Missing env vars (SLACK_SIGNING_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)', { status: 500 });
    }

    rawBody = await req.text();
    const earlyParams = new URLSearchParams(rawBody);
    if (earlyParams.get('ssl_check') === '1') {
      return new Response('', { status: 200 });
    }

    const verified = await verifySlackSignature(req, rawBody, signingSecret);
    if (!verified) {
      return new Response('Invalid signature', { status: 401 });
    }

    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');
    if (!payloadStr) {
      // Slash command mode (e.g. /social approve <job_id>)
      const commandText = String(params.get('text') || '').trim();
      const actorUserId = String(params.get('user_id') || '');
      const actor = String(params.get('user_name') || actorUserId || 'slack-reviewer');
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      if (!commandText) {
        const msg = commandHelp();
        return ok(msg);
      }

      const parts = commandText.split(/\s+/).filter(Boolean);
      const [verbRaw, arg1Raw, ...rest] = parts;
      const verb = String(verbRaw || '').toLowerCase();
      const jobId = String(arg1Raw || '').trim();
      const reason = rest.join(' ').trim();

      if (!jobId && !['help', 'queue', 'next', 'retry-failed'].includes(verb)) {
        const msg = `Missing job_id.\n${commandHelp()}`;
        return ok(msg);
      }

      if (verb === 'help') {
        const msg = commandHelp();
        return ok(msg);
      }

      if (verb === 'queue') {
        const limit = parseLimit(arg1Raw, 10, 25);
        const msg = await listAwaitingApprovalJobs(supabase, limit);
        return ok(msg);
      }

      if (verb === 'next') {
        const msg = await getNextAwaitingApprovalJob(supabase);
        return ok(msg);
      }

      if (verb === 'retry-failed' || verb === 'retry_failed') {
        const limit = parseLimit(arg1Raw, 10, 25);
        const msg = await retryFailedJobs(supabase, actor, limit);
        return ok(msg);
      }

      if (verb === 'status') {
        const msg = await getJobStatusSummary(supabase, jobId);
        return ok(msg);
      }

      if (verb === 'approve') {
        const { error } = await supabase.rpc('approve_content_job', {
          p_job_id: jobId,
          p_actor: actor,
        });
        if (error) {
          const msg = `Approve failed for ${jobId}: ${error.message}`;
          return ok(msg);
        }
        await logReviewAction(
          supabase,
          jobId,
          'approve',
          actor,
          actorUserId || null,
          'Approved from slash command',
          { source: 'slack_command', command: '/social approve' }
        );
        const msg = `Approved job ${jobId}. Re-queued for publish.`;
        return ok(msg);
      }

      if (verb === 'reject') {
        const rejectReason = reason || 'Rejected from slash command';
        const { error } = await supabase.rpc('reject_content_job', {
          p_job_id: jobId,
          p_actor: actor,
          p_reason: rejectReason,
        });
        if (error) {
          const msg = `Reject failed for ${jobId}: ${error.message}`;
          return ok(msg);
        }
        await logReviewAction(
          supabase,
          jobId,
          'reject',
          actor,
          actorUserId || null,
          rejectReason,
          { source: 'slack_command', command: '/social reject' }
        );
        const msg = `Rejected job ${jobId}.`;
        return ok(msg);
      }

      if (verb === 'regen' || verb === 'regenerate') {
        const regenReason = reason || 'Regenerate requested from slash command';
        const { error } = await supabase.rpc('request_edit_content_job', {
          p_job_id: jobId,
          p_actor: actor,
          p_reason: regenReason,
        });
        if (error) {
          const msg = `Regenerate failed for ${jobId}: ${error.message}`;
          return ok(msg);
        }
        await logReviewAction(
          supabase,
          jobId,
          'regenerate',
          actor,
          actorUserId || null,
          regenReason,
          { source: 'slack_command', command: '/social regen' }
        );
        const msg = `Regeneration requested for ${jobId}.`;
        return ok(msg);
      }

      const msg = `Unknown command: ${verb}\nTry /social help\n\n${commandHelp()}`;
      return ok(msg);
    }

    const payload = JSON.parse(payloadStr);
    const payloadType = String(payload?.type || '');
    const action = payload?.actions?.[0];
    const actionId = String(action?.action_id || '');
    const responseUrl = String(payload?.response_url || '');
    fallbackResponseUrl = responseUrl;
    let value: Record<string, unknown> = {};
    const rawValue = action?.value || action?.selected_option?.value || '';
    if (rawValue) {
      try {
        value = JSON.parse(rawValue);
      } catch (_) {
        value = {};
      }
    }
    const actorUserId = String(payload?.user?.id || '');
    const actor = String(payload?.user?.username || actorUserId || 'slack-reviewer');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN') || '';

    if (payloadType === 'view_submission') {
      const callbackId = String(payload?.view?.callback_id || '');
      if (callbackId !== 'social_edit_approve_modal') {
        return json({ response_action: 'clear' });
      }

      const privateMetadata = String(payload?.view?.private_metadata || '{}');
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(privateMetadata);
      } catch (_) {
        meta = {};
      }
      const jobId = String(meta?.job_id || '');
      const responseUrl = String(meta?.response_url || '');
      if (!jobId) return json({ response_action: 'errors', errors: { social_post_input: 'Missing job_id in modal metadata.' } });

      const stateValues = payload?.view?.state?.values || {};
      const editedCopy =
        String(stateValues?.social_post_input?.social_post_value?.value || '').trim();
      if (!editedCopy) {
        return json({
          response_action: 'errors',
          errors: { social_post_input: 'Post copy cannot be empty.' },
        });
      }

      const version = await saveEditedCopyAsArtifact(supabase, jobId, actor, editedCopy);
      const { error: approveError } = await supabase.rpc('approve_content_job', {
        p_job_id: jobId,
        p_actor: `${actor}:edit_approve`,
      });
      if (approveError) {
        throw new Error(`edit_approve_failed: ${approveError.message}`);
      }

      await logReviewAction(
        supabase,
        jobId,
        'edit_approve',
        actor,
        actorUserId || null,
        'Edited in Slack modal and approved',
        { source: 'slack_modal', artifact_version: version }
      );

      await respondToSlack(responseUrl, `Edited + approved job ${jobId}. Saved as social_copy v${version} and re-queued for publish.`);
      return json({ response_action: 'clear' });
    }

    const jobId = String(value?.job_id || '');
    if (!jobId) return ok('No job_id found in action payload.');

    if (actionId === 'social_approve') {
      const { error } = await supabase.rpc('approve_content_job', {
        p_job_id: jobId,
        p_actor: actor,
      });
      if (error) {
        const msg = `Approve failed for ${jobId}: ${error.message}`;
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }
      await logReviewAction(
        supabase,
        jobId,
        'approve',
        actor,
        actorUserId || null,
        'Approved from Slack',
        { source: 'slack_action' }
      );
      await respondToSlack(responseUrl, `Approved job ${jobId}. Re-queued for publish.`);
      return ok(`Approved job ${jobId}. It has been re-queued for publish.`);
    }

    if (actionId === 'social_edit_approve') {
      if (!slackBotToken) {
        const msg = 'Edit modal unavailable: missing SLACK_BOT_TOKEN secret.';
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }
      if (!slackBotToken.startsWith('xoxb-')) {
        const msg = 'Edit modal unavailable: SLACK_BOT_TOKEN must be a Bot User OAuth token (xoxb-...).';
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }
      const triggerId = String(payload?.trigger_id || '');
      if (!triggerId) {
        const msg = `Edit modal unavailable for ${jobId}: missing trigger_id in Slack payload.`;
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }

      const latestCopy = await getLatestSocialCopy(supabase, jobId);
      try {
        await callSlackApi(slackBotToken, 'views.open', {
          trigger_id: triggerId,
          view: {
            type: 'modal',
            callback_id: 'social_edit_approve_modal',
            private_metadata: JSON.stringify({ job_id: jobId, response_url: responseUrl }),
            title: { type: 'plain_text', text: 'Edit & Approve' },
            submit: { type: 'plain_text', text: 'Approve' },
            close: { type: 'plain_text', text: 'Cancel' },
            blocks: [
              {
                type: 'input',
                block_id: 'social_post_input',
                label: { type: 'plain_text', text: 'Final post copy' },
                element: {
                  type: 'plain_text_input',
                  action_id: 'social_post_value',
                  multiline: true,
                  initial_value: latestCopy.slice(0, 2900),
                },
              },
            ],
          },
        });
        await supabase.rpc('record_content_event', {
          p_job_id: jobId,
          p_event_type: 'edit_modal_opened',
          p_stage: 'publish',
          p_severity: 'info',
          p_actor: actor,
          p_message: 'Slack edit modal opened',
          p_payload: { source: 'slack' },
        });
      } catch (err) {
        const msg = `Edit modal failed for ${jobId}: ${err instanceof Error ? err.message : String(err)}`;
        await supabase.rpc('record_content_event', {
          p_job_id: jobId,
          p_event_type: 'edit_modal_failed',
          p_stage: 'publish',
          p_severity: 'error',
          p_actor: actor,
          p_message: msg,
          p_payload: { source: 'slack' },
        });
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }
      await respondToSlack(responseUrl, `Opening editor for job ${jobId}...`);
      return new Response('', { status: 200 });
    }

    if (actionId === 'social_reject') {
      const { error } = await supabase.rpc('reject_content_job', {
        p_job_id: jobId,
        p_actor: actor,
        p_reason: 'Rejected from Slack',
      });
      if (error) {
        const msg = `Reject failed for ${jobId}: ${error.message}`;
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }
      await logReviewAction(
        supabase,
        jobId,
        'reject',
        actor,
        actorUserId || null,
        'Rejected from Slack',
        { source: 'slack_action' }
      );
      await respondToSlack(responseUrl, `Rejected job ${jobId}.`);
      return ok(`Rejected job ${jobId}.`);
    }

    if (actionId === 'social_request_edit' || actionId === 'social_regenerate' || actionId === 'social_regenerate_reason') {
      const reason = String(value?.reason || (actionId === 'social_request_edit' ? 'Edit requested from Slack' : 'Regenerate requested from Slack'));
      const { error } = await supabase.rpc('request_edit_content_job', {
        p_job_id: jobId,
        p_actor: actor,
        p_reason: reason,
      });
      if (error) {
        const msg = `Edit request failed for ${jobId}: ${error.message}`;
        await respondToSlack(responseUrl, msg);
        return ok(msg);
      }
      await logReviewAction(
        supabase,
        jobId,
        actionId === 'social_request_edit' ? 'request_edit' : 'regenerate',
        actor,
        actorUserId || null,
        reason,
        { source: 'slack_action', action_id: actionId }
      );
      // Safety fallback: ensure worker sends a fresh Slack review alert for regenerated draft.
      await supabase
        .from('content_jobs')
        .update({ notified_at: null, attempt_count: 0, updated_at: new Date().toISOString() })
        .eq('id', jobId);
      const okMsg = `Regeneration requested for ${jobId}. Reason: ${reason}. Re-queued.`;
      await respondToSlack(responseUrl, okMsg);
      return ok(okMsg);
    }

    return ok(`Unhandled action: ${actionId}`);
  } catch (err) {
    if (fallbackResponseUrl) {
      await respondToSlack(
        fallbackResponseUrl,
        `Slack approval handler error: ${err instanceof Error ? err.message : String(err)}`
      );
    } else if (rawBody) {
      try {
        const params = new URLSearchParams(rawBody);
        const payloadStr = params.get('payload');
        if (payloadStr) {
          const payload = JSON.parse(payloadStr);
          const responseUrl = String(payload?.response_url || '');
          if (responseUrl) {
            await respondToSlack(
              responseUrl,
              `Slack approval handler error: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        }
      } catch (_) {
        // no-op
      }
    }
    return new Response(
      JSON.stringify({ response_type: 'ephemeral', text: `Error: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }
});
