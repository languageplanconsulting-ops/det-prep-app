-- Pending migrations not yet applied to the live DB (checked 2026-08-05).
-- 041, 042, 043, 044, 046, 047 — all additive: create table if not exists,
-- add column if not exists, and UPDATEs that only fill the new columns where NULL.
-- Safe to re-run; wrapped in a transaction so it all lands or none of it does.

begin;

-- ===== 041_course_video_scripts =====
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

-- ===== 042_course_plan_settings =====
-- Per-user study-plan settings for the /course page.
--
-- Replaces the localStorage-only draft so a learner's plan follows them across
-- devices (web + mobile). Two jsonb blobs rather than columns, because both
-- shapes are owned by the client planner and will change as it evolves:
--   settings  -> PlanSettings   (src/lib/course-plan/planner.ts)
--   overrides -> PlanOverrides  (drag-and-drop edits, keyed by ISO date)

create table if not exists public.course_plan_settings (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  overrides  jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.course_plan_settings is
  'Study-plan settings + drag-and-drop overrides for the /course planner. One row per user.';

alter table public.course_plan_settings enable row level security;

-- A signed-in user reads and writes only their own row.
drop policy if exists "Users read own course plan" on public.course_plan_settings;
create policy "Users read own course plan"
  on public.course_plan_settings for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own course plan" on public.course_plan_settings;
create policy "Users upsert own course plan"
  on public.course_plan_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own course plan" on public.course_plan_settings;
create policy "Users update own course plan"
  on public.course_plan_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ===== 043_course_chapter_study_block =====
-- Tag each course chapter with the DET integrated subscore it teaches, so the
-- /course study blocks stop being inferred from the chapter title.
--
-- Title matching (src/lib/course-plan/categories.ts) classifies all 15 current
-- chapters correctly, but it breaks the moment a chapter is renamed and gives
-- the admin no way to override. This column makes the mapping data.
--
-- `retired` marks chapters teaching question types Duolingo removed on
-- 1 July 2025 (Read Aloud, Listen Then Speak) — kept visible with a warning
-- rather than deleted, so the admin can decide when to remove them.

alter table public.course_chapters
  add column if not exists study_block text;

alter table public.course_chapters
  drop constraint if exists course_chapters_study_block_check;

alter table public.course_chapters
  add constraint course_chapters_study_block_check
  check (
    study_block is null
    or study_block in ('production','conversation','comprehension','literacy','general','retired')
  );

comment on column public.course_chapters.study_block is
  'DET integrated subscore this chapter teaches. Null falls back to title matching in categories.ts.';

-- Seed the current 15 chapters. Idempotent: only fills rows still null, so a
-- later admin override is never clobbered by re-running this file.
update public.course_chapters set study_block = 'general'       where study_block is null and title ilike 'ภาพรวมข้อสอบ%';
update public.course_chapters set study_block = 'production'    where study_block is null and title ilike 'Writing about a photo%';
update public.course_chapters set study_block = 'production'    where study_block is null and title ilike 'Speak about a photo%';
update public.course_chapters set study_block = 'production'    where study_block is null and title ilike 'Speaking (1-3 minutes)%';
update public.course_chapters set study_block = 'conversation'  where study_block is null and title ilike 'Interactive Speaking%';
update public.course_chapters set study_block = 'literacy'      where study_block is null and title ilike 'C-Test%';
update public.course_chapters set study_block = 'production'    where study_block is null and title ilike 'Write 50 words%';
update public.course_chapters set study_block = 'production'    where study_block is null and title ilike '%follow-up response%';
update public.course_chapters set study_block = 'literacy'      where study_block is null and title ilike 'Select%Real%English Word%';
update public.course_chapters set study_block = 'comprehension' where study_block is null and title ilike 'Listen and Type%';
update public.course_chapters set study_block = 'retired'       where study_block is null and title ilike 'Read Aloud%';
update public.course_chapters set study_block = 'comprehension' where study_block is null and title ilike 'READING COMPREHENSION%';
update public.course_chapters set study_block = 'conversation'  where study_block is null and title ilike 'Interactive Conversation%';
update public.course_chapters set study_block = 'general'       where study_block is null and title ilike 'Guide%';
update public.course_chapters set study_block = 'literacy'      where study_block is null and title ilike 'Bonus Lesson for Vocabulary%';

-- ===== 044_course_lesson_task_level =====
-- Tag each course lesson with the DET task it teaches and its difficulty rung,
-- so the planner can walk a student up ง่าย → กลาง → ยาก per skill instead of
-- pouring the whole course into the calendar in chapter order.
--
-- With these two fields the 11 task types × 3 levels = 33 cells become data,
-- and every student's path is generated from their own score vector.

alter table public.course_lessons
  add column if not exists task_type text;

alter table public.course_lessons
  add column if not exists level text;

alter table public.course_lessons
  drop constraint if exists course_lessons_level_check;

alter table public.course_lessons
  add constraint course_lessons_level_check
  check (level is null or level in ('easy', 'medium', 'hard'));

comment on column public.course_lessons.task_type is
  'DET task this lesson teaches (dictation, write_about_photo, …). Null = inferred from the chapter.';
comment on column public.course_lessons.level is
  'Difficulty rung: easy | medium | hard. Null = inferred from the title, defaulting to medium.';

create index if not exists course_lessons_task_level_idx
  on public.course_lessons (task_type, level);

-- ---------------------------------------------------------------------------
-- Seed task_type from the parent chapter. Idempotent: only fills nulls.
-- ---------------------------------------------------------------------------
update public.course_lessons l set task_type = t.task
from (
  select c.id as chapter_id,
    case
      when c.title ilike 'Interactive Speaking%'      then 'interactive_speaking'
      when c.title ilike 'Interactive Conversation%'  then 'interactive_conversation_mcq'
      when c.title ilike 'Writing about a photo%'     then 'write_about_photo'
      when c.title ilike 'Speak about a photo%'       then 'speak_about_photo'
      when c.title ilike 'Speaking (1-3 minutes)%'    then 'read_then_speak'
      when c.title ilike 'Write 50 words%'            then 'read_and_write'
      when c.title ilike '%follow-up response%'       then 'read_and_write'
      when c.title ilike 'C-Test%'                    then 'fill_in_blanks'
      when c.title ilike 'Select%Real%English Word%'  then 'real_english_word'
      when c.title ilike 'Listen and Type%'           then 'dictation'
      when c.title ilike 'READING COMPREHENSION%'     then 'reading_comprehension'
      when c.title ilike 'Bonus Lesson for Vocabulary%' then 'vocabulary_reading'
      else null
    end as task
  from public.course_chapters c
) t
where l.chapter_id = t.chapter_id
  and l.task_type is null
  and t.task is not null;

-- ---------------------------------------------------------------------------
-- Seed level from the lesson title. Explicit level words win; foundation
-- wording means easy; anything naming C1/125+/130+/B2-C1 means hard; the rest
-- default to medium, which is where most technique lessons actually sit.
-- ---------------------------------------------------------------------------
update public.course_lessons set level = 'easy'
where level is null and (
     title ilike '%ระดับง่าย%'
  or title ilike '%เริ่มต้น%'
  or title ilike '%พื้นฐาน%'
);

update public.course_lessons set level = 'hard'
where level is null and (
     title ilike '%130+%'
  or title ilike '%125+%'
  or title ilike '%C1%'
  or title ilike '%B2-C1%'
  or title ilike '%ยาก%'
);

update public.course_lessons set level = 'medium'
where level is null;

-- ===== 046_speech_recordings =====
-- Shadow-log the raw audio behind every speech transcription, so real
-- Thai-learner recordings exist to grade/calibrate a future acoustic
-- pronunciation scorer against. Purely additive: no existing table/route
-- behavior changes, this only records what already happens.
create table if not exists public.speech_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null, -- e.g. 'speech-transcribe', 'study-plan-transcribe'
  audio_path text not null, -- path within the Bunny Storage zone
  mime_type text not null,
  transcript text,
  reviewed boolean not null default false, -- set true once a human (พี่ดอย) has scored it
  human_score jsonb, -- per-word/phone human grading, once reviewed
  created_at timestamptz not null default now()
);

