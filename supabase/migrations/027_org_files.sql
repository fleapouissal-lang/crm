-- Org files: folders with PDF / image uploads (leadership only — directeur & gérant)

CREATE TABLE IF NOT EXISTS public.file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.file_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.file_folders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_folders_org
  ON public.file_folders (organization_id);
CREATE INDEX IF NOT EXISTS idx_file_folder_items_org
  ON public.file_folder_items (organization_id);
CREATE INDEX IF NOT EXISTS idx_file_folder_items_folder
  ON public.file_folder_items (folder_id);

ALTER TABLE public.file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_folder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership can view file folders" ON public.file_folders;
DROP POLICY IF EXISTS "Leadership can insert file folders" ON public.file_folders;
DROP POLICY IF EXISTS "Leadership can update file folders" ON public.file_folders;
DROP POLICY IF EXISTS "Leadership can delete file folders" ON public.file_folders;

CREATE POLICY "Leadership can view file folders"
  ON public.file_folders FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert file folders"
  ON public.file_folders FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can update file folders"
  ON public.file_folders FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete file folders"
  ON public.file_folders FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

DROP POLICY IF EXISTS "Leadership can view file folder items" ON public.file_folder_items;
DROP POLICY IF EXISTS "Leadership can insert file folder items" ON public.file_folder_items;
DROP POLICY IF EXISTS "Leadership can update file folder items" ON public.file_folder_items;
DROP POLICY IF EXISTS "Leadership can delete file folder items" ON public.file_folder_items;

CREATE POLICY "Leadership can view file folder items"
  ON public.file_folder_items FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert file folder items"
  ON public.file_folder_items FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can update file folder items"
  ON public.file_folder_items FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete file folder items"
  ON public.file_folder_items FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-files',
  'org-files',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Leadership read org files" ON storage.objects;
DROP POLICY IF EXISTS "Leadership upload org files" ON storage.objects;
DROP POLICY IF EXISTS "Leadership update org files" ON storage.objects;
DROP POLICY IF EXISTS "Leadership delete org files" ON storage.objects;

CREATE POLICY "Leadership read org files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-files'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership upload org files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-files'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership update org files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-files'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership delete org files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-files'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );
