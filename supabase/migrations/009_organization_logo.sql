-- Company logo for tenant branding
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Public bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

CREATE POLICY "Platform admins upload org logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admins update org logos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admins delete org logos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Company admins manage own org logo"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.organization_id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'org-logos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.organization_id::text = (storage.foldername(name))[1]
    )
  );
