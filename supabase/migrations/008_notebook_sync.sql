-- Full notebook cards synced from the learner app (localStorage → server) for admin visibility.
create table if not exists public.notebook_sync (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_entry_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_entry_id)
);

create index if not exists notebook_sync_user_updated_idx
  on public.notebook_sync (user_id, updated_at desc);

alter table public.notebook_sync enable row level security;

create policy "Users manage own notebook_sync"
  on public.notebook_sync for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all notebook_sync"
  on public.notebook_sync for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
