CREATE TABLE IF NOT EXISTS public.outreach_relances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence smallint NOT NULL CHECK (sequence BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','sending','sent','replied','cancelled','failed','lost')),
  body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  response_received_at timestamptz,
  lost_at timestamptz,
  provider_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, sequence)
);

CREATE INDEX IF NOT EXISTS outreach_relances_due_idx
  ON public.outreach_relances (organization_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS outreach_relances_lead_idx
  ON public.outreach_relances (lead_id, sequence);

ALTER TABLE public.outreach_relances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relances_select_org" ON public.outreach_relances FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_outreach_relances_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS outreach_relances_updated_at ON public.outreach_relances;
CREATE TRIGGER outreach_relances_updated_at BEFORE UPDATE ON public.outreach_relances
FOR EACH ROW EXECUTE FUNCTION public.touch_outreach_relances_updated_at();
