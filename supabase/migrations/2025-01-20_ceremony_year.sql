-- supabase/migrations/2025-01-20_ceremony_year.sql

-- Adiciona coluna de ano da edição nas principais tabelas
alter table if exists public.categories
  add column if not exists ceremony_year int not null default extract(year from now())::int;

alter table if exists public.nominees
  add column if not exists ceremony_year int not null default extract(year from now())::int;

alter table if exists public.bets
  add column if not exists ceremony_year int not null default extract(year from now())::int;

-- Índices para filtrar por edição rapidamente
create index if not exists categories_ceremony_year_idx on public.categories (ceremony_year);
create index if not exists nominees_ceremony_year_idx on public.nominees (ceremony_year);
create index if not exists bets_ceremony_year_idx on public.bets (ceremony_year);

-- Opcional: garantir unicidade por nome/ano
-- create unique index if not exists categories_name_year_uidx
--   on public.categories (lower(name), ceremony_year);

-- Observação: execute essa migração no Supabase antes de rodar novas importações
