-- Per-organization / per-project AI sales agent settings.

CREATE TABLE IF NOT EXISTS public.sales_agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_project TEXT NOT NULL DEFAULT 'Fusion Leap',
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_first_touch BOOLEAN NOT NULL DEFAULT true,
  auto_reply BOOLEAN NOT NULL DEFAULT true,
  require_human_approval BOOLEAN NOT NULL DEFAULT false,
  max_msgs_per_lead_day INTEGER NOT NULL DEFAULT 8,
  max_msgs_per_org_hour INTEGER NOT NULL DEFAULT 40,
  require_opt_in_mode BOOLEAN NOT NULL DEFAULT false,
  handoff_assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  relance_delays_hours INTEGER[] NOT NULL DEFAULT ARRAY[8, 16, 24],
  project_playbook JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sales_agent_settings_org_project_unique UNIQUE (organization_id, sales_project),
  CONSTRAINT sales_agent_settings_max_lead_check CHECK (max_msgs_per_lead_day BETWEEN 1 AND 50),
  CONSTRAINT sales_agent_settings_max_org_check CHECK (max_msgs_per_org_hour BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS sales_agent_settings_org_idx
  ON public.sales_agent_settings (organization_id);

DROP TRIGGER IF EXISTS sales_agent_settings_updated_at ON public.sales_agent_settings;
CREATE TRIGGER sales_agent_settings_updated_at
  BEFORE UPDATE ON public.sales_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.sales_agent_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org sales agent settings" ON public.sales_agent_settings;
CREATE POLICY "Users can view org sales agent settings"
  ON public.sales_agent_settings FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Leadership can manage sales agent settings" ON public.sales_agent_settings;
CREATE POLICY "Leadership can manage sales agent settings"
  ON public.sales_agent_settings FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (organization_id = public.get_user_org_id());
