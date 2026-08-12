-- Allow assignees (assignee_ids) to update tasks, not only assigned_to / created_by

DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

CREATE POLICY "Users can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR auth.uid() = ANY (assignee_ids)
    )
  );
