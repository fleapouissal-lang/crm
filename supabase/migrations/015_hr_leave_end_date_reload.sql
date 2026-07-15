-- Repair: ensure leave_end_date exists and refresh Supabase PostgREST schema cache
ALTER TABLE public.hr_entries
  ADD COLUMN IF NOT EXISTS leave_end_date DATE;

NOTIFY pgrst, 'reload schema';
