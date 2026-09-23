-- Structured lead qualification extracted by the sales agent.

CREATE TABLE IF NOT EXISTS public.lead_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  need TEXT,
  budget TEXT,
  timeline TEXT,
  service_interest TEXT,
  interest_level SMALLINT,
  objections JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability TEXT,
  score INTEGER,
  notes TEXT,
  updated_by TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_qualifications_lead_unique UNIQUE (lead_id),
  CONSTRAINT lead_qualifications_interest_check CHECK (
    interest_level IS NULL OR interest_level BETWEEN 1 AND 5
  ),
  CONSTRAINT lead_qualifications_score_check CHECK (
    score IS NULL OR score BETWEEN 0 AND 100
  ),
  CONSTRAINT lead_qualifications_updated_by_check CHECK (updated_by IN ('ai', 'human'))
);

CREATE INDEX IF NOT EXISTS lead_qualifications_org_score_idx
  ON public.lead_qualifications (organization_id, score DESC NULLS LAST);

DROP TRIGGER IF EXISTS lead_qualifications_updated_at ON public.lead_qualifications;
CREATE TRIGGER lead_qualifications_updated_at
  BEFORE UPDATE ON public.lead_qualifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_qualifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org lead qualifications" ON public.lead_qualifications;
CREATE POLICY "Users can view org lead qualifications"
  ON public.lead_qualifications FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Leadership can manage lead qualifications" ON public.lead_qualifications;
CREATE POLICY "Leadership can manage lead qualifications"
  ON public.lead_qualifications FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (organization_id = public.get_user_org_id());
