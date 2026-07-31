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
