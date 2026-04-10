-- Shared browser-bank snapshot so uploaded practice content appears for all signed-in users.
-- Stores localStorage-backed banks (conversation/fitb/reading/vocab/dictation/etc.) in one row.

create table if not exists public.content_bank_snapshots (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.content_bank_snapshots enable row level security;

drop policy if exists "Authenticated users can read content bank snapshots" on public.content_bank_snapshots;
drop policy if exists "Admins can upsert content bank snapshots" on public.content_bank_snapshots;
drop policy if exists "Admins can delete content bank snapshots" on public.content_bank_snapshots;

create policy "Authenticated users can read content bank snapshots"
  on public.content_bank_snapshots
  for select
  using (auth.uid() is not null);

create policy "Admins can upsert content bank snapshots"
  on public.content_bank_snapshots
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
