CREATE OR REPLACE FUNCTION public.move_opted_out_lead_to_lost()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.contact_permission = 'opted_out' THEN
    NEW.stage = 'lost';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS leads_opted_out_to_lost ON public.leads;
CREATE TRIGGER leads_opted_out_to_lost BEFORE INSERT OR UPDATE OF contact_permission ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.move_opted_out_lead_to_lost();
