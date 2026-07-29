-- Guided video courses migrated off Thinkific.
-- Video bytes live in Bunny Stream (library 715227); this schema holds only the
-- structure (course -> chapter -> lesson) plus the Bunny video GUID per lesson.
-- Admin-only for now: no student-facing route reads these tables yet.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  -- Where this came from, so a re-import can reconcile instead of duplicating.
  source text not null default 'thinkific' check (source in ('thinkific', 'manual')),
  source_course_id text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists courses_source_idx
  on public.courses (source, source_course_id)
  where source_course_id is not null;

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  source_chapter_id text,
  created_at timestamptz not null default now()
);

create index if not exists course_chapters_course_idx
  on public.course_chapters (course_id, position);

-- Lets the importer upsert instead of duplicating on a re-run.
-- NOT partial: ON CONFLICT cannot match a partial index unless the predicate is
-- restated, and NULLs are already distinct in a unique index anyway.
create unique index if not exists course_chapters_source_idx
  on public.course_chapters (course_id, source_chapter_id);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  source_lesson_id text,

  -- Thinkific lesson kinds we care about. Anything non-video still gets a row so
  -- the chapter ordering survives the migration.
  kind text not null default 'video' check (kind in ('video', 'text', 'quiz', 'download', 'other')),
  body text,

  -- Bunny Stream. video_guid is null until the upload for this lesson succeeds,
  -- which is what makes the migration script safely resumable.
  bunny_video_guid text,
  duration_seconds integer,
  free_preview boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),

  -- Migration bookkeeping: lets the script skip finished work and surface failures.
  migration_status text not null default 'pending'
    check (migration_status in ('pending', 'uploading', 'done', 'failed', 'skipped')),
  migration_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists course_lessons_chapter_idx
  on public.course_lessons (chapter_id, position);

create index if not exists course_lessons_migration_idx
  on public.course_lessons (migration_status);

create unique index if not exists course_lessons_source_idx
  on public.course_lessons (chapter_id, source_lesson_id);

-- Admin-only across the board. Students get their own policies when the
-- student-facing route is built; until then nothing but role='admin' can read.
alter table public.courses enable row level security;
alter table public.course_chapters enable row level security;
alter table public.course_lessons enable row level security;

drop policy if exists "Admins manage courses" on public.courses;
create policy "Admins manage courses"
  on public.courses for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins manage course chapters" on public.course_chapters;
create policy "Admins manage course chapters"
  on public.course_chapters for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins manage course lessons" on public.course_lessons;
create policy "Admins manage course lessons"
  on public.course_lessons for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
