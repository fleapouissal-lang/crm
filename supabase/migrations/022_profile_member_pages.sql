-- Per-member customized CRM pages (mainly for stagiaire / intern access).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_pages TEXT[] DEFAULT NULL;
