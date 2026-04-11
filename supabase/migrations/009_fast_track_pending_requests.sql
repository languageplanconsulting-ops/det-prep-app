-- Pending Duolingo Fast Track access requests (student submits email → admin verifies → grant + password)
create table public.fast_track_pending_requests (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  full_name text,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  processed_at timestamptz,
  processed_by uuid references public.profiles (id),
  grant_expires_at timestamptz,
  access_password text,
  constraint fast_track_pending_email_lower check (email = lower(trim(email)))
);

create unique index fast_track_pending_one_open_per_email
  on public.fast_track_pending_requests (email)
  where status = 'pending';

create index idx_fast_track_pending_status_submitted
  on public.fast_track_pending_requests (status, submitted_at desc);

comment on table public.fast_track_pending_requests is
  'Fast Track VIP requests from landing; admin approves and 6-month access runs from submitted_at.';

alter table public.fast_track_pending_requests enable row level security;

-- No public policies — service role + admin APIs only (same pattern as sensitive grant tables)
