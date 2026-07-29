-- Lesson handouts (PDFs) migrated off Thinkific.
-- A single PDF is often shared by several lessons, so files live in their own
-- table and are attached many-to-many rather than duplicated per lesson.

create table if not exists public.course_downloads (
  id uuid primary key default gen_random_uuid(),
  -- Object path inside the course-downloads storage bucket.
  storage_path text not null unique,
  file_name text not null,
  mime text not null default 'application/pdf',
  file_size integer,
  -- Original Thinkific CDN URL, kept so a re-import can reconcile.
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_lesson_downloads (
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  download_id uuid not null references public.course_downloads(id) on delete cascade,
  -- Thinkific's per-lesson display label; differs from the file name and can
  -- differ between two lessons sharing the same file.
  label text,
  position integer not null default 0,
  primary key (lesson_id, download_id)
);

create index if not exists course_lesson_downloads_lesson_idx
  on public.course_lesson_downloads (lesson_id, position);

alter table public.course_downloads enable row level security;
alter table public.course_lesson_downloads enable row level security;

drop policy if exists "Admins manage course downloads" on public.course_downloads;
create policy "Admins manage course downloads"
  on public.course_downloads for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins manage lesson downloads" on public.course_lesson_downloads;
create policy "Admins manage lesson downloads"
  on public.course_lesson_downloads for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Private bucket; the app serves these through short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('course-downloads', 'course-downloads', false)
on conflict (id) do nothing;

drop policy if exists "Admins write course download objects" on storage.objects;
create policy "Admins write course download objects"
  on storage.objects for all
  using (
    bucket_id = 'course-downloads'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    bucket_id = 'course-downloads'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
