-- Human-like timing + language matching for AI sales agent.

ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS match_prospect_language BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reply_delay_min_sec INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS reply_delay_max_sec INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS first_touch_stagger_min_sec INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS first_touch_stagger_max_sec INTEGER NOT NULL DEFAULT 420,
  ADD COLUMN IF NOT EXISTS send_window_start_hour INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS send_window_end_hour INTEGER NOT NULL DEFAULT 21;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_agent_settings_reply_delay_check'
  ) THEN
    ALTER TABLE public.sales_agent_settings
      ADD CONSTRAINT sales_agent_settings_reply_delay_check
      CHECK (
        reply_delay_min_sec BETWEEN 0 AND 900
        AND reply_delay_max_sec BETWEEN 0 AND 1800
        AND reply_delay_max_sec >= reply_delay_min_sec
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_agent_settings_first_touch_stagger_check'
  ) THEN
    ALTER TABLE public.sales_agent_settings
      ADD CONSTRAINT sales_agent_settings_first_touch_stagger_check
      CHECK (
        first_touch_stagger_min_sec BETWEEN 0 AND 3600
        AND first_touch_stagger_max_sec BETWEEN 0 AND 7200
        AND first_touch_stagger_max_sec >= first_touch_stagger_min_sec
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_agent_settings_send_window_check'
  ) THEN
    ALTER TABLE public.sales_agent_settings
      ADD CONSTRAINT sales_agent_settings_send_window_check
      CHECK (
        send_window_start_hour BETWEEN 0 AND 23
        AND send_window_end_hour BETWEEN 0 AND 23
      );
  END IF;
END $$;
