-- AI sales prospecting and outreach workspace.
-- Leads remain the Kanban source of truth; outreach messages are an auditable outbox.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT,
  ADD COLUMN IF NOT EXISTS email_normalized TEXT,
  ADD COLUMN IF NOT EXISTS ai_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS contact_permission TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_ai_score_check,
  ADD CONSTRAINT leads_ai_score_check
    CHECK (ai_score IS NULL OR ai_score BETWEEN 0 AND 100),
  DROP CONSTRAINT IF EXISTS leads_contact_permission_check,
  ADD CONSTRAINT leads_contact_permission_check
    CHECK (contact_permission IN ('unknown', 'legitimate_interest', 'consented', 'opted_out'));

CREATE INDEX IF NOT EXISTS leads_phone_normalized_idx
  ON public.leads (organization_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_email_normalized_idx
  ON public.leads (organization_id, email_normalized)
  WHERE email_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_follow_up_idx
  ON public.leads (organization_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subject TEXT,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  provider TEXT,
  provider_message_id TEXT,
  idempotency_key TEXT,
  error_message TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outreach_channel_check CHECK (channel IN ('whatsapp', 'email', 'sms')),
  CONSTRAINT outreach_status_check CHECK (
    status IN ('draft', 'approved', 'queued', 'sending', 'sent', 'delivered', 'replied', 'failed', 'cancelled')
  ),
  CONSTRAINT outreach_idempotency_unique UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS outreach_messages_org_status_idx
  ON public.outreach_messages (organization_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS outreach_messages_lead_idx
  ON public.outreach_messages (lead_id, created_at DESC);

DROP TRIGGER IF EXISTS outreach_messages_updated_at ON public.outreach_messages;
CREATE TRIGGER outreach_messages_updated_at
  BEFORE UPDATE ON public.outreach_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org outreach" ON public.outreach_messages;
CREATE POLICY "Users can view org outreach"
  ON public.outreach_messages FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Users can create org outreach drafts" ON public.outreach_messages;
CREATE POLICY "Users can create org outreach drafts"
  ON public.outreach_messages FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND created_by = auth.uid()
    AND status = 'draft'
  );

DROP POLICY IF EXISTS "Leadership can update org outreach" ON public.outreach_messages;
CREATE POLICY "Leadership can update org outreach"
  ON public.outreach_messages FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Creators can cancel own outreach drafts" ON public.outreach_messages;
CREATE POLICY "Creators can cancel own outreach drafts"
  ON public.outreach_messages FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND created_by = auth.uid()
    AND status = 'draft'
  )
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND created_by = auth.uid()
    AND status IN ('draft', 'cancelled')
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
