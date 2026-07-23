-- Enable realtime for org-scoped CRM tables so the dashboard can auto-refresh.
-- REPLICA IDENTITY FULL is required for DELETE filters on organization_id.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'leads',
    'tasks',
    'clients',
    'projects',
    'quotes',
    'invoices',
    'expenses',
    'document_templates',
    'activities',
    'hr_employee_profiles',
    'hr_entries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    BEGIN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        t
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- already in publication (e.g. leads/tasks)
    END;
  END LOOP;
END $$;
