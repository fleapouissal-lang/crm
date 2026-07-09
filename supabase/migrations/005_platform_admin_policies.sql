-- Platform admin organization policies (separate migration after enum commit)

CREATE POLICY "Platform admins view all organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admins insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admins update organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

CREATE POLICY "Platform admins delete organizations"
  ON public.organizations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );
