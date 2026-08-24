-- Delivery phase is independent from execution status (todo, in progress, done).

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_phase TEXT;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_task_phase_check,
  ADD CONSTRAINT tasks_task_phase_check
    CHECK (task_phase IS NULL OR task_phase ~ '^P[0-9]+$');

UPDATE public.tasks AS task
SET task_phase = upper((regexp_match(task.title, '(P[0-9]+)[.][0-9]+', 'i'))[1])
FROM public.projects AS project
WHERE task.project_id = project.id
  AND lower(project.title) = 'natus'
  AND task.task_phase IS NULL
  AND task.title ~* 'P[0-9]+[.][0-9]+';

CREATE INDEX IF NOT EXISTS tasks_project_phase_idx
  ON public.tasks (organization_id, project_id, task_phase);
