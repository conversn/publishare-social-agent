create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'local_page_status') then
    create type local_page_status as enum ('draft','ready','published','error');
  end if;
end $$;

create table if not exists public.local_service_context (
  service_slug text primary key,
  service_name text not null,
  service_category text not null default 'home_services',
  service_synonyms text[] not null default '{}',
  primary_intents text[] not null default '{}',
  primary_keywords text[] not null default '{}',
  secondary_keywords text[] not null default '{}',
  pricing_items jsonb not null default '[]'::jsonb,
  compliance_disclaimer_short text not null,
  lead_form_variant text not null default 'service_specific',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.geo_cities (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  city_slug text not null,
  state_name text not null,
  state_code text not null check (char_length(state_code)=2),
  county_name text,
  primary_zip_codes text[] not null default '{}',
  nearby_cities jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_slug, state_code)
);

create table if not exists public.city_service_facts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.geo_cities(id) on delete cascade,
  service_slug text not null references public.local_service_context(service_slug) on delete cascade,
  climate_notes text[] not null default '{}',
  permitting_notes text[] not null default '{}',
  seasonal_timing jsonb not null default '[]'::jsonb,
  average_response_time_low_hours int,
  average_response_time_high_hours int,
  homeowner_context jsonb not null default '{}'::jsonb,
  price_multiplier numeric(6,3) not null default 1.000,
  trust_data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, service_slug)
);

create table if not exists public.local_service_pages (
  id uuid primary key default gen_random_uuid(),
  site_id text not null default 'homesimple',
  service_slug text not null references public.local_service_context(service_slug),
  city_id uuid not null references public.geo_cities(id),
  city_slug text not null,
  city_name text not null,
  state_code text not null,
  state_name text not null,
  county_name text,
  canonical_url text not null,
  slug text not null,
  title text not null,
  meta_description text not null,
  h1 text not null,
  og_title text,
  og_description text,
  og_image_path text,
  modules jsonb not null default '{}'::jsonb,
  faq_items jsonb not null default '[]'::jsonb,
  pricing_rows jsonb not null default '[]'::jsonb,
  schema_graph jsonb not null default '{}'::jsonb,
  html_content text not null default '',
  text_content text not null default '',
  word_count int not null default 0,
  quality_report jsonb not null default '{}'::jsonb,
  status local_page_status not null default 'draft',
  error_message text,
  source_hash text,
  published_at timestamptz,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, service_slug, city_slug, state_code),
  unique (canonical_url),
  unique (slug)
);

create table if not exists public.local_service_page_jobs (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  request_payload jsonb not null,
  status text not null check (status in ('started','completed','failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_local_service_pages_status on public.local_service_pages(status);
create index if not exists idx_local_service_pages_service_state on public.local_service_pages(service_slug, state_code);
create index if not exists idx_city_service_facts_service on public.city_service_facts(service_slug);
create index if not exists idx_geo_cities_slug_state on public.geo_cities(city_slug, state_code);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_local_service_context_updated_at on public.local_service_context;
create trigger trg_local_service_context_updated_at
before update on public.local_service_context
for each row execute function public.set_updated_at();

drop trigger if exists trg_geo_cities_updated_at on public.geo_cities;
create trigger trg_geo_cities_updated_at
before update on public.geo_cities
for each row execute function public.set_updated_at();

drop trigger if exists trg_city_service_facts_updated_at on public.city_service_facts;
create trigger trg_city_service_facts_updated_at
before update on public.city_service_facts
for each row execute function public.set_updated_at();

drop trigger if exists trg_local_service_pages_updated_at on public.local_service_pages;
create trigger trg_local_service_pages_updated_at
before update on public.local_service_pages
for each row execute function public.set_updated_at();
