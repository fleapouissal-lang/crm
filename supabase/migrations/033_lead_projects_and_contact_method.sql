-- Separate prospect pipelines by sales project and record how contact happened.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sales_project TEXT NOT NULL DEFAULT 'Fusion Leap',
  ADD COLUMN IF NOT EXISTS last_contact_method TEXT;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_last_contact_method_check,
  ADD CONSTRAINT leads_last_contact_method_check
    CHECK (last_contact_method IS NULL OR last_contact_method IN ('phone', 'email', 'visit'));

UPDATE public.leads
SET sales_project = 'Fusion Leap'
WHERE sales_project IS NULL OR btrim(sales_project) = '';

CREATE INDEX IF NOT EXISTS leads_sales_project_idx
  ON public.leads (organization_id, sales_project, stage);
