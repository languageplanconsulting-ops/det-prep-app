-- USERS & SUBSCRIPTIONS
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'admin')),
  tier text default 'free' check (tier in ('free', 'basic', 'premium', 'vip')),
  tier_expires_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  vip_granted_by_course boolean default false,
  ai_credits_used integer default 0,
  ai_credits_reset_at timestamptz default now(),
  lifetime_ai_used boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- STUDY TIME TRACKING
create table public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_type text not null,
  skill text not null check (skill in ('literacy','comprehension','conversation','production','mock_test')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  completed boolean default false,
  score integer,
  difficulty text check (difficulty in ('easy','medium','hard')),
  set_id text,
  created_at timestamptz default now()
);

-- MONTHLY CONTENT ACCESS TRACKING
create table public.monthly_access (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  skill text not null,
  sets_accessed text[] default '{}',
  month_year text not null,
  created_at timestamptz default now(),
  unique(user_id, skill, month_year)
);

-- AI USAGE TRACKING
create table public.ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  exercise_type text not null,
  month_year text not null,
  count integer default 0,
  created_at timestamptz default now(),
  unique(user_id, month_year)
);

-- NOTEBOOK
create table public.notebook_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  type text check (type in ('vocabulary','grammar','production')),
  content text not null,
  source_exercise_type text,
  source_skill text,
  score_at_save integer,
  created_at timestamptz default now()
);

-- MOCK TEST RESULTS
create table public.mock_test_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  overall_score integer,
  literacy_score integer,
  comprehension_score integer,
  conversation_score integer,
  production_score integer,
  duration_seconds integer,
  adaptive_log jsonb,
  ai_feedback jsonb,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.monthly_access enable row level security;
alter table public.ai_usage enable row level security;
alter table public.notebook_entries enable row level security;
alter table public.mock_test_results enable row level security;

-- RLS Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Users manage own study sessions" on public.study_sessions for all using (auth.uid() = user_id);
create policy "Users manage own monthly access" on public.monthly_access for all using (auth.uid() = user_id);
create policy "Users manage own ai usage" on public.ai_usage for all using (auth.uid() = user_id);
create policy "Users manage own notebook" on public.notebook_entries for all using (auth.uid() = user_id);
create policy "Users manage own mock tests" on public.mock_test_results for all using (auth.uid() = user_id);
