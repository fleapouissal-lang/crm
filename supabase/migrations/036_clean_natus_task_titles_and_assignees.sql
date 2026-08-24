-- Keep Natus phase data in task_phase, not duplicated in the visible title,
-- and remove the former developer Ouissal from every Natus assignment.
WITH cleaned AS (
  SELECT
    id,
    regexp_replace(
      title,
      '^\[NATUS( IA)?\]\s+P[0-9]+\.[0-9]+\s*[—–-]\s*',
      '',
      'i'
    ) AS clean_title,
    array_remove(
      coalesce(assignee_ids, '{}'::uuid[]),
      '920cd449-7e1e-4578-add1-90f849ee6ae7'::uuid
    ) AS clean_assignee_ids
  FROM public.tasks
  WHERE project_id = '3c59ff68-5e27-4ed6-8128-57f80726d253'::uuid
)
UPDATE public.tasks AS task
SET
  title = cleaned.clean_title,
  assignee_ids = cleaned.clean_assignee_ids,
  assigned_to = CASE
    WHEN task.assigned_to = '920cd449-7e1e-4578-add1-90f849ee6ae7'::uuid
      THEN coalesce(cleaned.clean_assignee_ids[1], task.created_by)
    ELSE task.assigned_to
  END,
  updated_at = now()
FROM cleaned
WHERE task.id = cleaned.id
  AND (
    task.title IS DISTINCT FROM cleaned.clean_title
    OR task.assignee_ids IS DISTINCT FROM cleaned.clean_assignee_ids
    OR task.assigned_to = '920cd449-7e1e-4578-add1-90f849ee6ae7'::uuid
  );
