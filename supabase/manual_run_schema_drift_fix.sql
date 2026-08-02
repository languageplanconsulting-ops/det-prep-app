-- ============================================================================
-- Schema-drift fix — deploy the migrations the live DB is missing.
-- Paste into the Supabase SQL editor and run. Safe to re-run (fully idempotent,
-- purely additive: no DROP, no TRUNCATE, no DELETE, no column type changes).
--
-- Found 2026-07-28 by scripts/audit-schema-drift.mjs, which compares every
-- static .select() in src/ against the live schema. Each block below is code
-- that already ships in production but queries something the database does not
-- have — so the query 400s and the calling code silently gets null.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. migration 022 — bug_reports  ***HIGHEST IMPACT: user-facing***
--
-- The floating "💬 รายงานปัญหา" button appears on every page. Because these
-- tables do not exist, submitBugReport() (src/lib/bug-reports.ts) fails its
-- insert and the API returns 400 "Could not save your report. Please try
-- again." — every customer bug report has been lost. /admin/bug-reports is
-- empty for the same reason.
-- ---------------------------------------------------------------------------

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles(id) on delete set null,
  reporter_email text not null,
  reporter_line text not null,
  reporter_name text null,
  page_url text null,
  subject text not null,
  details text not null,
  status text not null default 'open' check (status in ('open', 'investigating', 'fixed', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_replied_at timestamptz null,
  last_admin_reply text null,
  fixed_at timestamptz null,
  fixed_by uuid null references public.profiles(id) on delete set null
);

create index if not exists bug_reports_status_created_idx
  on public.bug_reports(status, created_at desc);

create index if not exists bug_reports_reporter_email_idx
  on public.bug_reports(reporter_email);

create table if not exists public.bug_report_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.bug_reports(id) on delete cascade,
  sender_role text not null check (sender_role in ('reporter', 'admin')),
  sender_email text null,
  body text not null,
  status_after text null check (status_after in ('open', 'investigating', 'fixed', 'closed')),
  admin_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists bug_report_messages_report_idx
  on public.bug_report_messages(report_id, created_at asc);

-- Service-role writes only (the API uses the service-role client); RLS on with
-- no policies means anon/authenticated clients cannot read other people's reports.
alter table public.bug_reports enable row level security;
alter table public.bug_report_messages enable row level security;


-- ---------------------------------------------------------------------------
-- 2. migration 025 — profiles.ai_quota_mode / ai_monthly_limit_override
--    ***HIGHEST IMPACT: paying customers blocked***
--
-- getAiCreditStateForUser() and getVipWeeklyAiQuotaForUser()
-- (src/lib/addon-credits.ts) select these columns. The query errors, `profile`
-- comes back null, the tier resolves to "free", and every paid user gets
-- HTTP 402 on Instant Feedback for read_then_speak and summarize_conversation.
-- Also breaks the admin AI-credit toggle
-- (src/app/api/admin/subscriptions/[userId]/ai-credits/route.ts).
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists ai_quota_mode text not null default 'default';

alter table public.profiles
  add column if not exists ai_monthly_limit_override integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_ai_quota_mode_check') then
    alter table public.profiles
      add constraint profiles_ai_quota_mode_check
      check (ai_quota_mode in ('default', 'monthly_override'));
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_ai_monthly_limit_override_check') then
    alter table public.profiles
      add constraint profiles_ai_monthly_limit_override_check
      check (ai_monthly_limit_override is null or ai_monthly_limit_override >= 0);
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- 3. migration 018 — study_sessions.submission_payload / report_payload
--
-- Breaks: GET /api/writing-report/:attemptId (always 500 — cross-device
-- recovery of a saved writing report), plus the admin "study activity" and
-- per-user subscription views, which cannot load learner submissions.
-- ---------------------------------------------------------------------------

alter table public.study_sessions
  add column if not exists submission_payload jsonb,
  add column if not exists report_payload jsonb;

comment on column public.study_sessions.submission_payload is
  'Compact learner submission snapshot for admin review of a study session.';

comment on column public.study_sessions.report_payload is
  'Compact graded report snapshot for admin review of a study session.';


-- ---------------------------------------------------------------------------
-- 4. migration 026 — business_events
--
-- recordBusinessEvent() (src/lib/business-events.ts) has been a no-op, so the
-- funnel/conversion numbers on /admin/business have no source data.
-- ---------------------------------------------------------------------------

create table if not exists public.business_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (
    event_type in (
      'account_created',
      'plan_purchased',
      'plan_renewed',
      'plan_expired',
      'addon_purchased',
      'mock_started',
      'mock_completed',
      'ai_feedback_used',
      'first_practice',
      'checkout_started',
      'checkout_abandoned'
    )
  ),
  tier text null,
  amount_thb numeric null,
  metadata jsonb not null default '{}'::jsonb,
  session_id text null,
  source text null,
  created_at timestamptz not null default now()
);

create index if not exists business_events_user_created_idx
  on public.business_events(user_id, created_at desc);

create index if not exists business_events_type_created_idx
  on public.business_events(event_type, created_at desc);

alter table public.business_events enable row level security;


-- ============================================================================
-- Verify: all four should return 0 rows / no error.
-- ============================================================================
-- select count(*) from public.bug_reports;
-- select ai_quota_mode, ai_monthly_limit_override from public.profiles limit 1;
-- select submission_payload, report_payload from public.study_sessions limit 1;
-- select count(*) from public.business_events;
--
-- Then re-run:  node scripts/audit-schema-drift.mjs
-- ============================================================================
