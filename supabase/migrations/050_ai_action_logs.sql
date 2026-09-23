-- Audit log for AI sales agent actions.

CREATE TABLE IF NOT EXISTS public.ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  sales_project TEXT,
  action TEXT NOT NULL,
  model TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_action_logs_org_created_idx
  ON public.ai_action_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_action_logs_lead_idx
  ON public.ai_action_logs (lead_id, created_at DESC);

ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership can view ai action logs" ON public.ai_action_logs;
CREATE POLICY "Leadership can view ai action logs"
  ON public.ai_action_logs FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  );
