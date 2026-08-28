-- Optional CRM login identity for an AI agent. When present, agent-owned
-- tasks are assigned to this profile so the agent can see only its own work.
ALTER TABLE public.ai_agents
  ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_agents_profile_idx
  ON public.ai_agents (profile_id)
  WHERE profile_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
