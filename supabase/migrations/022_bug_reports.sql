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

alter table public.bug_reports enable row level security;
alter table public.bug_report_messages enable row level security;
