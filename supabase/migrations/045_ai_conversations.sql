-- AI conversation threads for WhatsApp sales agent.

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sales_project TEXT NOT NULL DEFAULT 'Fusion Leap',
  mode TEXT NOT NULL DEFAULT 'ai',
  handoff_reason TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ai_conversations_mode_check CHECK (mode IN ('ai', 'human', 'paused')),
  CONSTRAINT ai_conversations_lead_unique UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS ai_conversations_org_mode_idx
  ON public.ai_conversations (organization_id, mode, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_message_id TEXT,
  outreach_message_id UUID REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  outreach_reply_id UUID REFERENCES public.outreach_replies(id) ON DELETE SET NULL,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversation_messages_role_check CHECK (
    role IN ('prospect', 'assistant', 'human', 'system')
  )
);

CREATE INDEX IF NOT EXISTS conversation_messages_conv_idx
  ON public.conversation_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS conversation_messages_lead_idx
  ON public.conversation_messages (lead_id, created_at DESC);

DROP TRIGGER IF EXISTS ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can view org ai conversations"
  ON public.ai_conversations FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Leadership can manage org ai conversations" ON public.ai_conversations;
CREATE POLICY "Leadership can manage org ai conversations"
  ON public.ai_conversations FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Users can view org conversation messages" ON public.conversation_messages;
CREATE POLICY "Users can view org conversation messages"
  ON public.conversation_messages FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Leadership can insert conversation messages" ON public.conversation_messages;
CREATE POLICY "Leadership can insert conversation messages"
  ON public.conversation_messages FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
