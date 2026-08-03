-- Report folders with PDF files (org-scoped, leadership-only)

CREATE TABLE IF NOT EXISTS public.report_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_folder_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.report_folders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  storage_path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_folders_org
  ON public.report_folders (organization_id);
CREATE INDEX IF NOT EXISTS idx_report_folder_files_org
  ON public.report_folder_files (organization_id);
CREATE INDEX IF NOT EXISTS idx_report_folder_files_folder
  ON public.report_folder_files (folder_id);

ALTER TABLE public.report_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_folder_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership can view report folders" ON public.report_folders;
DROP POLICY IF EXISTS "Leadership can insert report folders" ON public.report_folders;
DROP POLICY IF EXISTS "Leadership can update report folders" ON public.report_folders;
DROP POLICY IF EXISTS "Leadership can delete report folders" ON public.report_folders;

CREATE POLICY "Leadership can view report folders"
  ON public.report_folders FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert report folders"
  ON public.report_folders FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can update report folders"
  ON public.report_folders FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete report folders"
  ON public.report_folders FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

DROP POLICY IF EXISTS "Leadership can view report folder files" ON public.report_folder_files;
DROP POLICY IF EXISTS "Leadership can insert report folder files" ON public.report_folder_files;
DROP POLICY IF EXISTS "Leadership can delete report folder files" ON public.report_folder_files;

CREATE POLICY "Leadership can view report folder files"
  ON public.report_folder_files FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert report folder files"
  ON public.report_folder_files FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete report folder files"
  ON public.report_folder_files FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

-- Reuse project-reports bucket (PDF only, org-scoped path policies already exist)
