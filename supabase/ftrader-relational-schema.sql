-- FTrader relational schema.
-- Run this in the Supabase SQL Editor after ftrader-auth-state.sql.

create table if not exists public.trading_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  birthday text not null default '',
  height_cm integer,
  weight_kg numeric,
  gender text not null default 'X',
  green_count integer not null default 0,
  red_count integer not null default 0,
  level_score numeric not null default 0,
  level integer not null default 1,
  next_level_score numeric not null default 0,
  level_progress integer not null default 0,
  active_accounts integer not null default 0,
  sleep_green_hours numeric not null default 6,
  screen_time_red_minutes integer not null default 60,
  run_green_km numeric not null default 5,
  calories_green_kcal numeric not null default 1000,
  updated_at timestamptz not null default now()
);

alter table public.trading_profiles
  add column if not exists height_cm integer;

alter table public.trading_profiles
  add column if not exists weight_kg numeric;

alter table public.trading_profiles
  add column if not exists green_count integer not null default 0;

alter table public.trading_profiles
  add column if not exists red_count integer not null default 0;

alter table public.trading_profiles
  add column if not exists level_score numeric not null default 0;

alter table public.trading_profiles
  add column if not exists level integer not null default 1;

alter table public.trading_profiles
  add column if not exists next_level_score numeric not null default 0;

alter table public.trading_profiles
  add column if not exists level_progress integer not null default 0;

alter table public.trading_profiles
  add column if not exists active_accounts integer not null default 0;

alter table public.trading_profiles
  add column if not exists sleep_green_hours numeric not null default 6;

alter table public.trading_profiles
  add column if not exists screen_time_red_minutes integer not null default 60;

alter table public.trading_profiles
  add column if not exists run_green_km numeric not null default 5;

alter table public.trading_profiles
  add column if not exists calories_green_kcal numeric not null default 1000;

create table if not exists public.trading_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  android_enabled boolean not null default false,
  in_app_enabled boolean not null default true,
  candle_times jsonb not null default '[]'::jsonb,
  scheduled_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_rules (
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null,
  rule_text text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, position)
);

