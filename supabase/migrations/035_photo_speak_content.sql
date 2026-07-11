-- Shared content bank for "Write about the Photo" / "Speak about the Photo" practice.
-- Replaces browser-localStorage-only content (ep-write-about-photo-rounds-v1) with a
-- real table so web + mobile read the same bank and progress is tracked server-side.
--
-- No task_type column on items: both practice modes already draw from one shared pool
-- today (PhotoAssessmentSession resolves items the same way regardless of mode), so this
-- doesn't introduce a distinction that doesn't exist yet. task_type only matters for
-- progress, since a write attempt and a speak attempt on the same photo are separate scores.

create table if not exists public.photo_speak_items (
  id text primary key,
  title_en text not null,
  title_th text not null default '',
  image_url text not null,
  prompt_en text not null,
  prompt_th text not null default '',
  keywords text[] not null default '{}',
  context_en text,
  -- CC-license attribution metadata (populated for Openverse-sourced imports; nullable for
  -- legacy/admin-pasted rows that predate this table, e.g. non-Openverse URLs).
  license text,
  license_version text,
  license_url text,
  creator text,
  attribution text,
  landing_url text,
  provider text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_photo_speak_items_active_sort
  on public.photo_speak_items (is_active, sort_order);

create table if not exists public.photo_speak_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null references public.photo_speak_items(id) on delete cascade,
  task_type text not null check (task_type in ('write_about_photo', 'speak_about_photo')),
  latest_score160 numeric not null,
  best_score160 numeric not null,
  latest_attempt_id text not null,
  attempt_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id, task_type)
);

create index if not exists idx_photo_speak_progress_user
  on public.photo_speak_progress (user_id, task_type, updated_at desc);

alter table public.photo_speak_items enable row level security;
alter table public.photo_speak_progress enable row level security;

-- Any authenticated user (web cookie session or mobile bearer JWT — both resolve to the
-- same auth.uid()) can read active items.
drop policy if exists "Signed users read active photo speak items" on public.photo_speak_items;
create policy "Signed users read active photo speak items"
  on public.photo_speak_items for select
  using (auth.uid() is not null and is_active = true);

-- Only admins can write; the bulk-import script and admin API route use the service-role
-- key, which bypasses RLS entirely, same as mock_fixed_set_items.
drop policy if exists "Admins manage photo speak items" on public.photo_speak_items;
create policy "Admins manage photo speak items"
  on public.photo_speak_items for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Users read/write only their own progress rows (the report route upserts via service-role,
-- so this policy mainly governs any direct client-side reads of the enriched items list).
drop policy if exists "Users manage own photo speak progress" on public.photo_speak_progress;
create policy "Users manage own photo speak progress"
  on public.photo_speak_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins read photo speak progress" on public.photo_speak_progress;
create policy "Admins read photo speak progress"
  on public.photo_speak_progress for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
