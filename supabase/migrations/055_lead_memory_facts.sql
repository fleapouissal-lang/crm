-- Structured long-term memory facts per lead.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS memory_facts JSONB NOT NULL DEFAULT '{}'::jsonb;
