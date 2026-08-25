-- Human outreach sequences and inbound reply monitoring.

ALTER TABLE public.outreach_messages
  ADD COLUMN IF NOT EXISTS message_parts JSONB;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS research_notes TEXT,
  ADD COLUMN IF NOT EXISTS research_sources JSONB,
  ADD COLUMN IF NOT EXISTS researched_at TIMESTAMPTZ;

ALTER TABLE public.outreach_messages
  DROP CONSTRAINT IF EXISTS outreach_message_parts_check,
  ADD CONSTRAINT outreach_message_parts_check CHECK (
    message_parts IS NULL OR (
      jsonb_typeof(message_parts) = 'array'
      AND jsonb_array_length(message_parts) BETWEEN 1 AND 2
    )
  );

CREATE TABLE IF NOT EXISTS public.outreach_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  outreach_message_id UUID REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  provider_message_id TEXT,
  body TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outreach_reply_sentiment_check CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  CONSTRAINT outreach_reply_provider_unique UNIQUE (organization_id, provider_message_id)
);

CREATE INDEX IF NOT EXISTS outreach_replies_lead_idx
  ON public.outreach_replies (lead_id, received_at DESC);

ALTER TABLE public.outreach_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org outreach replies" ON public.outreach_replies;
CREATE POLICY "Users can view org outreach replies"
  ON public.outreach_replies FOR SELECT
  USING (organization_id = public.get_user_org_id());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_replies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
