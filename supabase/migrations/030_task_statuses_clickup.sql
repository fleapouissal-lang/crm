-- Task statuses aligned with ClickUp-style workflow:
-- testing | review | in_progress | todo | backlog

ALTER TABLE public.tasks
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.tasks
  ALTER COLUMN status TYPE text
  USING status::text;

UPDATE public.tasks SET status = 'review' WHERE status = 'done';
UPDATE public.tasks SET status = 'backlog' WHERE status = 'cancelled';
UPDATE public.tasks SET status = 'todo' WHERE status IS NULL OR status = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'task_status' AND n.nspname = 'public'
  ) THEN
    DROP TYPE public.task_status;
  END IF;
END $$;

CREATE TYPE public.task_status AS ENUM (
  'testing',
  'review',
  'in_progress',
  'todo',
  'backlog'
);

ALTER TABLE public.tasks
  ALTER COLUMN status TYPE public.task_status
  USING status::public.task_status;

ALTER TABLE public.tasks
  ALTER COLUMN status SET DEFAULT 'todo'::public.task_status;

ALTER TABLE public.tasks
  ALTER COLUMN status SET NOT NULL;