create index if not exists speech_recordings_user_id_idx on public.speech_recordings(user_id);
create index if not exists speech_recordings_created_at_idx on public.speech_recordings(created_at);
create index if not exists speech_recordings_reviewed_idx on public.speech_recordings(reviewed) where not reviewed;

alter table public.speech_recordings enable row level security;

-- Only the server (service role, via API routes) writes/reads this table.
-- No end-user policy: learners should never see or query this table directly,
-- and admins review it through an admin-only route using the service role.

-- ===== 047_course_skill_placement =====
-- One-time per-skill placement result, seeding rungs.ts's rung ladder with each
-- of the 12 DET task types' starting level. Mirrors photo_speak_progress
-- (035_photo_speak_content.sql) for RLS/column shape.

create table if not exists public.course_skill_placement (
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_type text not null check (task_type in (
    'write_about_photo', 'speak_about_photo', 'read_and_write', 'read_then_speak',
    'dictation', 'real_english_word', 'interactive_speaking',
    'interactive_conversation_mcq', 'dialogue_summary', 'fill_in_blanks',
    'reading_comprehension', 'vocabulary_reading'
  )),
  current_level text not null default 'easy' check (current_level in ('easy', 'medium', 'hard')),
  -- Reserved for a future promotion-streak tracker (rungs.ts PROMOTE_STREAK).
  -- Placement itself always writes 0 here.
  consecutive_pass_count integer not null default 0,
  last_score160 numeric,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_type)
);

create index if not exists idx_course_skill_placement_user
  on public.course_skill_placement (user_id);

alter table public.course_skill_placement enable row level security;

drop policy if exists "Users manage own skill placement" on public.course_skill_placement;
create policy "Users manage own skill placement"
  on public.course_skill_placement for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins read skill placement" on public.course_skill_placement;
create policy "Admins read skill placement"
  on public.course_skill_placement for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

commit;
