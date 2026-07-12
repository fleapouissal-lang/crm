-- Soft deactivate companies from platform admin
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations (is_active);
