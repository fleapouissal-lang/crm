-- Commercial appointments linked to leads.

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'online',
  status TEXT NOT NULL DEFAULT 'proposed',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reminder_at TIMESTAMPTZ,
  meet_url TEXT,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointments_type_check CHECK (type IN ('online', 'onsite')),
  CONSTRAINT appointments_status_check CHECK (
    status IN ('proposed', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),
  CONSTRAINT appointments_range_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS appointments_org_starts_idx
  ON public.appointments (organization_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_lead_idx
  ON public.appointments (lead_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS appointments_reminder_idx
  ON public.appointments (status, reminder_at)
  WHERE reminder_at IS NOT NULL AND status IN ('proposed', 'confirmed');

DROP TRIGGER IF EXISTS appointments_updated_at ON public.appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org appointments" ON public.appointments;
CREATE POLICY "Users can view org appointments"
  ON public.appointments FOR SELECT
  USING (organization_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Users can manage org appointments" ON public.appointments;
CREATE POLICY "Users can manage org appointments"
  ON public.appointments FOR ALL
  USING (organization_id = public.get_user_org_id())
  WITH CHECK (organization_id = public.get_user_org_id());
