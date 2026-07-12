-- Subscription payment ledger (card brands metadata only — never store full PAN)

CREATE TABLE IF NOT EXISTS public.platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.platform_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  method TEXT NOT NULL DEFAULT 'card'
    CHECK (method IN ('card', 'transfer', 'cash', 'other')),
  card_brand TEXT
    CHECK (card_brand IS NULL OR card_brand IN ('visa', 'mastercard', 'amex', 'discover', 'paypal', 'other')),
  card_last4 TEXT,
  card_holder TEXT,
  paid_at TIMESTAMPTZ,
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_org ON public.platform_payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_invoice ON public.platform_payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_status ON public.platform_payments (status);
CREATE INDEX IF NOT EXISTS idx_platform_payments_paid_at ON public.platform_payments (paid_at);

ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage payments"
  ON public.platform_payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );
