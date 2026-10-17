-- A learner must never lose an answer they already wrote or recorded.
--
-- Until now, grading happened entirely inside the POST request: if every model
-- failed, the learner got an error and their work existed only in the browser.
-- Close the tab and it was gone.
--
-- Now every submission is written here BEFORE grading starts. If grading can't
-- finish inside the request, the learner sees "กำลังตรวจอยู่ โปรดรอสักครู่"
-- instead of an error, and the job is re-graded (by their own polling, and by
-- the cron sweep if they leave) until a REAL AI report exists. We never fall
-- back to a heuristic score — a wrong score is worse for a learner than a slow
-- one — so a job stays pending until real grading succeeds.
create table if not exists public.grading_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  -- 'read_then_write' | 'read_then_speak' | 'write_about_photo' | 'speak_about_photo'
  surface text not null,
  -- Client-generated attempt id; also the idempotency key (see unique index).
  attempt_id text not null,
  -- Everything needed to re-grade without the client: prompt, answer, options.
  payload jsonb not null,
  -- 'pending' (keep trying) | 'done' (report is real and final) | 'abandoned'
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  report jsonb,
  -- Credits are charged once, only when a real report lands.
  credit_charged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Idempotency: re-submitting the same attempt returns the existing job rather
-- than grading (and charging) twice. Also how the status endpoint looks a job up.
create unique index if not exists grading_jobs_attempt_id_key
  on public.grading_jobs(attempt_id);

-- The cron sweep's working set: oldest unfinished jobs first.
create index if not exists grading_jobs_pending_idx
  on public.grading_jobs(created_at)
  where status = 'pending';

create index if not exists grading_jobs_user_id_idx on public.grading_jobs(user_id);

alter table public.grading_jobs enable row level security;

-- Written only by the server (service role, via API routes). Learners reach
-- their own job through the status route, which authenticates them there, so
-- no end-user policy is granted here.
