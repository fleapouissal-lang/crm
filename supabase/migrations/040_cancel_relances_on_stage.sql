CREATE OR REPLACE FUNCTION public.cancel_relances_on_terminal_stage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage IN ('qualified', 'won', 'lost') THEN
    UPDATE public.outreach_relances
    SET status = 'cancelled', updated_at = now()
    WHERE lead_id = NEW.id AND status IN ('planned', 'sending');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS leads_cancel_relances_on_stage ON public.leads;
CREATE TRIGGER leads_cancel_relances_on_stage AFTER UPDATE OF stage ON public.leads
FOR EACH ROW WHEN (NEW.stage IN ('qualified', 'won', 'lost'))
EXECUTE FUNCTION public.cancel_relances_on_terminal_stage();
