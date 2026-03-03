# Social Conversation Agent Test Script (Phase 2B)

Use this script to validate conversational actions, allowlist controls, and audit logging.

## Preconditions

1. Worker is running:
   - `com.publishare.social-conversation-watchdog`
2. Migration exists:
   - `20260302000018_social_conversation_agent_scaffold.sql`
3. Bot is in at least one monitored channel.
4. Env has:
   - `SLACK_SOCIAL_APPROVER_IDS=U0AHKVABKLZ` (or your approver IDs)

## Test Data Setup

Create one queued/awaiting job and one failed job (or use existing ones).

Helpful query:

```sql
select id, site_id, profile_name, status, approval_status, updated_at
from public.content_jobs
where status in ('awaiting_approval', 'failed', 'queued')
order by updated_at desc
limit 20;
```

Pick:
- `APPROVAL_JOB_ID` from `awaiting_approval`
- `FAILED_JOB_ID` from `failed`

## Operator Test Cases (Authorized User)

In Slack, mention bot or use `social` prefix in a monitored channel.

1. Queue read
- Prompt: `social queue`
- Expect: list of jobs awaiting approval

2. Next read
- Prompt: `social next`
- Expect: single next job summary

3. Status read
- Prompt: `social status <APPROVAL_JOB_ID>`
- Expect: job status, approval status, error, attempts

4. Explain failure read
- Prompt: `social why failed <FAILED_JOB_ID>`
- Expect: failure trace lines from `content_job_trace`

5. Approve write
- Prompt: `social approve <APPROVAL_JOB_ID>`
- Expect: `Approved job ... Re-queued for publish.`

6. Regen write
- Prompt: `social regen <APPROVAL_JOB_ID> tighten voice and add one proof point`
- Expect: regeneration requested confirmation

7. Reject write
- Prompt: `social reject <APPROVAL_JOB_ID> off-brand tone`
- Expect: rejection confirmation with reason

8. Retry failed write
- Prompt: `social retry-failed 3`
- Expect: `Re-queued X failed job(s)`

## Allowlist Test Cases (Unauthorized User)

Run from a Slack user not listed in `SLACK_SOCIAL_APPROVER_IDS`.

1. Read allowed
- Prompt: `social queue`
- Expect: successful read response

2. Write denied
- Prompt: `social approve <APPROVAL_JOB_ID>`
- Expect: `Not authorized for approve...`

3. Write denied
- Prompt: `social retry-failed 3`
- Expect: `Not authorized for retry_failed...`

## Audit Verification SQL

1. Conversation messages

```sql
select t.channel_id, t.thread_ts, m.role, m.user_id, left(m.content, 180) as content_preview, m.created_at
from public.social_agent_messages m
join public.social_agent_threads t on t.id = m.thread_id
order by m.created_at desc
limit 50;
```

2. Tool call outcomes

```sql
select
  tc.created_at,
  tc.tool_name,
  tc.status,
  tc.error_message,
  tc.tool_input,
  tc.tool_output
from public.social_agent_tool_calls tc
order by tc.created_at desc
limit 50;
```

3. Approval action audit

```sql
select created_at, job_id, action, actor, actor_user_id, channel, reason, metadata
from public.content_review_actions
where channel in ('slack', 'slack_conversation')
order by created_at desc
limit 50;
```

4. Job trace audit

```sql
select created_at, job_id, source, action, stage, severity, message
from public.content_job_trace
order by created_at desc
limit 80;
```

## Pass Criteria

- Reads work for both authorized and unauthorized users.
- Writes work only for allowlisted users.
- Unauthorized writes return explicit denial.
- Tool calls and conversation messages are logged.
- Approval/reject/regen actions create audit rows.

## Known Operational Pitfalls

- `channel_not_found`: bot is not in the monitored channel.
- `missing_scope`: token not reinstalled after scope changes.
- No response: channel not monitored by `SOCIAL_CHAT_MONITOR_CHANNEL_IDS` and not covered by DM mode.
