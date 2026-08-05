-- Imported finance documents (read-only content; status/delete still allowed)
alter table public.quotes
  add column if not exists is_imported boolean not null default false,
  add column if not exists import_file_name text,
  add column if not exists import_file_mime text,
  add column if not exists import_storage_path text;

alter table public.invoices
  add column if not exists is_imported boolean not null default false,
  add column if not exists import_file_name text,
  add column if not exists import_file_mime text,
  add column if not exists import_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'finance-imports',
  'finance-imports',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Org members read finance imports" on storage.objects;
drop policy if exists "Org members upload finance imports" on storage.objects;
drop policy if exists "Org members update finance imports" on storage.objects;
drop policy if exists "Org members delete finance imports" on storage.objects;

create policy "Org members read finance imports"
  on storage.objects for select
  using (
    bucket_id = 'finance-imports'
    and (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

create policy "Org members upload finance imports"
  on storage.objects for insert
  with check (
    bucket_id = 'finance-imports'
    and (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

create policy "Org members update finance imports"
  on storage.objects for update
  using (
    bucket_id = 'finance-imports'
    and (storage.foldername(name))[1] = public.get_user_org_id()::text
  );

create policy "Org members delete finance imports"
  on storage.objects for delete
  using (
    bucket_id = 'finance-imports'
    and (storage.foldername(name))[1] = public.get_user_org_id()::text
  );
