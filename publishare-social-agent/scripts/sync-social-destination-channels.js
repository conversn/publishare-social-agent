#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, 'utf8');
  for (const line of src.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), '.env'));
loadEnvFile(path.join(process.env.HOME || '', '.publishare-social-worker', '.env.local'));
loadEnvFile(path.join(process.env.HOME || '', '.publishare-social-worker', '.env'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const BASE_HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

function slugify(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function inferPlatform(acc) {
  const raw = String(acc?.platform || '').toLowerCase();
  if (raw.includes('linkedin')) return 'linkedin';
  if (raw.includes('facebook')) return 'facebook';
  if (raw.includes('instagram')) return 'instagram';
  if (raw.includes('twitter') || raw.includes('x')) return 'twitter';

  const name = String(acc?.name || '').toLowerCase();
  if (name.includes('linkedin')) return 'linkedin';
  if (name.includes('facebook')) return 'facebook';
  if (name.includes('instagram')) return 'instagram';
  if (name.includes('twitter') || name.includes(' x ')) return 'twitter';
  return '';
}

function inferKind(acc) {
  const id = String(acc?.id || '');
  const name = String(acc?.name || '').toLowerCase();
  if (id.includes('_page') || name.includes(' page')) return 'page';
  if (id.includes('_profile') || name.includes(' profile')) return 'profile';
  return 'account';
}

function isPlaceholderLocation(v) {
  const s = String(v || '').trim();
  return !s || s.toUpperCase().startsWith('REPLACE_WITH_');
}

async function supabaseGet(pathname) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, { headers: BASE_HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`supabase_get_failed(${res.status}): ${text.slice(0, 400)}`);
  }
  return res.json();
}

async function supabaseUpsertRows(rows) {
  if (!rows.length) return [];
  const out = [];
  for (const row of rows) {
    const qs = new URLSearchParams({
      select: 'id',
      site_id: `eq.${row.site_id}`,
      profile_name: `eq.${row.profile_name}`,
      platform: `eq.${row.platform}`,
      channel_key: `eq.${row.channel_key}`,
      limit: '1',
    }).toString();
    const findRes = await fetch(`${SUPABASE_URL}/rest/v1/social_destination_channels?${qs}`, {
      headers: BASE_HEADERS,
    });
    if (!findRes.ok) {
      const text = await findRes.text();
      throw new Error(`supabase_find_failed(${findRes.status}): ${text.slice(0, 400)}`);
    }
    const found = await findRes.json();
    const existingId = Array.isArray(found) && found[0]?.id ? found[0].id : null;

    if (existingId) {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/social_destination_channels?id=eq.${existingId}`, {
        method: 'PATCH',
        headers: {
          ...BASE_HEADERS,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
      });
      if (!patchRes.ok) {
        const text = await patchRes.text();
        throw new Error(`supabase_patch_failed(${patchRes.status}): ${text.slice(0, 600)}`);
      }
      const patched = await patchRes.json();
      out.push(...(Array.isArray(patched) ? patched : []));
    } else {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/social_destination_channels`, {
        method: 'POST',
        headers: {
          ...BASE_HEADERS,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
      });
      if (!insertRes.ok) {
        const text = await insertRes.text();
        throw new Error(`supabase_insert_failed(${insertRes.status}): ${text.slice(0, 600)}`);
      }
      const inserted = await insertRes.json();
      out.push(...(Array.isArray(inserted) ? inserted : []));
    }
  }
  return out;
}

async function clearExistingDefaults(rows) {
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.site_id}||${row.profile_name}||${row.platform}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const qs = new URLSearchParams({
      site_id: `eq.${row.site_id}`,
      profile_name: `eq.${row.profile_name}`,
      platform: `eq.${row.platform}`,
      is_default: 'eq.true',
    }).toString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/social_destination_channels?${qs}`, {
      method: 'PATCH',
      headers: {
        ...BASE_HEADERS,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ is_default: false }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`clear_defaults_failed(${res.status}): ${text.slice(0, 400)}`);
    }
  }
}

async function fetchGhlAccounts(locationId, apiKey) {
  const res = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${locationId}/accounts`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ghl_accounts_failed(${locationId},${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.results?.accounts)) return data.results.accounts;
  if (Array.isArray(data)) return data;
  return [];
}

