-- supabase/migrations/2025-01-16_nominees_meta.sql

alter table public.nominees
add column if not exists meta jsonb not null default '{}'::jsonb;

-- opcional: índice parcial por categoria
create index if not exists nominees_category_idx on public.nominees (category_id);