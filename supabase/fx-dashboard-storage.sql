-- FX Dashboard Supabase storage.
-- Run this in the same Supabase project as the existing ftrader tables.

create table if not exists public.app_metrics (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('ftrader', 'fsystem', 'fx_dashboard')),
  metric_key text not null,
  metric_label text not null,
  metric_value text not null,
  unit text,
  trend text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.app_metrics
drop constraint if exists app_metrics_app_check;

alter table public.app_metrics
add constraint app_metrics_app_check
check (app in ('ftrader', 'fsystem', 'fx_dashboard'));

create index if not exists app_metrics_app_captured_at_idx
  on public.app_metrics (app, captured_at desc);

alter table public.app_metrics enable row level security;

drop policy if exists "Authenticated users can read app metrics"
  on public.app_metrics;

create policy "Authenticated users can read app metrics"
  on public.app_metrics
  for select
  to authenticated
  using (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dashboard_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  start_date date,
  start_date_changed_at date,
  last_delete_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_settings
  add column if not exists start_date_changed_at date;

update public.dashboard_settings
set start_date_changed_at = coalesce(start_date_changed_at, created_at::date, current_date)
where start_date is not null
  and start_date_changed_at is null;

create table if not exists public.dashboard_journal_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  morning_feeling text not null default '',
  morning_mood text check (morning_mood in ('negative', 'neutral', 'positive')),
  evening_feeling text not null default '',
  evening_mood text check (evening_mood in ('negative', 'neutral', 'positive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.dashboard_journal_entries
  add column if not exists morning_mood text;

alter table public.dashboard_journal_entries
  add column if not exists evening_mood text;

alter table public.dashboard_journal_entries
  add column if not exists diary_text text not null default '';

alter table public.dashboard_journal_entries
  drop constraint if exists dashboard_journal_entries_morning_mood_check;

alter table public.dashboard_journal_entries
  add constraint dashboard_journal_entries_morning_mood_check
  check (morning_mood is null or morning_mood in ('negative', 'neutral', 'positive'));

alter table public.dashboard_journal_entries
  drop constraint if exists dashboard_journal_entries_evening_mood_check;

alter table public.dashboard_journal_entries
  add constraint dashboard_journal_entries_evening_mood_check
  check (evening_mood is null or evening_mood in ('negative', 'neutral', 'positive'));

create table if not exists public.dashboard_journal_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  id uuid not null default gen_random_uuid(),
  position integer not null default 0,
  text text not null,
  completed boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, entry_date)
    references public.dashboard_journal_entries(user_id, entry_date)
    on delete cascade
);

alter table public.dashboard_journal_tasks
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.dashboard_journal_activities (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  id uuid not null default gen_random_uuid(),
  position integer not null default 0,
  text text not null,
  status text not null check (status in ('positive', 'negative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, entry_date)
    references public.dashboard_journal_entries(user_id, entry_date)
    on delete cascade
);

update public.dashboard_journal_activities
set status = 'negative'
where status = 'neutral';

do $$
declare
  status_constraint_name text;
begin
  select c.conname
  into status_constraint_name
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'dashboard_journal_activities'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%status%';

  if status_constraint_name is not null then
    execute format(
      'alter table public.dashboard_journal_activities drop constraint %I',
      status_constraint_name
    );
  end if;

  alter table public.dashboard_journal_activities
    add constraint dashboard_journal_activities_status_check
    check (status in ('positive', 'negative'));
end $$;

create index if not exists dashboard_journal_entries_user_date_idx
  on public.dashboard_journal_entries(user_id, entry_date desc);

create index if not exists dashboard_journal_tasks_user_date_idx
  on public.dashboard_journal_tasks(user_id, entry_date, position);

create index if not exists dashboard_journal_activities_user_date_idx
  on public.dashboard_journal_activities(user_id, entry_date, position);

drop trigger if exists dashboard_settings_set_updated_at
  on public.dashboard_settings;

create trigger dashboard_settings_set_updated_at
before update on public.dashboard_settings
for each row execute function public.set_updated_at();

drop trigger if exists dashboard_journal_entries_set_updated_at
  on public.dashboard_journal_entries;

create trigger dashboard_journal_entries_set_updated_at
before update on public.dashboard_journal_entries
for each row execute function public.set_updated_at();

drop trigger if exists dashboard_journal_tasks_set_updated_at
  on public.dashboard_journal_tasks;

create trigger dashboard_journal_tasks_set_updated_at
before update on public.dashboard_journal_tasks
for each row execute function public.set_updated_at();

drop trigger if exists dashboard_journal_activities_set_updated_at
  on public.dashboard_journal_activities;

create trigger dashboard_journal_activities_set_updated_at
before update on public.dashboard_journal_activities
for each row execute function public.set_updated_at();

alter table public.dashboard_settings enable row level security;
alter table public.dashboard_journal_entries enable row level security;
alter table public.dashboard_journal_tasks enable row level security;
alter table public.dashboard_journal_activities enable row level security;

drop policy if exists "Users manage their dashboard settings"
  on public.dashboard_settings;

drop policy if exists "Users manage their journal entries"
  on public.dashboard_journal_entries;

drop policy if exists "Users manage their journal tasks"
  on public.dashboard_journal_tasks;

drop policy if exists "Users manage their journal activities"
  on public.dashboard_journal_activities;

create policy "Users manage their dashboard settings"
on public.dashboard_settings
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their journal entries"
on public.dashboard_journal_entries
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their journal tasks"
on public.dashboard_journal_tasks
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage their journal activities"
on public.dashboard_journal_activities
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'dashboard_settings',
    'dashboard_journal_entries',
    'dashboard_journal_tasks',
    'dashboard_journal_activities'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end $$;
