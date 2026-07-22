-- Company CRM entities: clients, projects, finance docs (replaces browser localStorage)

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initials TEXT NOT NULL DEFAULT '',
  gradient TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  market_code TEXT NOT NULL DEFAULT 'MA',
  location TEXT NOT NULL DEFAULT '',
  engagement TEXT NOT NULL DEFAULT '',
  value_amount NUMERIC(14, 2),
  value_currency TEXT NOT NULL DEFAULT 'MAD',
  status_key TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients (organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (organization_id, name);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  initials TEXT NOT NULL DEFAULT '',
  gradient TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  badge_class TEXT NOT NULL DEFAULT 'b-blue',
  status_key TEXT NOT NULL DEFAULT 'onTrack',
  team_member_ids UUID[] NOT NULL DEFAULT '{}',
  chip_key TEXT NOT NULL DEFAULT 'onTrack',
  chip_rose BOOLEAN NOT NULL DEFAULT false,
  phase TEXT NOT NULL DEFAULT 'inProgress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects (organization_id);

-- Link tasks to projects
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks (project_id);

-- Document templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('quote', 'invoice')),
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  footer_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_org ON public.document_templates (organization_id);

-- Quotes (line items as JSONB for parity with app model)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_type TEXT NOT NULL DEFAULT 'pro' CHECK (client_type IN ('particulier', 'pro')),
  service TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  validity_days INT NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes (organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (organization_id, status);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  client_type TEXT NOT NULL DEFAULT 'pro' CHECK (client_type IN ('particulier', 'pro')),
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices (organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (organization_id, status);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  vendor TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MAD',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses (organization_id);

-- updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'clients_updated_at') THEN
    CREATE TRIGGER clients_updated_at
      BEFORE UPDATE ON public.clients
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'projects_updated_at') THEN
    CREATE TRIGGER projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'document_templates_updated_at') THEN
    CREATE TRIGGER document_templates_updated_at
      BEFORE UPDATE ON public.document_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'quotes_updated_at') THEN
    CREATE TRIGGER quotes_updated_at
      BEFORE UPDATE ON public.quotes
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'invoices_updated_at') THEN
    CREATE TRIGGER invoices_updated_at
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'expenses_updated_at') THEN
    CREATE TRIGGER expenses_updated_at
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Org-scoped policies (app layer enforces capability roles)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients',
    'projects',
    'document_templates',
    'quotes',
    'invoices',
    'expenses'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Org members can select ' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (organization_id = public.get_user_org_id())',
      'Org members can select ' || t,
      t
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Org members can insert ' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (organization_id = public.get_user_org_id())',
      'Org members can insert ' || t,
      t
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Org members can update ' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (organization_id = public.get_user_org_id())',
      'Org members can update ' || t,
      t
    );

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      'Org members can delete ' || t,
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (organization_id = public.get_user_org_id())',
      'Org members can delete ' || t,
      t
    );
  END LOOP;
END $$;
