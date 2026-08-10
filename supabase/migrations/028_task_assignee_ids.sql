-- Multiple task assignees (UUID array), keep assigned_to as primary for RLS/compat

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_ids UUID[] NOT NULL DEFAULT '{}';

UPDATE public.tasks
SET assignee_ids = ARRAY[assigned_to]
WHERE assigned_to IS NOT NULL
  AND (assignee_ids = '{}' OR assignee_ids IS NULL);

CREATE INDEX IF NOT EXISTS tasks_assignee_ids_gin
  ON public.tasks USING GIN (assignee_ids);
