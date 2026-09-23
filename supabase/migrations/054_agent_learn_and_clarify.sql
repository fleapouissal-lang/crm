-- Human examples the agent learns from + clarify-before-urgent.

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS clarify_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sales_agent_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  inbound TEXT NOT NULL,
  reply TEXT NOT NULL,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_agent_examples_org_idx
  ON public.sales_agent_examples (organization_id, created_at DESC);

ALTER TABLE public.sales_agent_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org sales examples" ON public.sales_agent_examples;
CREATE POLICY "Users can view org sales examples"
  ON public.sales_agent_examples FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Leadership can insert sales examples" ON public.sales_agent_examples;
CREATE POLICY "Leadership can insert sales examples"
  ON public.sales_agent_examples FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  );
