-- Org-wide VAT rate for finance documents (0 = exempt, 0.2 = 20 %)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS finance_tva_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.2
  CHECK (finance_tva_rate >= 0 AND finance_tva_rate <= 1);
