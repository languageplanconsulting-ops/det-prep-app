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
