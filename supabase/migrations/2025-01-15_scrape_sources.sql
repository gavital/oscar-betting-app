create extension if not exists pgcrypto;

create or replace function public.trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Tabela global de fontes para scraper (sem category_id)
create table if not exists public.scrape_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  keywords text[] default '{}',
  enabled boolean not null default true,
  source_name text,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_timestamp_scrape_sources on public.scrape_sources;
create trigger set_timestamp_scrape_sources
before update on public.scrape_sources
for each row
execute procedure public.trigger_set_timestamp();

create unique index if not exists scrape_sources_url_uidx on public.scrape_sources (lower(url));

alter table public.scrape_sources enable row level security;

-- Função is_admin (caso ainda não exista)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, 'user')) = 'admin'
  );
$$;

-- Admin full access
drop policy if exists "admin full access scrape_sources" on public.scrape_sources;
create policy "admin full access scrape_sources"
on public.scrape_sources
as permissive
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Leitura (pública ou autenticada; escolha conforme sua necessidade)
drop policy if exists "read scrape_sources for public" on public.scrape_sources;
create policy "read scrape_sources for public"
on public.scrape_sources
as permissive
for select
to public
using (true);