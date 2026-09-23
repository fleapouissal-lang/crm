-- Link finance quotes to sales leads for AI proposals.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotes_lead_idx
  ON public.quotes (lead_id)
  WHERE lead_id IS NOT NULL;
