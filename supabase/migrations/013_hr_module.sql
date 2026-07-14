-- HR / Équipe: payroll profiles, entries, contract scans (leadership-only RLS)

CREATE OR REPLACE FUNCTION public.is_org_leadership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
      AND organization_id IS NOT NULL
  );
$$;

CREATE TABLE IF NOT EXISTS public.hr_employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_title TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT 'tech',
  business_unit TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  base_salary NUMERIC(14, 2),
  salary_currency TEXT NOT NULL DEFAULT 'MAD',
  overtime_rate NUMERIC(14, 2),
  contract_type TEXT NOT NULL DEFAULT 'core',
  utilization INT NOT NULL DEFAULT 75 CHECK (utilization >= 0 AND utilization <= 100),
  status TEXT NOT NULL DEFAULT 'active',
  contract_start DATE,
  contract_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.hr_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entry_date DATE NOT NULL,
  amount NUMERIC(14, 2),
  currency TEXT NOT NULL DEFAULT 'MAD',
  hours NUMERIC(10, 2),
  minutes INT,
  days NUMERIC(10, 2),
  note TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_contract_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_profiles_org ON public.hr_employee_profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_member ON public.hr_employee_profiles (member_id);
CREATE INDEX IF NOT EXISTS idx_hr_entries_org_member ON public.hr_entries (organization_id, member_id);
CREATE INDEX IF NOT EXISTS idx_hr_entries_date ON public.hr_entries (organization_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_hr_scans_org_member ON public.hr_contract_scans (organization_id, member_id);

CREATE TRIGGER hr_employee_profiles_updated_at
  BEFORE UPDATE ON public.hr_employee_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hr_employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contract_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leadership can view HR profiles"
  ON public.hr_employee_profiles FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert HR profiles"
  ON public.hr_employee_profiles FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can update HR profiles"
  ON public.hr_employee_profiles FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  )
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete HR profiles"
  ON public.hr_employee_profiles FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can view HR entries"
  ON public.hr_entries FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert HR entries"
  ON public.hr_entries FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can update HR entries"
  ON public.hr_entries FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  )
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete HR entries"
  ON public.hr_entries FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can view HR scans"
  ON public.hr_contract_scans FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can insert HR scans"
  ON public.hr_contract_scans FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

CREATE POLICY "Leadership can delete HR scans"
  ON public.hr_contract_scans FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.is_org_leadership()
  );

-- Private bucket: path = {org_id}/{member_id}/{scan_id}-filename
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-contracts',
  'hr-contracts',
  false,
  3145728,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Leadership read HR contracts" ON storage.objects;
DROP POLICY IF EXISTS "Leadership upload HR contracts" ON storage.objects;
DROP POLICY IF EXISTS "Leadership update HR contracts" ON storage.objects;
DROP POLICY IF EXISTS "Leadership delete HR contracts" ON storage.objects;

CREATE POLICY "Leadership read HR contracts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hr-contracts'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership upload HR contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hr-contracts'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership update HR contracts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'hr-contracts'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  )
  WITH CHECK (
    bucket_id = 'hr-contracts'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

CREATE POLICY "Leadership delete HR contracts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'hr-contracts'
    AND public.is_org_leadership()
    AND (storage.foldername(name))[1] = public.get_user_org_id()::text
  );
