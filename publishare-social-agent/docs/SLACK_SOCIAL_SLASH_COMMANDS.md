# Slack Social Review Slash Commands

This guide covers how to operate the social review system from Slack using `/social`.

## Command Reference

`/social help`
- Shows all commands, examples, and notes.

`/social queue [limit]`
- Lists jobs currently waiting on human approval.
- `limit` is optional.
- Default: `10`
- Max: `25`

`/social next`
- Returns the next job awaiting approval, with quick actions.

`/social status <job_id>`
- Shows current status and suggested next commands for one job.

`/social approve <job_id>`
- Approves a job and re-queues it for publish.

`/social reject <job_id> [reason]`
- Rejects a job.
- Reason is optional but recommended.

`/social regen <job_id> [reason]`
- Requests regeneration and re-queues the job.
- Reason is optional but recommended.

`/social retry-failed [limit]`
- Re-queues failed jobs back to `queued`.
- `limit` is optional.
- Default: `10`
- Max: `25`

## Common Workflows

## Review queue triage
1. Run `/social queue 10`
2. Pick a job id.
3. Run `/social status <job_id>`
4. Run one action:
   - `/social approve <job_id>`
   - `/social reject <job_id> <reason>`
   - `/social regen <job_id> <reason>`

## Fast path
1. Run `/social next`
2. Run `/social approve <job_id>` or `/social regen <job_id> <reason>`

## Recover failed jobs
1. Run `/social retry-failed 5`
2. Run `/social queue 10`

## Example Commands

`/social queue 5`

`/social next`

`/social status ba63f499-9ed3-48f3-b73a-b90a1c5f4284`

`/social approve ba63f499-9ed3-48f3-b73a-b90a1c5f4284`

`/social reject ba63f499-9ed3-48f3-b73a-b90a1c5f4284 Off-brand tone`

`/social regen ba63f499-9ed3-48f3-b73a-b90a1c5f4284 Add a concrete customer example`

`/social retry-failed 3`

## Troubleshooting

`dispatch_failed` in Slack:
- Confirm Slash Command Request URL:
  - `https://vpysqshhafthuxvokwqj.functions.supabase.co/slack-social-approval`
- Confirm function is deployed with JWT verification disabled for Slack access.
- Confirm `SLACK_SIGNING_SECRET` in Supabase matches the Slack app signing secret.

`Invalid signature` response:
- Re-copy signing secret from Slack app config and set it again in Supabase secrets.

No jobs in queue:
- Jobs may already be approved/rejected, failed, or not requiring approval.
- Check one specific job with `/social status <job_id>`.
