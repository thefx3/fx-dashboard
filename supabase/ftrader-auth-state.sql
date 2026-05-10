-- FTrader Supabase state table.
-- Run this in the Supabase SQL Editor for the same project used by fx-dashboard.

create table if not exists public.trading_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trading_states
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.trading_states
  add column if not exists state jsonb not null default '{}'::jsonb;

alter table public.trading_states
  add column if not exists created_at timestamptz not null default now();

alter table public.trading_states
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists trading_states_user_id_key
  on public.trading_states (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trading_states_set_updated_at on public.trading_states;

create trigger trading_states_set_updated_at
before update on public.trading_states
for each row
execute function public.set_updated_at();

alter table public.trading_states enable row level security;

drop policy if exists "FTrader users can read their state" on public.trading_states;
drop policy if exists "FTrader users can insert their state" on public.trading_states;
drop policy if exists "FTrader users can update their state" on public.trading_states;
drop policy if exists "FTrader users can delete their state" on public.trading_states;

create policy "FTrader users can read their state"
  on public.trading_states
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "FTrader users can insert their state"
  on public.trading_states
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "FTrader users can update their state"
  on public.trading_states
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "FTrader users can delete their state"
  on public.trading_states
  for delete
  to authenticated
  using (auth.uid() = user_id);
