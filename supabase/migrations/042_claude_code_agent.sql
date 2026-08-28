-- Claude Code as an organization-scoped CRM agent.
-- The agent is not a human profile: it does not need an auth.users account.

CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Claude Code',
  provider TEXT NOT NULL DEFAULT 'anthropic' CHECK (provider = 'anthropic'),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  default_model_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (default_model_mode IN ('auto', 'model', 'complexity')),
  default_model TEXT CHECK (default_model IN ('haiku', 'sonnet', 'opus', 'fable')),
  default_complexity TEXT NOT NULL DEFAULT 'balanced'
    CHECK (default_complexity IN ('fast', 'balanced', 'deep')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS ai_agents_org_idx
  ON public.ai_agents (organization_id);

-- Lets Claude Code appear on the same projects view as other team members.
CREATE TABLE IF NOT EXISTS public.ai_agent_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, project_id)
);

CREATE INDEX IF NOT EXISTS ai_agent_projects_org_project_idx
  ON public.ai_agent_projects (organization_id, project_id);

-- Keep the task as the CRM source of truth; these columns store execution intent
-- and the returned Claude Code run metadata only for agent-owned work.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_model_mode TEXT
    CHECK (ai_model_mode IN ('auto', 'model', 'complexity')),
  ADD COLUMN IF NOT EXISTS ai_requested_model TEXT
    CHECK (ai_requested_model IN ('haiku', 'sonnet', 'opus', 'fable')),
  ADD COLUMN IF NOT EXISTS ai_complexity TEXT
    CHECK (ai_complexity IN ('fast', 'balanced', 'deep')),
  ADD COLUMN IF NOT EXISTS ai_selected_model TEXT
    CHECK (ai_selected_model IN ('haiku', 'sonnet', 'opus', 'fable')),
  ADD COLUMN IF NOT EXISTS ai_execution_status TEXT
    CHECK (ai_execution_status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS ai_session_id TEXT,
  ADD COLUMN IF NOT EXISTS ai_run_id TEXT,
  ADD COLUMN IF NOT EXISTS ai_result TEXT,
  ADD COLUMN IF NOT EXISTS ai_error TEXT,
  ADD COLUMN IF NOT EXISTS ai_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS tasks_ai_agent_status_idx
  ON public.tasks (organization_id, ai_agent_id, ai_execution_status, created_at DESC)
  WHERE ai_agent_id IS NOT NULL;

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_projects ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ai_agents', 'ai_agent_projects'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (organization_id = public.get_user_org_id())', table_name || '_select_org', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (organization_id = public.get_user_org_id())', table_name || '_insert_org', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (organization_id = public.get_user_org_id()) WITH CHECK (organization_id = public.get_user_org_id())', table_name || '_update_org', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (organization_id = public.get_user_org_id())', table_name || '_delete_org', table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS ai_agents_updated_at ON public.ai_agents;
CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create one Claude Code employee for every existing organization. New
-- organizations get their agent from the CRM setup flow/server action.
INSERT INTO public.ai_agents (organization_id)
SELECT id FROM public.organizations
ON CONFLICT (organization_id, provider) DO NOTHING;

NOTIFY pgrst, 'reload schema';
