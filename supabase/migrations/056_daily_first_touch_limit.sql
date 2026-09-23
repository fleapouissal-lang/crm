-- Daily auto first-touch quota (contacts per day, staggered across send window).

ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS daily_first_touch_limit INTEGER NOT NULL DEFAULT 30;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_agent_settings_daily_first_touch_limit_check'
  ) THEN
    ALTER TABLE public.sales_agent_settings
      ADD CONSTRAINT sales_agent_settings_daily_first_touch_limit_check
      CHECK (daily_first_touch_limit BETWEEN 0 AND 200);
  END IF;
END $$;
