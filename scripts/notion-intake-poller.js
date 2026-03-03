#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_API_VERSION = process.env.NOTION_API_VERSION || '2022-06-28';
const POLL_INTERVAL_MS = Number(process.env.NOTION_POLL_INTERVAL_MS || 120000);
const MAX_BLOCK_CHARS = Number(process.env.NOTION_PAGE_CONTENT_MAX_CHARS || 5000);
const SOCIAL_REVIEW_SLACK_WEBHOOK_URL = process.env.SOCIAL_REVIEW_SLACK_WEBHOOK_URL || '';
const ALLOWED_NOTION_PROFILES = (process.env.NOTION_ALLOWED_PROFILE_NAMES || 'SeniorSimple Editorial,ParentSimple Editorial,HomeSimple Editorial,Keenan Shaw')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);
const ONCE = process.argv.includes('--once');
const LOOP = process.argv.includes('--loop') || !ONCE;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!NOTION_API_KEY) {
  console.error('Missing NOTION_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const allowedProfileSet = new Set(ALLOWED_NOTION_PROFILES);

function notionHeaders() {
  return {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json',
  };
}

function getPlainTextFromRichText(value) {
  if (!Array.isArray(value)) return '';
  return value.map((r) => String(r?.plain_text || '')).join('').trim();
}

function getStatusValue(prop) {
  if (!prop || typeof prop !== 'object') return '';
  if (prop.type === 'status') return String(prop.status?.name || '').trim();
  if (prop.type === 'select') return String(prop.select?.name || '').trim();
  if (prop.type === 'rich_text') return getPlainTextFromRichText(prop.rich_text);
  if (prop.type === 'title') return getPlainTextFromRichText(prop.title);
  return '';
}

function getTopicValue(prop) {
  if (!prop || typeof prop !== 'object') return '';
  if (prop.type === 'title') return getPlainTextFromRichText(prop.title);
  if (prop.type === 'rich_text') return getPlainTextFromRichText(prop.rich_text);
  return '';
}

function getTextProperty(prop) {
  if (!prop || typeof prop !== 'object') return '';
  if (prop.type === 'rich_text') return getPlainTextFromRichText(prop.rich_text);
  if (prop.type === 'title') return getPlainTextFromRichText(prop.title);
  if (prop.type === 'select') return String(prop.select?.name || '').trim();
  if (prop.type === 'status') return String(prop.status?.name || '').trim();
  if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
    const first = prop.multi_select[0];
    return String(first?.name || '').trim();
  }
  if (prop.type === 'formula') {
    const f = prop.formula || {};
    if (typeof f.string === 'string') return f.string.trim();
  }
  if (prop.type === 'url') return String(prop.url || '').trim();
  if (prop.type === 'email') return String(prop.email || '').trim();
  return '';
}

function getPlatforms(prop, fallback) {
  if (!prop || typeof prop !== 'object') return fallback;
  if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
    const vals = prop.multi_select.map((v) => String(v?.name || '').toLowerCase().trim()).filter(Boolean);
    return vals.length > 0 ? vals : fallback;
  }
  if (prop.type === 'rich_text') {
    const raw = getPlainTextFromRichText(prop.rich_text);
    if (!raw) return fallback;
    const vals = raw.split(',').map((x) => x.toLowerCase().trim()).filter(Boolean);
    return vals.length > 0 ? vals : fallback;
  }
  return fallback;
}

function getDateValue(prop) {
  if (!prop || typeof prop !== 'object') return null;
  if (prop.type !== 'date') return null;
  const start = prop.date?.start;
  return start ? new Date(start).toISOString() : null;
}

function pickProp(props, keys) {
  for (const key of keys) {
    if (props[key]) return { key, prop: props[key] };
  }
  return { key: '', prop: null };
}

