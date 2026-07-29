-- Per-student lesson progress for the guided courses (see 038_courses.sql).
-- Nothing writes to this table yet — no student-facing course viewer exists —
-- but the admin course page's progress % reads from it, so the pipeline is
-- correct and ready the moment a student page starts recording watches.

create table if not exists public.course_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  watched_seconds integer not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists course_lesson_progress_lesson_idx
  on public.course_lesson_progress (lesson_id);

create index if not exists course_lesson_progress_user_idx
  on public.course_lesson_progress (user_id);

alter table public.course_lesson_progress enable row level security;

drop policy if exists "Students manage own progress" on public.course_lesson_progress;
create policy "Students manage own progress"
  on public.course_lesson_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Admins read all progress" on public.course_lesson_progress;
create policy "Admins read all progress"
  on public.course_lesson_progress for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
