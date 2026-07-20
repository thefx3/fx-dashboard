-- Restore the shared Health Connect daily table used by fpair_app and the web dashboard.
-- Safe to run multiple times; it preserves existing rows.

create table if not exists public.fpair_health_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  sleep_hours numeric,
  screen_time_hours numeric not null default 0,
  run_km numeric,
  calories numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.fpair_health_days enable row level security;

drop policy if exists "Users manage their fpair health days" on public.fpair_health_days;
create policy "Users manage their fpair health days" on public.fpair_health_days
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists fpair_health_days_user_date_idx
  on public.fpair_health_days(user_id, entry_date desc);
