-- Flag human handoffs that need manual reply urgently (AI did not understand).

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ai_conversations_org_urgent_idx
  ON public.ai_conversations (organization_id, urgent, last_message_at DESC)
  WHERE mode = 'human' AND urgent = true;
