-- Sales pipeline status (12 commercial statuses) alongside legacy lead_stage.

DO $$ BEGIN
  CREATE TYPE public.sales_status AS ENUM (
    'new',
    'contacted',
    'message_sent',
    'reply_received',
    'qualified',
    'discussion',
    'meeting_proposed',
    'meeting_confirmed',
    'proposal_sent',
    'won',
    'lost',
    'follow_up'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sales_status public.sales_status;

UPDATE public.leads
SET sales_status = CASE stage::text
  WHEN 'new' THEN 'new'::public.sales_status
  WHEN 'contacted' THEN 'contacted'::public.sales_status
  WHEN 'qualified' THEN 'qualified'::public.sales_status
  WHEN 'proposal' THEN 'proposal_sent'::public.sales_status
  WHEN 'negotiation' THEN 'discussion'::public.sales_status
  WHEN 'won' THEN 'won'::public.sales_status
  WHEN 'lost' THEN 'lost'::public.sales_status
  ELSE 'new'::public.sales_status
END
WHERE sales_status IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN sales_status SET DEFAULT 'new'::public.sales_status;

ALTER TABLE public.leads
  ALTER COLUMN sales_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS leads_sales_status_idx
  ON public.leads (organization_id, sales_project, sales_status);

-- Keep legacy stage roughly in sync when sales_status changes.
CREATE OR REPLACE FUNCTION public.sync_lead_stage_from_sales_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.stage := CASE NEW.sales_status::text
    WHEN 'new' THEN 'new'::public.lead_stage
    WHEN 'contacted' THEN 'contacted'::public.lead_stage
    WHEN 'message_sent' THEN 'contacted'::public.lead_stage
    WHEN 'reply_received' THEN 'contacted'::public.lead_stage
    WHEN 'qualified' THEN 'qualified'::public.lead_stage
    WHEN 'discussion' THEN 'negotiation'::public.lead_stage
    WHEN 'meeting_proposed' THEN 'negotiation'::public.lead_stage
    WHEN 'meeting_confirmed' THEN 'negotiation'::public.lead_stage
    WHEN 'proposal_sent' THEN 'proposal'::public.lead_stage
    WHEN 'won' THEN 'won'::public.lead_stage
    WHEN 'lost' THEN 'lost'::public.lead_stage
    WHEN 'follow_up' THEN 'contacted'::public.lead_stage
    ELSE NEW.stage
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_sync_stage_from_sales_status ON public.leads;
CREATE TRIGGER leads_sync_stage_from_sales_status
  BEFORE INSERT OR UPDATE OF sales_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lead_stage_from_sales_status();

-- Cancel relances on terminal / handoff statuses.
CREATE OR REPLACE FUNCTION public.cancel_relances_on_terminal_stage()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stage IN ('qualified', 'won', 'lost')
     OR COALESCE(NEW.sales_status::text, '') IN ('won', 'lost', 'meeting_confirmed', 'proposal_sent') THEN
    UPDATE public.outreach_relances
    SET status = 'cancelled',
        response_received_at = COALESCE(response_received_at, now()),
        updated_at = now()
    WHERE lead_id = NEW.id
      AND status IN ('planned', 'sending');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_cancel_relances_on_sales_status ON public.leads;
CREATE TRIGGER leads_cancel_relances_on_sales_status
  AFTER UPDATE OF sales_status ON public.leads
  FOR EACH ROW
  WHEN (NEW.sales_status IN ('won', 'lost', 'meeting_confirmed', 'proposal_sent'))
  EXECUTE FUNCTION public.cancel_relances_on_terminal_stage();
