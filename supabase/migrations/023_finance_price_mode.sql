-- Org-wide HT / TTC pricing mode for finance documents
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS finance_price_mode TEXT NOT NULL DEFAULT 'ttc'
  CHECK (finance_price_mode IN ('ht', 'ttc'));
