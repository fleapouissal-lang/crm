-- Fusion Leap CRM — Initial Schema
-- Run this in the Supabase SQL Editor

-- Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'member');
CREATE TYPE public.lead_stage AS ENUM (
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
);
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.activity_type AS ENUM (
  'lead_created', 'lead_updated', 'lead_stage_changed', 'lead_deleted',
  'task_created', 'task_updated', 'task_completed', 'task_deleted'
);
CREATE TYPE public.entity_type AS ENUM ('lead', 'task');

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'member',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  stage public.lead_stage NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX leads_org_idx ON public.leads(organization_id);
CREATE INDEX leads_stage_idx ON public.leads(stage);
CREATE INDEX leads_assigned_idx ON public.leads(assigned_to);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_org_idx ON public.tasks(organization_id);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_due_idx ON public.tasks(due_date);
CREATE INDEX tasks_assigned_idx ON public.tasks(assigned_to);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type public.activity_type NOT NULL,
  entity_type public.entity_type NOT NULL,
  entity_id UUID,
  message TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activities_org_idx ON public.activities(organization_id);
CREATE INDEX activities_created_idx ON public.activities(created_at DESC);

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'member'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id());

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (id = public.get_user_org_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Users can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR organization_id = public.get_user_org_id()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR (organization_id = public.get_user_org_id() AND public.get_user_role() = 'admin')
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Leads policies
CREATE POLICY "Users can view org leads"
  ON public.leads FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can create org leads"
  ON public.leads FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update leads"
  ON public.leads FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Managers can delete leads"
  ON public.leads FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  );

-- Tasks policies
CREATE POLICY "Users can view org tasks"
  ON public.tasks FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can create org tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
    )
  );

CREATE POLICY "Managers can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND public.get_user_role() IN ('admin', 'manager')
  );

-- Activities policies
CREATE POLICY "Users can view org activities"
  ON public.activities FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can create org activities"
  ON public.activities FOR INSERT
  WITH CHECK (organization_id = public.get_user_org_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