function chooseDefaultIndexes(accounts, profileName) {
  const byPlatform = new Map();
  accounts.forEach((acc, idx) => {
    const p = inferPlatform(acc);
    if (!p) return;
    if (!byPlatform.has(p)) byPlatform.set(p, []);
    byPlatform.get(p).push({ acc, idx });
  });

  const defaults = new Set();
  for (const [platform, entries] of byPlatform.entries()) {
    if (entries.length === 1) {
      defaults.add(entries[0].idx);
      continue;
    }
    const profileNeedle = String(profileName || '').toLowerCase().trim();
    const preferred = entries.find(({ acc }) => String(acc?.name || '').toLowerCase().includes(profileNeedle));
    if (preferred) {
      defaults.add(preferred.idx);
    } else {
      defaults.add(entries[0].idx);
    }
  }
  return defaults;
}

(async () => {
  console.log('🔎 Loading enabled GHL profile configs...');
  const configs = await supabaseGet(
    "ghl_social_config?select=site_id,profile_name,ghl_api_key,ghl_location_id,enabled&enabled=eq.true"
  );

  const validConfigs = (configs || []).filter(
    (c) => c?.site_id && c?.profile_name && c?.ghl_api_key && !isPlaceholderLocation(c?.ghl_location_id)
  );

  console.log(`Found ${validConfigs.length} valid enabled configs`);

  const rows = [];
  const errors = [];

  for (const cfg of validConfigs) {
    const siteId = String(cfg.site_id);
    const profileName = String(cfg.profile_name);
    const locationId = String(cfg.ghl_location_id);

    try {
      const accounts = await fetchGhlAccounts(locationId, String(cfg.ghl_api_key));
      const defaults = chooseDefaultIndexes(accounts, profileName);

      for (let i = 0; i < accounts.length; i += 1) {
        const acc = accounts[i];
        const platform = inferPlatform(acc);
        const channelId = String(acc?.id || '').trim();
        if (!platform || !channelId) continue;

        const name = String(acc?.name || acc?.pageName || acc?.username || `${platform} account`).trim();
        const kind = inferKind(acc);
        const channelKey = slugify(`${platform}_${kind}_${channelId}`);
        const isDefault = defaults.has(i);

        rows.push({
          site_id: siteId,
          profile_name: profileName,
          platform,
          channel_key: channelKey,
          channel_label: name,
          ghl_location_id: locationId,
          ghl_channel_id: channelId,
          is_default: isDefault,
          enabled: true,
          metadata: {
            discovered_from: 'ghl_accounts_api',
            account_name: name,
            account_platform_raw: acc?.platform || null,
            oauth_id: acc?.oauthId || null,
          },
        });
      }

      console.log(`✅ ${siteId} / ${profileName}: discovered ${accounts.length} accounts`);
    } catch (err) {
      errors.push({ site_id: siteId, profile_name: profileName, error: err.message });
      console.error(`❌ ${siteId} / ${profileName}: ${err.message}`);
    }
  }

  console.log(`\n🧱 Upserting ${rows.length} destination channel rows...`);
  await clearExistingDefaults(rows);
  const upserted = await supabaseUpsertRows(rows);
  console.log(`✅ Upsert complete (${Array.isArray(upserted) ? upserted.length : rows.length} rows)`);

  if (errors.length) {
    console.log('\n⚠️ Errors:');
    for (const e of errors) {
      console.log(`- ${e.site_id} / ${e.profile_name}: ${e.error}`);
    }
  }

  console.log('\nSample rows:');
  for (const r of rows.slice(0, 12)) {
    console.log(`- ${r.site_id} | ${r.profile_name} | ${r.platform} | ${r.channel_key} | ${r.channel_label} | default=${r.is_default}`);
  }
})();
