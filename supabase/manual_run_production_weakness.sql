-- Deploy this in the Supabase SQL editor to switch on persistent grammar
-- weaknesses (migration 050). Until it is run, nothing breaks: the recorder
-- swallows the missing-table error, so grading and reports work exactly as
-- before and the pre-exam warning simply never appears.
--
-- Additive and safe to re-run.

begin;

-- Persistent grammar weaknesses across ALL production exercises.
--
-- A learner who drops articles in read-and-speak on Monday almost always drops
-- them in read-and-write on Friday. Until now every report was graded in
-- isolation and thrown away, so nobody — not the learner, not the grader —
-- could see the pattern. This table is the memory: one row per (user, topic),
-- counted once per attempt, so the next production exercise can warn them
-- BEFORE they start instead of scoring them again for the same mistake.
--
-- Same shape as speaking_partner_weakness_history (031), which does this for
-- My Speaking Partner. This one spans read-and-write, write-about-photo,
-- read-and-speak, speak-about-photo and interactive speaking.
create table if not exists public.production_weakness_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Stable key so near-duplicate wordings ("Articles" / "article use") collapse.
  topic_key text not null,
  topic_en text not null default '',
  topic_th text not null default '',
  -- 'all'     = shows before any production exercise (articles, tense, agreement)
  -- 'writing' = punctuation / capitalization / spelling: meaningless when speaking,
  --             so it must never appear before a speaking exercise.
  scope text not null default 'all' check (scope in ('all', 'writing')),
  -- Counted once per attempt: repeating one mistake five times in a single essay
  -- is still one occurrence, so one bad day can't dominate the ranking.
  occurrence_count integer not null default 1,
  -- Consecutive later attempts (in scope) where this topic did NOT come back.
  -- Once it passes the limit the topic stops being shown — we must not nag a
  -- learner about something they already fixed.
  clean_streak integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_surface text,
  last_attempt_id text,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_key)
);

-- The pre-exam read: this user's worst topics first.
create index if not exists production_weakness_history_user_idx
  on public.production_weakness_history (user_id, occurrence_count desc);

alter table public.production_weakness_history enable row level security;

drop policy if exists "Users read own production weakness history" on public.production_weakness_history;
create policy "Users read own production weakness history"
on public.production_weakness_history
for select
using (auth.uid() = user_id);

-- Folds one graded attempt into the history in a SINGLE round trip.
--
-- Done in SQL rather than a read-modify-write loop in TypeScript for two
-- reasons: it runs inside the learner's grading request, so ~17 sequential
-- queries would be felt as a slower report; and two attempts finishing at the
-- same moment would both read the same count and both write count+1, silently
-- losing an occurrence. `on conflict do update` makes the increment atomic.
--
-- p_scope_filter: 'all' limits the decay pass to cross-skill topics (a spoken
-- attempt proves nothing about the learner's punctuation), NULL means no limit.
create or replace function public.record_production_weakness(
  p_user_id uuid,
  p_topics jsonb,
  p_scope_filter text,
  p_surface text,
  p_attempt_id text,
  p_clean_streak_limit integer
) returns void
language plpgsql
as $$
declare
  v_keys text[];
begin
  -- Idempotency. Interactive speaking has no grading_jobs row to gate on, so a
  -- client retry of the same attempt would otherwise count the same mistake
  -- twice — enough on its own to trip the "seen in 2 attempts" threshold and
  -- warn a learner about a one-off.
  if exists (
    select 1 from public.production_weakness_history
     where user_id = p_user_id and last_attempt_id = p_attempt_id
  ) then
    return;
  end if;

  select coalesce(array_agg(t->>'topicKey'), '{}'::text[])
    into v_keys
    from jsonb_array_elements(coalesce(p_topics, '[]'::jsonb)) as t;

  insert into public.production_weakness_history (
    user_id, topic_key, topic_en, topic_th, scope,
    occurrence_count, clean_streak, last_surface, last_attempt_id
  )
  select
    p_user_id, t->>'topicKey', t->>'topicEn', t->>'topicTh', t->>'scope',
    1, 0, p_surface, p_attempt_id
  from jsonb_array_elements(coalesce(p_topics, '[]'::jsonb)) as t
  on conflict (user_id, topic_key) do update set
    occurrence_count = public.production_weakness_history.occurrence_count + 1,
    -- The habit is back, so any progress toward being dropped is void.
    clean_streak = 0,
    topic_en = excluded.topic_en,
    topic_th = excluded.topic_th,
    scope = excluded.scope,
    last_seen_at = now(),
    last_surface = excluded.last_surface,
    last_attempt_id = excluded.last_attempt_id,
    updated_at = now();

  -- Everything this attempt COULD have caught but didn't moves one step closer
  -- to being forgotten.
  update public.production_weakness_history
     set clean_streak = clean_streak + 1,
         updated_at = now()
   where user_id = p_user_id
     and clean_streak < p_clean_streak_limit
     and not (topic_key = any (v_keys))
     and (p_scope_filter is null or scope = p_scope_filter);
end;
$$;

commit;
