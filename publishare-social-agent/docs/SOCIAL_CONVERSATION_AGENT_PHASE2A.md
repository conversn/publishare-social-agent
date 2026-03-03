# Social Conversation Agent (Phase 2A/2B)

This worker adds Slack conversational operations on top of your social pipeline using local models first.

## What Is Included

- Slack message polling (no Slack Events dependency required)
- DB-backed conversation memory and tool audit
- Read-only operational tools:
  - health
  - jobs
  - queue
  - next
  - status
  - policy-check
  - explain_failure
- Phase 2B mutating tools (allowlist-gated):
  - approve
  - reject
  - regen
  - retry-failed
- Model fallback chain:
  1. Ollama (primary)
  2. llama.cpp OpenAI-compatible server (secondary)
  3. DeepSeek (final fallback, optional)

## Migration

Run:

`supabase/migrations/20260302000018_social_conversation_agent_scaffold.sql`

## Required Env

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_BOT_TOKEN`

## Conversation Env

- `SOCIAL_CHAT_MONITOR_CHANNEL_IDS`
  - Comma-separated channel IDs to poll.
  - Example: `C08ABCDEF12,C08XYZ98765`
- `SOCIAL_CHAT_INCLUDE_IM`
  - `true` to also poll bot DMs.
  - Default: `false`
- `SOCIAL_CHAT_TRIGGER_PREFIX`
  - Prefix for non-mention triggers.
  - Default: `social`
- `SOCIAL_CHAT_POLL_MS`
  - Poll interval in ms.
  - Default: `15000`

## Action Guardrails (Phase 2B)

- `SLACK_SOCIAL_APPROVER_IDS`
  - Comma-separated Slack user IDs allowed to run mutating actions.
  - Example: `U0123456789,U0987654321`
  - If empty, all users are allowed.

## Local Model Env

- `SOCIAL_CHAT_PRIMARY_BASE_URL`
  - Default: `http://127.0.0.1:11434/v1`
- `SOCIAL_CHAT_PRIMARY_MODEL`
  - Default: `llama3.1:8b`
- `SOCIAL_CHAT_PRIMARY_API_KEY`
  - Optional

- `SOCIAL_CHAT_SECONDARY_BASE_URL`
  - Default: `http://127.0.0.1:8080/v1`
- `SOCIAL_CHAT_SECONDARY_MODEL`
  - Default: `Qwen2.5-7B-Instruct`
- `SOCIAL_CHAT_SECONDARY_API_KEY`
  - Optional

- `SOCIAL_CHAT_ENABLE_DEEPSEEK_FALLBACK`
  - Default: `true`
- `DEEPSEEK_API_KEY`
- `SOCIAL_CHAT_DEEPSEEK_MODEL`
  - Default: `deepseek-chat`

## Launch

Local repo:

`node scripts/social-conversation-worker.js`

Shared runtime root:

`bash scripts/run-social-conversation.sh`

## Usage in Slack

In monitored channels:

- Mention bot and ask:
  - `health`
  - `jobs active 20`
  - `jobs failed 10`
  - `jobs pending 20 priority`
  - `what needs approval right now?`
  - `next approval`
  - `status <job_id>`
  - `policy-check <job_id>`
  - `send <job_id_or_prefix> for approval`
  - `review <job_id_or_prefix>`
  - `why failed <job_id>`
  - `approve <job_id>`
  - `reject <job_id> wrong tone`
  - `regen <job_id> add specific proof`
  - `retry-failed 3`

Or use prefix:

- `social queue`
- `social jobs active 20`
- `social jobs failed 10`
- `social jobs pending 20 priority`
- `social health`
- `social next`
- `social status <job_id>`
- `social policy-check <job_id>`
- `social send <job_id_or_prefix> for approval`
- `social review <job_id_or_prefix>`
- `social approve <job_id>`
- `social reject <job_id> <reason>`
- `social regen <job_id> <reason>`
- `social retry-failed 5`

## Notes

- Mutating actions are guarded by `SLACK_SOCIAL_APPROVER_IDS`.
- Job references accept full UUIDs or unique short prefixes (6+ chars).
