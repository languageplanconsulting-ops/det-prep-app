-- Server-side API cost / usage estimates for admin reporting (THB totals).
create table if not exists public.api_usage_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null,
  operation text not null,
  provider text not null,
  model text,
  input_tokens integer,
  output_tokens integer,
  chars_in integer,
  cost_usd numeric(16, 8) not null default 0,
  cost_thb numeric(16, 4) not null default 0,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists api_usage_logs_created_at_idx
  on public.api_usage_logs (created_at desc);

create index if not exists api_usage_logs_user_created_idx
  on public.api_usage_logs (user_id, created_at desc);

alter table public.api_usage_logs enable row level security;

create policy "Admins read all api_usage_logs"
  on public.api_usage_logs for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
