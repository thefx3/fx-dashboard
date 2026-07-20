alter table public.fx_private_items
  add column if not exists deadline date;

create index if not exists fx_private_items_area_position_idx
  on public.fx_private_items(user_id, area, category, deadline, position, created_at);
