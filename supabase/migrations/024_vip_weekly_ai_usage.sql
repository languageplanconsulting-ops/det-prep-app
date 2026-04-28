create table if not exists public.vip_weekly_ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  uses integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index if not exists vip_weekly_ai_usage_week_idx
  on public.vip_weekly_ai_usage (week_start desc);
