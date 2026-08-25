-- Task workspace: acceptance criteria, execution estimates, subtasks,
-- dependencies, resources, and comments.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS tracked_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_estimated_minutes_check,
  ADD CONSTRAINT tasks_estimated_minutes_check
    CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  DROP CONSTRAINT IF EXISTS tasks_tracked_minutes_check,
  ADD CONSTRAINT tasks_tracked_minutes_check
    CHECK (tracked_minutes >= 0);

CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_subtasks_task_idx
  ON public.task_subtasks (organization_id, task_id, position);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  related_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('depends_on', 'blocks', 'relates_to')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, related_task_id, relation),
  CHECK (task_id <> related_task_id)
);

CREATE INDEX IF NOT EXISTS task_dependencies_task_idx
  ON public.task_dependencies (organization_id, task_id);

CREATE TABLE IF NOT EXISTS public.task_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'link' CHECK (kind IN ('link', 'github', 'document', 'design', 'file')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_resources_task_idx
  ON public.task_resources (organization_id, task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx
  ON public.task_comments (organization_id, task_id, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['task_subtasks', 'task_dependencies', 'task_resources', 'task_comments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (organization_id = public.get_user_org_id())', table_name || '_select_org', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (organization_id = public.get_user_org_id())', table_name || '_insert_org', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (organization_id = public.get_user_org_id()) WITH CHECK (organization_id = public.get_user_org_id())', table_name || '_update_org', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete_org', table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (organization_id = public.get_user_org_id())', table_name || '_delete_org', table_name);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS task_subtasks_updated_at ON public.task_subtasks;
CREATE TRIGGER task_subtasks_updated_at
  BEFORE UPDATE ON public.task_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_subtasks;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
