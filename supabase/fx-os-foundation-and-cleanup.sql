-- Fx OS foundation + legacy cleanup.
-- Run from Supabase SQL editor or migration tooling after confirming a backup.
-- This migration keeps the shared Focus sources of truth:
-- life_schedule_blocks, trading_accounts, trading_trades, trading_payouts,
-- trading_prop_firm_plans and trading_states as a temporary mobile legacy bridge.

create extension if not exists pgcrypto;

create table if not exists public.fx_workspaces (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'paused' check (status in ('active', 'paused', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fx_workspaces_one_active_per_user
  on public.fx_workspaces(user_id)
  where status = 'active';

create table if not exists public.fx_workspace_tasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.fx_workspaces(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'active', 'later', 'upcoming', 'completed')),
  position bigint not null default 0,
  deadline date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fx_workspace_tasks_workspace_position_idx
  on public.fx_workspace_tasks(user_id, workspace_id, position);

create table if not exists public.fx_workspace_task_logs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null references public.fx_workspace_tasks(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists fx_workspace_task_logs_task_created_idx
  on public.fx_workspace_task_logs(user_id, task_id, created_at desc);

create table if not exists public.fx_projects (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'backlog' check (status in ('active', 'paused', 'backlog', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fx_projects_one_active_per_user
  on public.fx_projects(user_id)
  where status = 'active';

create table if not exists public.fx_project_items (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null references public.fx_projects(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'active', 'later', 'upcoming', 'completed')),
  position bigint not null default 0,
  deadline date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fx_project_items_project_position_idx
  on public.fx_project_items(user_id, project_id, position);

create table if not exists public.fx_project_item_logs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.fx_project_items(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists fx_project_item_logs_item_created_idx
  on public.fx_project_item_logs(user_id, item_id, created_at desc);

create table if not exists public.fx_private_items (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  area text not null default 'documents' check (area in ('documents', 'finance', 'travel', 'vault')),
  category text not null default 'todo' check (category in ('todo', 'buy', 'watch', 'read', 'journal')),
  title text not null,
  content text not null default '',
  deadline date,
  completed boolean not null default false,
  position bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fx_private_items
  add column if not exists deadline date;

create index if not exists fx_private_items_area_position_idx
  on public.fx_private_items(user_id, area, category, deadline, position, created_at);

create table if not exists public.fx_journal_entries (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fx_journal_entries_user_date_idx
  on public.fx_journal_entries(user_id, entry_date desc, created_at desc);

create or replace function public.fx_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fx_workspaces_updated_at on public.fx_workspaces;
create trigger fx_workspaces_updated_at before update on public.fx_workspaces
for each row execute function public.fx_set_updated_at();

drop trigger if exists fx_workspace_tasks_updated_at on public.fx_workspace_tasks;
create trigger fx_workspace_tasks_updated_at before update on public.fx_workspace_tasks
for each row execute function public.fx_set_updated_at();

drop trigger if exists fx_projects_updated_at on public.fx_projects;
create trigger fx_projects_updated_at before update on public.fx_projects
for each row execute function public.fx_set_updated_at();

drop trigger if exists fx_project_items_updated_at on public.fx_project_items;
create trigger fx_project_items_updated_at before update on public.fx_project_items
for each row execute function public.fx_set_updated_at();

drop trigger if exists fx_private_items_updated_at on public.fx_private_items;
create trigger fx_private_items_updated_at before update on public.fx_private_items
for each row execute function public.fx_set_updated_at();

drop trigger if exists fx_journal_entries_updated_at on public.fx_journal_entries;
create trigger fx_journal_entries_updated_at before update on public.fx_journal_entries
for each row execute function public.fx_set_updated_at();

alter table public.fx_workspaces enable row level security;
alter table public.fx_workspace_tasks enable row level security;
alter table public.fx_workspace_task_logs enable row level security;
alter table public.fx_projects enable row level security;
alter table public.fx_project_items enable row level security;
alter table public.fx_project_item_logs enable row level security;
alter table public.fx_private_items enable row level security;
alter table public.fx_journal_entries enable row level security;

drop policy if exists "Users manage fx_workspaces" on public.fx_workspaces;
create policy "Users manage fx_workspaces" on public.fx_workspaces
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_workspace_tasks" on public.fx_workspace_tasks;
create policy "Users manage fx_workspace_tasks" on public.fx_workspace_tasks
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_workspace_task_logs" on public.fx_workspace_task_logs;
create policy "Users manage fx_workspace_task_logs" on public.fx_workspace_task_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_projects" on public.fx_projects;
create policy "Users manage fx_projects" on public.fx_projects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_project_items" on public.fx_project_items;
create policy "Users manage fx_project_items" on public.fx_project_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_project_item_logs" on public.fx_project_item_logs;
create policy "Users manage fx_project_item_logs" on public.fx_project_item_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_private_items" on public.fx_private_items;
create policy "Users manage fx_private_items" on public.fx_private_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage fx_journal_entries" on public.fx_journal_entries;
create policy "Users manage fx_journal_entries" on public.fx_journal_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Destructive legacy cleanup: old dashboard stats, Chrome-extension/screen-time
-- metrics, green/red journal stats, quests, lists and playbooks.
-- Keep trading_* and life_schedule_blocks because Focus Planning/Trading use them.
-- Keep fpair_health_days because Health Connect mobile sync and Self Care history use it.

drop view if exists public.trading_user_stats cascade;

drop table if exists public.fpair_screen_time_daily cascade;
drop table if exists public.app_metrics cascade;

drop table if exists public.dashboard_playbook_items cascade;
drop table if exists public.dashboard_playbook_chapters cascade;
drop table if exists public.dashboard_playbook_modules cascade;
drop table if exists public.dashboard_playbook_courses cascade;

drop table if exists public.dashboard_journal_activities cascade;
drop table if exists public.dashboard_journal_tasks cascade;
drop table if exists public.dashboard_journal_entries cascade;
drop table if exists public.dashboard_settings cascade;

drop table if exists public.fpair_quest_results cascade;
drop table if exists public.fpair_quests cascade;
drop table if exists public.fpair_list_items cascade;
drop table if exists public.life_system_health_days cascade;

delete from storage.objects where bucket_id = 'playbook-media';
delete from storage.buckets where id = 'playbook-media';
