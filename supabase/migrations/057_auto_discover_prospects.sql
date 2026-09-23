-- Auto-discover prospects settings (public web search → leads).

ALTER TABLE public.sales_agent_settings
  ADD COLUMN IF NOT EXISTS auto_discover BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_discover_limit INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS discover_cities TEXT[] NOT NULL DEFAULT ARRAY['Casablanca','Rabat','Marrakech','Tanger','Fès'],
  ADD COLUMN IF NOT EXISTS discover_sectors TEXT[] NOT NULL DEFAULT ARRAY['restaurant','café','hôtel','cabinet dentaire','agence immobilière','boutique'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_agent_settings_daily_discover_limit_check'
  ) THEN
    ALTER TABLE public.sales_agent_settings
      ADD CONSTRAINT sales_agent_settings_daily_discover_limit_check
      CHECK (daily_discover_limit BETWEEN 0 AND 100);
  END IF;
END $$;
