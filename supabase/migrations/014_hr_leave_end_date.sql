-- Leave entries: optional end date (start = entry_date)
ALTER TABLE public.hr_entries
  ADD COLUMN IF NOT EXISTS leave_end_date DATE;
