-- Multi-company: email domain, director, org job roles

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS email_domain TEXT,
  ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.org_job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS org_job_roles_org_idx ON public.org_job_roles(organization_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_role_id UUID REFERENCES public.org_job_roles(id) ON DELETE SET NULL;

-- RLS org_job_roles
ALTER TABLE public.org_job_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view job roles"
  ON public.org_job_roles FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Admins can manage job roles"
  ON public.org_job_roles FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() = 'admin'
  );

-- Creators can view organizations they created
CREATE POLICY "Creators can view organizations they created"
  ON public.organizations FOR SELECT
  USING (created_by = auth.uid());

-- Admins can insert custom job roles (covered by FOR ALL above)
