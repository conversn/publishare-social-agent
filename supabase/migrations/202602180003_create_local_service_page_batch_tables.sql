create table if not exists public.local_service_page_batch_jobs (
  id uuid primary key default gen_random_uuid(),
  site_id text not null default 'homesimple',
  status text not null check (status in ('queued','running','completed','failed','partial')),
  mode text not null check (mode in ('draft','refresh','publish')),
  request_payload jsonb not null,
  total_items int not null default 0,
  processed_items int not null default 0,
  success_items int not null default 0,
  failed_items int not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.local_service_page_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.local_service_page_batch_jobs(id) on delete cascade,
  site_id text not null default 'homesimple',
  service_slug text not null,
  city_slug text not null,
  state_code text not null,
  status text not null check (status in ('queued','running','completed','failed','skipped')),
  attempts int not null default 0,
  page_id uuid,
  response jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, service_slug, city_slug, state_code)
);

create index if not exists idx_local_service_batch_jobs_status on public.local_service_page_batch_jobs(status);
create index if not exists idx_local_service_batch_items_batch_status on public.local_service_page_batch_items(batch_id, status);

drop trigger if exists trg_local_service_page_batch_jobs_updated_at on public.local_service_page_batch_jobs;
create trigger trg_local_service_page_batch_jobs_updated_at
before update on public.local_service_page_batch_jobs
for each row execute function public.set_updated_at();

drop trigger if exists trg_local_service_page_batch_items_updated_at on public.local_service_page_batch_items;
create trigger trg_local_service_page_batch_items_updated_at
before update on public.local_service_page_batch_items
for each row execute function public.set_updated_at();
