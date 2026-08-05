-- Client details (ICE, RC, address...) shown on quotes & invoices for pro clients
alter table public.quotes
  add column if not exists client_details jsonb not null default '{}'::jsonb;

alter table public.invoices
  add column if not exists client_details jsonb not null default '{}'::jsonb;
