-- Destructive reset script for a clean FX Dashboard Supabase schema.
-- Run manually in the Supabase SQL editor after exporting/backing up data.

drop table if exists public.project_post_attachments cascade;
drop table if exists public.project_posts cascade;
drop table if exists public.project_segments cascade;
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.clients cascade;
drop table if exists public.contacts cascade;
drop table if exists public.websites cascade;
drop table if exists public.app_metrics cascade;

create table public.app_metrics (
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

create index app_metrics_app_captured_at_idx
  on public.app_metrics (app, captured_at desc);

alter table public.app_metrics enable row level security;

create policy "Authenticated users can read app metrics"
  on public.app_metrics
  for select
  to authenticated
  using (true);

-- Insert from ftrader/fsystem with the Supabase service role key server-side.
-- The service role bypasses RLS; never expose it in frontend code.
