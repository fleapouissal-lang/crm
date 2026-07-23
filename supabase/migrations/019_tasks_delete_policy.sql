-- Align task DELETE RLS with app permissions (canDeleteTaskForProfile):
-- leadership can delete any org task; développeurs can delete tasks they own.

DROP POLICY IF EXISTS "Managers can delete tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR (
        (assigned_to = auth.uid() OR created_by = auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.org_job_roles j ON j.id = p.job_role_id
          WHERE p.id = auth.uid()
            AND j.slug = 'developpeur'
        )
      )
    )
  );
