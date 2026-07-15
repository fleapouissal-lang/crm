-- Allow org members to read their own HR dossier (settings self-service)

CREATE POLICY "Members can view own HR profile"
  ON public.hr_employee_profiles FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND member_id = auth.uid()
  );

CREATE POLICY "Members can view own HR entries"
  ON public.hr_entries FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND member_id = auth.uid()
  );

CREATE POLICY "Members can view own HR scans"
  ON public.hr_contract_scans FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND member_id = auth.uid()
  );

CREATE POLICY "Members read own HR contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hr-contracts'
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';
