-- Device push tokens (Expo push service) for study-plan reminder notifications.
-- One row per device — a user can have several (phone + tablet, reinstalls, etc).

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now()
);

create unique index if not exists push_tokens_token_unique on public.push_tokens (expo_push_token);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