async function postSlackAlert(text, fields = {}) {
  if (!SOCIAL_REVIEW_SLACK_WEBHOOK_URL) return;
  const lines = Object.entries(fields)
    .map(([k, v]) => `• ${k}: ${v}`)
    .join('\n');
  const payload = {
    text,
    mrkdwn: true,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${text}*` },
      },
      ...(lines ? [{ type: 'section', text: { type: 'mrkdwn', text: lines } }] : []),
    ],
  };
  try {
    await fetch(SOCIAL_REVIEW_SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // best effort
  }
}

async function fetchPageBlocksText(pageId) {
  const texts = [];
  let cursor = undefined;
  while (texts.join('\n').length < MAX_BLOCK_CHARS) {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    if (cursor) url.searchParams.set('start_cursor', cursor);
    url.searchParams.set('page_size', '100');

    const response = await fetch(url, { headers: notionHeaders() });
    if (!response.ok) {
      break;
    }
    const data = await response.json();
    const blocks = Array.isArray(data?.results) ? data.results : [];
    for (const block of blocks) {
      const type = block?.type;
      const node = block?.[type];
      const text = getPlainTextFromRichText(node?.rich_text || []);
      if (text) texts.push(text);
      if (texts.join('\n').length >= MAX_BLOCK_CHARS) break;
    }
    if (!data?.has_more) break;
    cursor = data?.next_cursor;
    if (!cursor) break;
  }
  return texts.join('\n').slice(0, MAX_BLOCK_CHARS).trim();
}

async function queryNotionDatabase(databaseId, lookbackMinutes, pageSize) {
  const cutoff = new Date(Date.now() - Math.max(1, lookbackMinutes) * 60 * 1000).toISOString();
  const body = {
    page_size: Math.max(1, Math.min(100, pageSize)),
    filter: {
      timestamp: 'last_edited_time',
      last_edited_time: { on_or_after: cutoff },
    },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
  };

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`notion_query_failed(${databaseId}): ${response.status} ${text.slice(0, 400)}`);
  }

  const data = await response.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function enqueueFromPage(config, page) {
  const props = page?.properties || {};
  const statusPick = pickProp(props, ['Status', 'status']);
  const topicPick = pickProp(props, ['Topic', 'Name', 'Title']);
  const contentPick = pickProp(props, ['Page Content', 'Content', 'Context']);
  const sitePick = pickProp(props, ['Site', 'site_id']);
  const profilePick = pickProp(props, ['Profile', 'Profile Name', 'profile_name', 'Social Profile']);
  const intentPick = pickProp(props, ['Post Intent', 'Intent']);
  const platformsPick = pickProp(props, ['Platforms']);
  const schedulePick = pickProp(props, ['Schedule At', 'Scheduled At']);

  const statusValue = getStatusValue(statusPick.prop).toLowerCase();
  if (statusValue !== String(config.ready_status || 'ready').toLowerCase()) {
    return { skipped: true, reason: 'status_not_ready' };
  }

  const pageId = String(page?.id || '').replace(/-/g, '');
  const lastEdited = String(page?.last_edited_time || new Date().toISOString());
  const topic = getTopicValue(topicPick.prop) || 'notion topic';
  const pageContent = getTextProperty(contentPick.prop) || await fetchPageBlocksText(page.id);
  const siteFromNotion = getTextProperty(sitePick.prop);
  const siteId = siteFromNotion || config.site_id || null;
  const profileName = getTextProperty(profilePick.prop) || config.profile_name || null;
  const postIntentRaw = getTextProperty(intentPick.prop).toLowerCase();
  const postIntent = postIntentRaw === 'promotion' ? 'promotion' : (config.post_intent_default || 'native');
  const defaultPlatforms = Array.isArray(config.default_platforms) ? config.default_platforms : ['facebook'];
  const platforms = getPlatforms(platformsPick.prop, defaultPlatforms);
  const scheduleAt = getDateValue(schedulePick.prop) || null;

  if (!siteFromNotion) {
    await postSlackAlert('Notion intake blocked (missing Site)', {
      profile_name: profileName || 'N/A',
      notion_page_id: pageId,
      topic,
      expected_site_values: 'seniorsimple, parentsimple, homesimple, callready, rateroots, investorsimple',
    });
    return { skipped: true, reason: 'missing_site' };
  }
  if (!siteId) {
    return { skipped: true, reason: 'missing_site_id' };
  }
  if (!profileName) {
    await postSlackAlert('Notion intake blocked (missing Profile Name)', {
      site_id: siteId,
      notion_page_id: pageId,
      topic,
      allowed_profiles: ALLOWED_NOTION_PROFILES.join(', '),
    });
    return { skipped: true, reason: 'missing_profile_name' };
  }
  if (!allowedProfileSet.has(profileName)) {
    await postSlackAlert('Notion intake blocked (invalid Profile Name)', {
      site_id: siteId,
      profile_name: profileName,
      notion_page_id: pageId,
      topic,
      allowed_profiles: ALLOWED_NOTION_PROFILES.join(', '),
    });
    return { skipped: true, reason: 'invalid_profile_name' };
  }
  const { data: configMatch, error: configMatchError } = await supabase
    .from('ghl_social_config')
    .select('id')
    .eq('site_id', siteId)
    .eq('profile_name', profileName)
    .eq('enabled', true)
    .limit(1);
  if (configMatchError || !Array.isArray(configMatch) || configMatch.length === 0) {
    await postSlackAlert('Notion intake blocked (invalid site/profile mapping)', {
      site_id: siteId,
      profile_name: profileName,
      notion_page_id: pageId,
      topic,
      reason: configMatchError?.message || 'No enabled ghl_social_config row',
    });
    return { skipped: true, reason: 'invalid_site_profile_mapping' };
  }

  const idempotencyKey = `notion:${pageId}:${lastEdited}`;
  const intakePayload = {
    source_type: 'notion',
    external_id: pageId,
    external_event_id: lastEdited,
    event_type: 'page_ready',
    idempotency_key: idempotencyKey,
    site_id: siteId,
    profile_name: profileName,
    topic,
    page_content: pageContent,
    post_intent: postIntent,
    platforms,
    schedule_at: scheduleAt,
    requires_approval: config.requires_approval !== false,
    payload: {
      source_type: 'notion',
      notion_database_id: config.notion_database_id,
      notion_page_id: pageId,
      notion_status: statusValue,
      post_intent: postIntent,
      include_image: postIntent === 'native',
      auto_publish: true,
    },
  };

  const { data: inserted, error: insertError } = await supabase
    .from('content_intake_events')
    .insert(intakePayload)
    .select('id')
    .single();

  if (insertError) {
    if (String(insertError.code || '') === '23505' || String(insertError.message || '').includes('duplicate key')) {
      return { skipped: true, reason: 'duplicate_event' };
    }
    throw new Error(`intake_insert_failed(${pageId}): ${insertError.message}`);
  }

  const { data: job, error: enqueueError } = await supabase.rpc('enqueue_content_job_from_intake', {
    p_intake_event_id: inserted.id,
    p_actor: 'notion-poller',
  });
  if (enqueueError) {
    await supabase
      .from('content_intake_events')
      .update({ processed: false, processing_error: enqueueError.message })
      .eq('id', inserted.id);
    throw new Error(`enqueue_from_intake_failed(${pageId}): ${enqueueError.message}`);
  }

  // Enforce HITL approval for Notion-sourced content, regardless of RPC defaults.
  // This prevents accidental auto-publish bypass when upstream defaults drift.
  if (job?.id) {
    const { error: approvalGuardError } = await supabase
      .from('content_jobs')
      .update({
        requires_approval: true,
        approval_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    if (approvalGuardError) {
      console.error(`approval_guard_update_failed(${job.id}): ${approvalGuardError.message}`);
    }
  }

  // Best-effort status update back to Notion: ready -> queued
  if (config.queued_status && statusPick.prop && statusPick.key) {
    const statusType = statusPick.prop.type;
    const statusName = String(config.queued_status || '').trim();
    if (statusName && (statusType === 'status' || statusType === 'select')) {
      const patchBody = {
        properties: {
          [statusPick.key]:
            statusType === 'status'
              ? { status: { name: statusName } }
              : { select: { name: statusName } },
        },
      };
      try {
        await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
          method: 'PATCH',
          headers: notionHeaders(),
          body: JSON.stringify(patchBody),
        });
      } catch (_) {
        // best effort
      }
    }
  }

  return { queued: true, page_id: pageId, job_id: job?.id || null, site_id: siteId, post_intent: postIntent };
}

async function pollOnce() {
  const { data: configs, error } = await supabase
    .from('notion_poll_configs')
    .select('*')
    .eq('enabled', true)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`load_configs_failed: ${error.message}`);

  const rows = Array.isArray(configs) ? configs : [];
  if (rows.length === 0) {
    console.log('No enabled notion_poll_configs rows found');
    return;
  }

  const summary = { configs: rows.length, pages_seen: 0, queued: 0, skipped: 0, errors: 0 };

  for (const cfg of rows) {
    const dbId = String(cfg.notion_database_id || '').trim();
    if (!dbId) continue;

    try {
      const pages = await queryNotionDatabase(
        dbId,
        Number(cfg.lookback_minutes || 1440),
        Number(cfg.max_pages_per_poll || 25)
      );
      summary.pages_seen += pages.length;

      for (const page of pages) {
        const parentDb = String(page?.parent?.database_id || '').replace(/-/g, '');
        if (parentDb !== dbId.replace(/-/g, '')) {
          summary.skipped += 1;
          continue;
        }
        try {
          const result = await enqueueFromPage(cfg, page);
          if (result.queued) {
            summary.queued += 1;
            console.log(`queued page=${result.page_id} job=${result.job_id} site=${result.site_id} intent=${result.post_intent}`);
          } else {
            summary.skipped += 1;
            console.log(`skipped page=${String(page?.id || '').replace(/-/g, '')} reason=${result.reason || 'unknown'}`);
          }
        } catch (pageError) {
          summary.errors += 1;
          console.error(`page_error: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
        }
      }
    } catch (cfgError) {
      summary.errors += 1;
      console.error(`config_error(db=${dbId}): ${cfgError instanceof Error ? cfgError.message : String(cfgError)}`);
    }
  }

  console.log(JSON.stringify(summary));
}

async function main() {
  if (!LOOP) {
    await pollOnce();
    return;
  }

  console.log(`notion-poller started interval_ms=${POLL_INTERVAL_MS}`);
  while (true) {
    const started = Date.now();
    try {
      await pollOnce();
    } catch (err) {
      console.error(`poll_failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    const elapsed = Date.now() - started;
    const waitMs = Math.max(1000, POLL_INTERVAL_MS - elapsed);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
