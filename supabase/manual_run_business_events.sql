-- Deploy the business_events table (funnel/conversion tracking).
-- Paste this into the Supabase SQL editor. Safe to re-run (idempotent).
-- This is migration 026 made re-runnable: recordBusinessEvent() (src/lib/business-events.ts)
-- has been failing silently because this table was never created in the live DB.

create table if not exists public.business_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (
    event_type in (
      'account_created',
      'plan_purchased',
      'addon_purchased',
      'mini_diagnosis_started',
      'mock_test_started'
    )
  ),
  event_source text,
  event_label text,
  event_value integer,
  event_currency text default 'thb',
  email text,
  dedupe_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  email_notified_at timestamptz,
  email_notification_error text,
  created_at timestamptz not null default now()
);

alter table public.business_events enable row level security;

drop policy if exists "Admins manage business_events" on public.business_events;
create policy "Admins manage business_events"
  on public.business_events
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create index if not exists idx_business_events_created_desc
  on public.business_events(created_at desc);

create index if not exists idx_business_events_type_created_desc
  on public.business_events(event_type, created_at desc);

create index if not exists idx_business_events_user_created_desc
  on public.business_events(user_id, created_at desc);
