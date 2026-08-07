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
