-- Each delivery project owns its task phases. Codes remain stable while labels
-- can describe the workflow that is specific to the project.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS delivery_phases JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_delivery_phases_array_check,
  ADD CONSTRAINT projects_delivery_phases_array_check
    CHECK (jsonb_typeof(delivery_phases) = 'array');

UPDATE public.projects
SET delivery_phases = '[
  {"code":"P0","label":"Fondation & mesure"},
  {"code":"P1","label":"Routine Finder"},
  {"code":"P2","label":"Assistant WhatsApp"},
  {"code":"P3","label":"Lifecycle & contenu"},
  {"code":"P4","label":"Skin Scanner"}
]'::jsonb
WHERE lower(trim(title)) = 'natus'
  AND delivery_phases = '[]'::jsonb;
