-- Project PDF reports (org-scoped, leadership-only)

CREATE TABLE IF NOT EXISTS public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  project_title TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  storage_path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_reports_org
  ON public.project_reports (organization_id);
CREATE INDEX IF NOT EXISTS idx_project_reports_org_project
  ON public.project_reports (organization_id, project_id);

ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership can view project reports" ON public.project_reports;
DROP POLICY IF EXISTS "Leadership can insert project reports" ON public.project_reports;
DROP POLICY IF EXISTS "Leadership can delete project reports" ON public.project_reports;

CREATE POLICY "Leadership can view project reports"
  ON public.project_reports FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert project reports"
  ON public.project_reports FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete project reports"
  ON public.project_reports FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-reports',
  'project-reports',
  false,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Leadership read project reports" ON storage.objects;
DROP POLICY IF EXISTS "Leadership upload project reports" ON storage.objects;
DROP POLICY IF EXISTS "Leadership update project reports" ON storage.objects;
DROP POLICY IF EXISTS "Leadership delete project reports" ON storage.objects;

CREATE POLICY "Leadership read project reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-reports'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership upload project reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-reports'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership update project reports"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-reports'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership delete project reports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-reports'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );
