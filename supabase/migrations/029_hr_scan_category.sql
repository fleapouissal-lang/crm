-- Document category for HR scans: contract vs banque (RIB / bank docs)

ALTER TABLE public.hr_contract_scans
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'contract';

UPDATE public.hr_contract_scans
SET category = 'contract'
WHERE category IS NULL OR category = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hr_contract_scans_category_check'
  ) THEN
    ALTER TABLE public.hr_contract_scans
      ADD CONSTRAINT hr_contract_scans_category_check
      CHECK (category IN ('contract', 'banque'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hr_scans_org_member_category
  ON public.hr_contract_scans (organization_id, member_id, category);
