-- Paste into the Supabase SQL editor to deploy behavioural tracking. Idempotent / safe to re-run.
-- Mirrors migration 027. The ingest API writes via the service-role key, so events flow only
-- after this table exists in the live DB.

-- Fine-grained behavioural tracking for NON-CONVERTED users (free tier + anonymous).
-- High-volume: page views, clicks, options chosen, key conversion-point events.
-- Distinct from `business_events` (coarse milestones, emails on every row) — this table
-- is append-only telemetry meant to be aggregated, never emailed.

create table if not exists public.user_activity_events (
  id uuid default gen_random_uuid() primary key,
  -- Signed-in learner (resolved server-side from the auth cookie, never trusted from client).
  -- Null for anonymous (logged-out) visitors.
  user_id uuid references public.profiles(id) on delete set null,
  -- Stable client-generated id so we can stitch an anonymous visitor's events into one journey
  -- even before they sign in.
  anon_id text,
  -- "session" = one browser tab-life / visit (resets on full reload).
  session_id text,
  -- Effective tier AT THE TIME of the event, as resolved on the server.
  -- We only persist 'free' / 'anonymous' here (paid users are filtered out at ingest).
  tier text,
  -- What happened: 'page_view' | 'click' | 'paywall_view' | 'upgrade_click' | custom names.
  event_name text not null,
  -- Page the event happened on (pathname only, no query string / PII).
  path text,
  -- For clicks: short human label of the target (button text, aria-label, or data-track value).
  target_label text,
  -- For clicks: a coarse CSS-ish selector / data-track key, for grouping.
  target_key text,
  -- Free-form structured context (e.g. { plan: 'premium', optionId: 'A', value: 590 }).
  metadata jsonb not null default '{}'::jsonb,
  referrer text,
  -- Coarse device class derived server-side from UA: 'mobile' | 'tablet' | 'desktop'.
  device text,
  created_at timestamptz not null default now()
);

alter table public.user_activity_events enable row level security;

-- Only admins can read. Inserts happen via the service-role key (ingest API), which bypasses RLS,
-- so there is intentionally NO insert policy for anon/authenticated roles.
drop policy if exists "Admins read user_activity_events" on public.user_activity_events;
create policy "Admins read user_activity_events"
  on public.user_activity_events
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create index if not exists idx_uae_created_desc
  on public.user_activity_events(created_at desc);

create index if not exists idx_uae_event_created
  on public.user_activity_events(event_name, created_at desc);

create index if not exists idx_uae_user_created
  on public.user_activity_events(user_id, created_at desc);

create index if not exists idx_uae_anon_created
  on public.user_activity_events(anon_id, created_at desc);

create index if not exists idx_uae_path_created
  on public.user_activity_events(path, created_at desc);
