-- PHASE 2A: SOCIAL CONVERSATION AGENT SCAFFOLD
-- Adds durable memory and tool audit tables for Slack conversational agent.

CREATE TABLE IF NOT EXISTS public.social_agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  channel_id text NOT NULL,
  thread_ts text NOT NULL,
  user_id text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_ts text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, channel_id, thread_ts, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_agent_threads_channel
  ON public.social_agent_threads (channel_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.social_agent_messages (
  id bigserial PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.social_agent_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  slack_event_ts text,
  user_id text,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, role, slack_event_ts)
);

CREATE INDEX IF NOT EXISTS idx_social_agent_messages_thread
  ON public.social_agent_messages (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_agent_tool_calls (
  id bigserial PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.social_agent_threads(id) ON DELETE CASCADE,
  message_id bigint REFERENCES public.social_agent_messages(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  tool_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  tool_output jsonb,
  status text NOT NULL CHECK (status IN ('ok', 'error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_agent_tool_calls_thread
  ON public.social_agent_tool_calls (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.social_agent_cursors (
  source text PRIMARY KEY,
  cursor text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.social_agent_threads IS 'Conversation sessions for Slack social agent.';
COMMENT ON TABLE public.social_agent_messages IS 'Append-only message log for social agent threads.';
COMMENT ON TABLE public.social_agent_tool_calls IS 'Tool call audit log for social agent decisions/actions.';
COMMENT ON TABLE public.social_agent_cursors IS 'Polling cursors for channel/event ingestion checkpoints.';