create table if not exists public.trading_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  prop_firm text not null,
  plan_id text not null,
  price_usd numeric not null default 0,
  size_usd numeric not null default 0,
  account_type text not null,
  status text not null,
  bought_at date,
  activations integer not null default 0,
  activation_fees_usd numeric not null default 0,
  blown_eval_count integer not null default 0,
  blown_funded_count integer not null default 0,
  last_activation_at timestamptz,
  last_reset_at timestamptz,
  resets integer not null default 0,
  reset_costs_usd numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.trading_trades (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  account_id text not null,
  started_at timestamptz not null,
  closed_at timestamptz,
  symbol text not null,
  direction text,
  contracts numeric,
  timeframe text,
  rr numeric,
  risk_amount numeric,
  pnl numeric not null default 0,
  status text not null,
  duration_seconds integer,
  notes text,
  checklist jsonb,
  setup jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.trading_account_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  account_id text not null,
  type text not null,
  title text not null,
  description text not null,
  occurred_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.trading_feed_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  type text not null,
  title text not null,
  description text not null,
  occurred_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.trading_payouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  account_id text,
  amount_usd numeric not null default 0,
  received_at date not null,
  source text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.trading_prop_firm_plans (
  id text primary key,
  prop_firm text not null,
  name text not null,
  plan_type text not null,
  account_size_usd numeric not null,
  price_usd numeric not null,
  profit_target_usd numeric,
  daily_loss_limit_usd numeric not null default 0,
  trailing_drawdown_usd numeric not null default 0,
  consistency_rule text not null,
  funded_rules text not null,
  max_contracts text not null,
  max_payout_usd numeric not null default 0,
  rules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.fpair_quests (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  domain text not null default 'system',
  category text not null default 'discipline',
  title text not null,
  cadence text not null default 'daily',
  condition text not null default 'to_do',
  target numeric,
  units text not null default '',
  points integer not null default 1,
  active boolean not null default true,
  due_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.fpair_quest_results (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  quest_id text not null,
  status text not null default 'open',
  value numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date, quest_id),
  foreign key (user_id, quest_id)
    references public.fpair_quests(user_id, id)
    on delete cascade
);

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

create table if not exists public.fpair_list_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  list_type text not null,
  title text not null,
  detail text not null default '',
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.fpair_list_items
  add column if not exists created_at timestamptz not null default now();

alter table public.fpair_quests
  drop constraint if exists fpair_quests_domain_check;

alter table public.fpair_quests
  add constraint fpair_quests_domain_check
  check (domain in ('trader', 'system', 'journal'));

alter table public.fpair_quests
  drop constraint if exists fpair_quests_cadence_check;

alter table public.fpair_quests
  add constraint fpair_quests_cadence_check
  check (cadence in ('daily', 'weekly', 'monthly', 'one_off'));

alter table public.fpair_quests
  drop constraint if exists fpair_quests_condition_check;

alter table public.fpair_quests
  add constraint fpair_quests_condition_check
  check (condition in ('reach_target', 'stay_under', 'to_do', 'to_not_do'));

alter table public.fpair_quest_results
  drop constraint if exists fpair_quest_results_status_check;

alter table public.fpair_quest_results
  add constraint fpair_quest_results_status_check
  check (status in ('open', 'completed', 'failed'));

create index if not exists fpair_quest_results_user_date_idx
  on public.fpair_quest_results(user_id, entry_date desc);

create or replace view public.trading_user_stats
with (security_invoker = true)
as
select
  t.user_id,
  count(*)::integer as total_trades,
  coalesce(sum(t.pnl), 0) as net_pnl,
  count(*) filter (where t.pnl > 0)::integer as winning_trades,
  count(*) filter (where t.pnl < 0)::integer as losing_trades,
  case when count(*) = 0 then 0 else round((count(*) filter (where t.pnl > 0))::numeric * 100 / count(*), 2) end as win_rate,
  coalesce(avg(t.pnl), 0) as avg_pnl,
  coalesce(max(t.pnl), 0) as best_trade,
  coalesce(min(t.pnl), 0) as worst_trade,
  count(distinct date_trunc('day', t.started_at))::integer as trading_days
from public.trading_trades t
group by t.user_id;

alter table public.trading_profiles enable row level security;
alter table public.trading_notification_settings enable row level security;
alter table public.trading_rules enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.trading_trades enable row level security;
alter table public.trading_account_events enable row level security;
alter table public.trading_feed_events enable row level security;
alter table public.trading_payouts enable row level security;
alter table public.trading_prop_firm_plans enable row level security;
alter table public.fpair_quests enable row level security;
alter table public.fpair_quest_results enable row level security;
alter table public.fpair_health_days enable row level security;
alter table public.fpair_list_items enable row level security;

drop policy if exists "Users manage their trading profile" on public.trading_profiles;
drop policy if exists "Users manage their notification settings" on public.trading_notification_settings;
drop policy if exists "Users manage their trading rules" on public.trading_rules;
drop policy if exists "Users manage their trading accounts" on public.trading_accounts;
drop policy if exists "Users manage their trades" on public.trading_trades;
drop policy if exists "Users manage their account events" on public.trading_account_events;
drop policy if exists "Users manage their feed events" on public.trading_feed_events;
drop policy if exists "Users manage their payouts" on public.trading_payouts;
drop policy if exists "Authenticated users can read prop firm plans" on public.trading_prop_firm_plans;
drop policy if exists "Authenticated users can sync prop firm plans" on public.trading_prop_firm_plans;
drop policy if exists "Authenticated users can update prop firm plans" on public.trading_prop_firm_plans;
drop policy if exists "Users manage their fpair quests" on public.fpair_quests;
drop policy if exists "Users manage their fpair quest results" on public.fpair_quest_results;
drop policy if exists "Users manage their fpair health days" on public.fpair_health_days;
drop policy if exists "Users manage their fpair list items" on public.fpair_list_items;

create policy "Users manage their trading profile" on public.trading_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their notification settings" on public.trading_notification_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their trading rules" on public.trading_rules
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their trading accounts" on public.trading_accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their trades" on public.trading_trades
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their account events" on public.trading_account_events
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their feed events" on public.trading_feed_events
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their payouts" on public.trading_payouts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Authenticated users can read prop firm plans" on public.trading_prop_firm_plans
  for select to authenticated
  using (true);

create policy "Authenticated users can sync prop firm plans" on public.trading_prop_firm_plans
  for insert to authenticated
  with check (true);

create policy "Authenticated users can update prop firm plans" on public.trading_prop_firm_plans
  for update to authenticated
  using (true)
  with check (true);

create policy "Users manage their fpair quests" on public.fpair_quests
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their fpair quest results" on public.fpair_quest_results
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their fpair health days" on public.fpair_health_days
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their fpair list items" on public.fpair_list_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
