-- Link leads to CRM clients for sales-agent memory.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_client_id_idx
  ON public.leads (client_id)
  WHERE client_id IS NOT NULL;
