-- Video production board for the course (admin only).
--
-- The plan itself lives in code (src/lib/course-production.ts) so the board
-- renders before this migration is deployed. This table stores only what the
-- admin CHANGES: the edited script body and the pipeline status.
--
-- Join key is `video_key`, matching CourseVideoPlan.key. Keys are stable and
-- must never be renumbered.

create table if not exists public.course_video_scripts (
  video_key      text primary key,
  -- Edited script body (markdown). Null = still using the generated outline.
  script_md      text,
  -- Overrides CourseVideoPlan.status when present.
  status         text check (
                   status in ('missing','scripted','recorded','uploaded','live','draft','dead')
                 ),
  -- Free-text working notes for the recording session.
  notes          text,
  -- Set once the recorded file lands on Bunny.
  bunny_video_guid text,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null
);

comment on table public.course_video_scripts is
  'Admin-edited scripts + pipeline status for planned course videos. Plan itself is in src/lib/course-production.ts.';

create index if not exists course_video_scripts_status_idx
  on public.course_video_scripts (status);

-- Admin-only: no client ever reads or writes this directly. All access goes
-- through the service-role key in src/lib/admin-course-production-data.ts.
alter table public.course_video_scripts enable row level security;

drop policy if exists "course_video_scripts service role only" on public.course_video_scripts;
create policy "course_video_scripts service role only"
  on public.course_video_scripts
  for all
  using (false)
  with check (false);
